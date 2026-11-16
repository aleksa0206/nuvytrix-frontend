import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Observable } from 'rxjs';
import { toApiError, type FieldIssue } from '../../core/api/api-error';
import type { DnsHost } from '../../core/models/router.model';
import { RouterService } from '../../core/services/router.service';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { EmptyState, LoadError, Loading } from '../../shared/ui/feedback';

/** Static DNS entries the router answers itself, read live, with confirmed changes. */
@Component({
  selector: 'app-router-dns-hosts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, EmptyState, LoadError, Loading],
  templateUrl: './router-dns-hosts.html',
  styleUrl: './router-firewall.scss',
})
export class RouterDnsHosts {
  private readonly api = inject(RouterService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly dns = this.api.dnsHostsResource();
  protected readonly clients = this.api.clientsResource(() => true);
  protected readonly editing = signal<DnsHost | 'new' | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly fieldErrors = signal<FieldIssue[]>([]);
  protected readonly actionError = signal<string | null>(null);

  protected readonly writable = computed(
    () => this.dns.hasValue() && this.dns.value().writesEnabled,
  );
  protected readonly devices = computed(() =>
    this.clients.hasValue() ? this.clients.value().clients.filter((c) => c.ipAddress) : [],
  );

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    ip: ['', Validators.required],
  });

  protected fieldError(path: string): string | null {
    return this.fieldErrors().find((issue) => issue.path === path)?.message ?? null;
  }

  protected deviceName(ip: string): string | null {
    const d = this.devices().find((c) => c.ipAddress === ip);
    return d ? (d.customName ?? d.hostName) : null;
  }

  protected startCreate() {
    this.form.reset();
    this.reset();
    this.editing.set('new');
  }

  protected startEdit(host: DnsHost) {
    this.form.reset({ name: host.name, ip: host.ip });
    this.reset();
    this.editing.set(host);
  }

  protected save() {
    const editing = this.editing();
    if (!editing || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const input = { name: v.name.trim(), ip: v.ip.trim() };
    const request =
      editing === 'new' ? this.api.addDnsHost(input) : this.api.updateDnsHost(editing.index, input);
    this.saving.set(true);
    this.reset();
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

  protected async remove(host: DnsHost) {
    const ok = await this.confirm.ask({
      title: `Delete the DNS entry ${host.name}?`,
      message: 'Devices that ask the router for this name no longer get this address.',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    this.run(this.api.deleteDnsHost(host.index));
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
    this.dns.reload();
  }

  private reset() {
    this.formError.set(null);
    this.fieldErrors.set([]);
    this.actionError.set(null);
  }
}
