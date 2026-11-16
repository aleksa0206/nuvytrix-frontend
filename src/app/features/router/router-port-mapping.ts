import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Observable } from 'rxjs';
import { toApiError, type FieldIssue } from '../../core/api/api-error';
import type { PortMappingInput, PortMappingRule } from '../../core/models/router.model';
import { RouterService } from '../../core/services/router.service';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { EmptyState, LoadError, Loading } from '../../shared/ui/feedback';
import { StateBadge } from '../../shared/ui/state-badge';

const PROTOCOLS = ['TCP', 'UDP', 'TCP/UDP'] as const;
const PORT = [Validators.required, Validators.min(1), Validators.max(65535)];

/** IPv4 port forwarding on the router, read live, with confirmed changes. */
@Component({
  selector: 'app-router-port-mapping',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, StateBadge, EmptyState, LoadError, Loading],
  templateUrl: './router-port-mapping.html',
  styleUrl: './router-firewall.scss',
})
export class RouterPortMapping {
  private readonly api = inject(RouterService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly state = this.api.portMappingResource();
  protected readonly clients = this.api.clientsResource(() => true);
  protected readonly protocols = PROTOCOLS;

  protected readonly editing = signal<PortMappingRule | 'new' | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly fieldErrors = signal<FieldIssue[]>([]);
  protected readonly actionError = signal<string | null>(null);

  protected readonly writable = computed(
    () =>
      this.state.hasValue() && this.state.value().writesEnabled && !!this.state.value().internetWan,
  );

  protected readonly activeCount = computed(() =>
    this.state.hasValue() ? this.state.value().mappings.filter((m) => m.enabled).length : 0,
  );

  protected readonly devices = computed(() =>
    this.clients.hasValue()
      ? this.clients
          .value()
          .clients.filter((c) => c.ipAddress)
          .sort((a, b) =>
            (a.customName ?? a.hostName ?? a.macAddress).localeCompare(
              b.customName ?? b.hostName ?? b.macAddress,
            ),
          )
      : [],
  );

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(31)]],
    enabled: [true],
    protocol: this.fb.control<(typeof PROTOCOLS)[number]>('TCP'),
    internalHost: ['', Validators.required],
    externalPortStart: this.fb.control<number | null>(null, PORT),
    externalPortEnd: this.fb.control<number | null>(null, [
      Validators.min(1),
      Validators.max(65535),
    ]),
    internalPort: this.fb.control<number | null>(null, PORT),
    remoteHostStart: [''],
    remoteHostEnd: [''],
  });

  protected deviceName(ip: string): string | null {
    const device = this.devices().find((d) => d.ipAddress === ip);
    return device ? (device.customName ?? device.hostName) : null;
  }

  protected fieldError(path: string): string | null {
    return this.fieldErrors().find((issue) => issue.path === path)?.message ?? null;
  }

  protected startCreate() {
    this.form.reset();
    this.resetErrors();
    this.editing.set('new');
  }

  protected startEdit(mapping: PortMappingRule) {
    const range = mapping.ranges[0]!;
    const [start, end] = range.externalPort.split(':').map(Number);
    this.form.reset({
      name: mapping.name,
      enabled: mapping.enabled,
      protocol: (PROTOCOLS as readonly string[]).includes(range.protocol)
        ? (range.protocol as (typeof PROTOCOLS)[number])
        : 'TCP',
      internalHost: mapping.internalHost,
      externalPortStart: start ?? null,
      externalPortEnd: end ?? start ?? null,
      internalPort: Number(range.internalPort.split(':')[0]) || null,
      remoteHostStart: mapping.remoteHostStart,
      remoteHostEnd: mapping.remoteHostEnd,
    });
    this.resetErrors();
    this.editing.set(mapping);
  }

  /** Same port inside as outside, the usual case, until the user changes it. */
  protected externalStartChanged() {
    const { externalPortStart, internalPort } = this.form.controls;
    if (internalPort.pristine) internalPort.setValue(externalPortStart.value);
  }

  protected async save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const input: PortMappingInput = {
      name: v.name.trim(),
      enabled: v.enabled,
      protocol: v.protocol,
      internalHost: v.internalHost.trim(),
      internalPort: v.internalPort!,
      externalPortStart: v.externalPortStart!,
      externalPortEnd: v.externalPortEnd ?? v.externalPortStart!,
      remoteHostStart: v.remoteHostStart.trim(),
      remoteHostEnd: v.remoteHostEnd.trim(),
    };
    const editing = this.editing();
    const ports =
      input.externalPortEnd === input.externalPortStart
        ? `${input.externalPortStart}`
        : `${input.externalPortStart}–${input.externalPortEnd}`;
    const target = this.deviceName(input.internalHost) ?? input.internalHost;
    const ok = await this.confirm.ask({
      title: editing === 'new' ? 'Open this port on the router?' : 'Change this port forward?',
      message: input.enabled
        ? `Connections from ${input.remoteHostStart || 'anywhere on the internet'} to ${input.protocol} port ${ports} ` +
          `reach ${target}:${input.internalPort}. Only forward ports to services that are kept up to date.`
        : 'The port forward is saved but stays off until you turn it on.',
      confirmLabel: editing === 'new' ? 'Save port forward' : 'Save changes',
      danger: input.enabled,
    });
    if (!ok) return;
    const request =
      editing === 'new' || editing === null
        ? this.api.addPortMapping(input)
        : this.api.updatePortMapping(index(editing), input);
    this.saving.set(true);
    this.resetErrors();
    request.subscribe({
      next: () => {
        this.editing.set(null);
        this.done();
      },
      error: (err: unknown) => {
        const error = toApiError(err);
        this.formError.set(error.message);
        this.fieldErrors.set(error.details);
        this.done();
      },
    });
  }

  protected async remove(mapping: PortMappingRule) {
    const ok = await this.confirm.ask({
      title: `Delete the port forward “${mapping.name || mapping.domain}”?`,
      message:
        'The ports close as soon as the router saves it. The mapping stays in the audit log.',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    this.runAction(this.api.deletePortMapping(index(mapping)));
  }

  protected async toggle(mapping: PortMappingRule) {
    const range = mapping.ranges[0]!;
    const [start, end] = range.externalPort.split(':').map(Number) as [number, number?];
    const ok = await this.confirm.ask({
      title: mapping.enabled ? `Turn off “${mapping.name}”?` : `Turn on “${mapping.name}”?`,
      message: mapping.enabled
        ? 'The ports close; the settings are kept.'
        : `${range.protocol} port ${range.externalPort.replace(':', '–')} opens towards ${mapping.internalHost}.`,
      confirmLabel: mapping.enabled ? 'Turn off' : 'Turn on',
      danger: !mapping.enabled,
    });
    if (!ok) return;
    this.runAction(
      this.api.updatePortMapping(index(mapping), {
        name: mapping.name,
        enabled: !mapping.enabled,
        protocol: range.protocol as PortMappingInput['protocol'],
        internalHost: mapping.internalHost,
        internalPort: Number(range.internalPort.split(':')[0]),
        externalPortStart: start,
        externalPortEnd: end ?? start,
        remoteHostStart: mapping.remoteHostStart,
        remoteHostEnd: mapping.remoteHostEnd,
      }),
    );
  }

  private runAction(request: Observable<unknown>) {
    this.resetErrors();
    this.saving.set(true);
    request.subscribe({
      next: () => this.done(),
      error: (err: unknown) => {
        this.actionError.set(toApiError(err).message);
        this.done();
      },
    });
  }

  private done() {
    this.saving.set(false);
    this.state.reload();
  }

  private resetErrors() {
    this.formError.set(null);
    this.fieldErrors.set([]);
    this.actionError.set(null);
  }
}

function index(mapping: PortMappingRule): number {
  return Number(mapping.domain.split('.').pop());
}
