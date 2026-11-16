import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Observable } from 'rxjs';
import { toApiError, type FieldIssue } from '../../core/api/api-error';
import type { PortTriggerInput, PortTriggerRule } from '../../core/models/router.model';
import { RouterService } from '../../core/services/router.service';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { EmptyState, LoadError, Loading } from '../../shared/ui/feedback';
import { StateBadge } from '../../shared/ui/state-badge';

const PROTOCOLS = ['TCP', 'UDP', 'TCP/UDP'] as const;
type Protocol = (typeof PROTOCOLS)[number];
const PORT = [Validators.required, Validators.min(1), Validators.max(65535)];

/** DMZ host and port triggers on the router, read live, with confirmed changes. */
@Component({
  selector: 'app-router-forwarding',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, StateBadge, EmptyState, LoadError, Loading],
  templateUrl: './router-forwarding.html',
  styleUrl: './router-firewall.scss',
  host: { class: 'stack' },
})
export class RouterForwarding {
  private readonly api = inject(RouterService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly dmz = this.api.dmzResource();
  protected readonly triggers = this.api.portTriggerResource();
  protected readonly clients = this.api.clientsResource(() => true);
  protected readonly protocols = PROTOCOLS;

  protected readonly editingDmz = signal(false);
  protected readonly editing = signal<PortTriggerRule | 'new' | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly fieldErrors = signal<FieldIssue[]>([]);
  protected readonly actionError = signal<string | null>(null);

  protected readonly dmzWritable = computed(
    () => this.dmz.hasValue() && this.dmz.value().writesEnabled && !!this.dmz.value().internetWan,
  );
  protected readonly triggersWritable = computed(
    () =>
      this.triggers.hasValue() &&
      this.triggers.value().writesEnabled &&
      !!this.triggers.value().internetWan,
  );

  protected readonly devices = computed(() =>
    this.clients.hasValue() ? this.clients.value().clients.filter((c) => c.ipAddress) : [],
  );

  protected readonly dmzForm = this.fb.group({
    host: ['', Validators.required],
    enabled: [false],
  });

  protected readonly triggerForm = this.fb.group({
    enabled: [true],
    triggerProtocol: this.fb.control<Protocol>('TCP'),
    triggerPortStart: this.fb.control<number | null>(null, PORT),
    triggerPortEnd: this.fb.control<number | null>(null, [
      Validators.min(1),
      Validators.max(65535),
    ]),
    openProtocol: this.fb.control<Protocol>('TCP'),
    openPortStart: this.fb.control<number | null>(null, PORT),
    openPortEnd: this.fb.control<number | null>(null, [Validators.min(1), Validators.max(65535)]),
  });

  protected deviceName(ip: string): string | null {
    const device = this.devices().find((d) => d.ipAddress === ip);
    return device ? (device.customName ?? device.hostName) : null;
  }

  protected range(start: number, end: number): string {
    return start === end ? `${start}` : `${start}–${end}`;
  }

  protected fieldError(path: string): string | null {
    return this.fieldErrors().find((issue) => issue.path === path)?.message ?? null;
  }

  protected startDmzEdit() {
    const current = this.dmz.value()?.dmz;
    this.dmzForm.reset({ host: current?.host ?? '', enabled: current?.enabled ?? false });
    this.resetErrors();
    this.editingDmz.set(true);
  }

  protected async saveDmz() {
    if (this.dmzForm.invalid) {
      this.dmzForm.markAllAsTouched();
      return;
    }
    const input = {
      host: this.dmzForm.controls.host.value.trim(),
      enabled: this.dmzForm.controls.enabled.value,
    };
    const ok = await this.askDmz(input.host, input.enabled);
    if (!ok) return;
    this.submit(this.api.setDmz(input), () => this.editingDmz.set(false));
  }

  protected async toggleDmz() {
    const current = this.dmz.value()!.dmz!;
    const ok = await this.askDmz(current.host, !current.enabled);
    if (!ok) return;
    this.runAction(this.api.setDmz({ host: current.host, enabled: !current.enabled }));
  }

  protected async removeDmz() {
    const ok = await this.confirm.ask({
      title: 'Remove the DMZ host?',
      message:
        'The router stops sending unsolicited internet traffic to it. The setting stays in the audit log.',
      confirmLabel: 'Remove DMZ',
    });
    if (!ok) return;
    this.runAction(this.api.deleteDmz());
  }

  private askDmz(host: string, enabled: boolean) {
    const name = this.deviceName(host) ?? host;
    return this.confirm.ask({
      title: enabled ? `Make ${name} the DMZ host?` : `Save ${name} as DMZ host, turned off?`,
      message: enabled
        ? `Every connection from the internet that no port forward handles goes to ${name}, on every port. ` +
          'Use this only for a device that is meant to face the internet.'
        : 'The DMZ host is saved but receives nothing until the DMZ is turned on.',
      confirmLabel: enabled ? 'Turn on DMZ' : 'Save',
      danger: enabled,
    });
  }

  protected startCreate() {
    this.triggerForm.reset();
    this.resetErrors();
    this.editing.set('new');
  }

  protected startEdit(trigger: PortTriggerRule) {
    this.triggerForm.reset({
      enabled: trigger.enabled,
      triggerProtocol: protocolOf(trigger.triggerProtocol),
      triggerPortStart: trigger.triggerPortStart,
      triggerPortEnd: trigger.triggerPortEnd,
      openProtocol: protocolOf(trigger.openProtocol),
      openPortStart: trigger.openPortStart,
      openPortEnd: trigger.openPortEnd,
    });
    this.resetErrors();
    this.editing.set(trigger);
  }

  protected async saveTrigger() {
    if (this.triggerForm.invalid) {
      this.triggerForm.markAllAsTouched();
      return;
    }
    const v = this.triggerForm.getRawValue();
    const input: PortTriggerInput = {
      enabled: v.enabled,
      triggerProtocol: v.triggerProtocol,
      triggerPortStart: v.triggerPortStart!,
      triggerPortEnd: v.triggerPortEnd ?? v.triggerPortStart!,
      openProtocol: v.openProtocol,
      openPortStart: v.openPortStart!,
      openPortEnd: v.openPortEnd ?? v.openPortStart!,
    };
    const editing = this.editing();
    const ok = await this.confirm.ask({
      title: editing === 'new' ? 'Add this port trigger?' : 'Change this port trigger?',
      message:
        `When a device sends ${input.triggerProtocol} to port ${this.range(input.triggerPortStart, input.triggerPortEnd)}, ` +
        `the router opens ${input.openProtocol} ${this.range(input.openPortStart, input.openPortEnd)} from the internet to that device for a while.`,
      confirmLabel: editing === 'new' ? 'Add trigger' : 'Save trigger',
    });
    if (!ok) return;
    const request =
      editing === 'new' || editing === null
        ? this.api.addPortTrigger(input)
        : this.api.updatePortTrigger(index(editing), input);
    this.submit(request, () => this.editing.set(null));
  }

  protected async removeTrigger(trigger: PortTriggerRule) {
    const ok = await this.confirm.ask({
      title: 'Delete this port trigger?',
      message: 'It stops opening ports. The trigger stays in the audit log.',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    this.runAction(this.api.deletePortTrigger(index(trigger)));
  }

  private submit(request: Observable<unknown>, onSuccess: () => void) {
    this.saving.set(true);
    this.resetErrors();
    request.subscribe({
      next: () => {
        onSuccess();
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
    this.dmz.reload();
    this.triggers.reload();
  }

  private resetErrors() {
    this.formError.set(null);
    this.fieldErrors.set([]);
    this.actionError.set(null);
  }
}

function protocolOf(value: string): Protocol {
  return (PROTOCOLS as readonly string[]).includes(value) ? (value as Protocol) : 'TCP';
}

function index(trigger: PortTriggerRule): number {
  return Number(trigger.domain.split('.').pop());
}
