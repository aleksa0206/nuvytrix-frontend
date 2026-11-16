import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Observable } from 'rxjs';
import { toApiError, type FieldIssue } from '../../core/api/api-error';
import type { DdnsEntry, DdnsInput } from '../../core/models/router.model';
import { RouterService } from '../../core/services/router.service';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { EmptyState, LoadError, Loading } from '../../shared/ui/feedback';
import { StateBadge } from '../../shared/ui/state-badge';

/** Providers the router offers, with their update server where the router page fills one in. */
const PROVIDERS = [
  { value: 'dyndns', label: 'DynDNS', server: 'members.dyndns.org' },
  { value: 'dyndns-static', label: 'DynDNS (static)', server: 'members.dyndns.org' },
  { value: 'dyndns-custom', label: 'DynDNS (custom)', server: 'members.dyndns.org' },
  { value: 'no-ip', label: 'No-IP', server: '' },
  { value: 'easydns', label: 'easyDNS', server: 'members.easydns.com' },
  { value: 'dtdns', label: 'DtDNS', server: '' },
  { value: 'qdns', label: '3322 (qdns)', server: 'members.3322.org' },
  { value: 'qdns-static', label: '3322 (qdns static)', server: 'members.3322.org' },
  { value: 'ORAY', label: 'Oray', server: '' },
] as const;

/** Dynamic DNS entries on the router. Passwords are write-only and never shown. */
@Component({
  selector: 'app-router-ddns',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, StateBadge, EmptyState, LoadError, Loading],
  templateUrl: './router-ddns.html',
  styleUrl: './router-firewall.scss',
})
export class RouterDdns {
  private readonly api = inject(RouterService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly ddns = this.api.ddnsResource();
  protected readonly providers = PROVIDERS;
  protected readonly editing = signal<DdnsEntry | 'new' | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly fieldErrors = signal<FieldIssue[]>([]);
  protected readonly actionError = signal<string | null>(null);

  protected readonly writable = computed(
    () =>
      this.ddns.hasValue() && this.ddns.value().writesEnabled && !!this.ddns.value().internetWan,
  );

  protected readonly form = this.fb.group({
    enabled: [false],
    provider: ['dyndns', Validators.required],
    username: ['', Validators.required],
    password: [''],
    domainName: ['', Validators.required],
    serverHost: ['members.dyndns.org', Validators.required],
    port: this.fb.control<number>(80, [
      Validators.required,
      Validators.min(1),
      Validators.max(65535),
    ]),
  });

  protected providerLabel(value: string): string {
    return PROVIDERS.find((p) => p.value === value)?.label ?? value;
  }

  protected fieldError(path: string): string | null {
    return this.fieldErrors().find((issue) => issue.path === path)?.message ?? null;
  }

  /** Fills the provider's update server when the router page knows it. */
  protected providerChanged() {
    const server = PROVIDERS.find((p) => p.value === this.form.controls.provider.value)?.server;
    if (server) this.form.controls.serverHost.setValue(server);
  }

  protected startCreate() {
    this.form.reset();
    this.reset();
    this.editing.set('new');
  }

  protected startEdit(entry: DdnsEntry) {
    this.form.reset({
      enabled: entry.enabled,
      provider: entry.provider,
      username: entry.username,
      password: '',
      domainName: entry.domainName,
      serverHost: entry.serverHost,
      port: entry.port ?? 80,
    });
    this.reset();
    this.editing.set(entry);
  }

  protected async save() {
    const editing = this.editing();
    const v = this.form.getRawValue();
    if (!editing || this.form.invalid || (editing === 'new' && !v.password)) {
      this.form.markAllAsTouched();
      if (editing === 'new' && !v.password) {
        this.fieldErrors.set([{ path: 'password', message: 'The provider password is required' }]);
      }
      return;
    }
    const input: DdnsInput = {
      enabled: v.enabled,
      provider: v.provider,
      username: v.username.trim(),
      domainName: v.domainName.trim(),
      serverHost: v.serverHost.trim(),
      port: v.port,
      ...(v.password ? { password: v.password } : {}),
    };
    if (input.enabled) {
      const ok = await this.confirm.ask({
        title: `Turn on DDNS for ${input.domainName}?`,
        message:
          'The router sends its internet address to the provider, which points this name at it. ' +
          'Behind a shared (CGNAT) address that address does not reach your home.',
        confirmLabel: 'Save and turn on',
      });
      if (!ok) return;
    }
    const request =
      editing === 'new' ? this.api.addDdns(input) : this.api.updateDdns(editing.index, input);
    this.saving.set(true);
    this.reset();
    request.subscribe({
      next: () => {
        this.editing.set(null);
        this.form.controls.password.reset('');
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

  protected async remove(entry: DdnsEntry) {
    const ok = await this.confirm.ask({
      title: `Delete DDNS for ${entry.domainName}?`,
      message:
        'The router stops updating this name. The entry (without its password) stays in the audit log.',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    this.run(this.api.deleteDdns(entry.index));
  }

  private run(request: Observable<unknown>) {
    this.reset();
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
    this.ddns.reload();
  }

  private reset() {
    this.formError.set(null);
    this.fieldErrors.set([]);
    this.actionError.set(null);
  }
}
