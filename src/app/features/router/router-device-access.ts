import { HttpClient, httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { apiUrl } from '../../core/api/http';
import { toApiError } from '../../core/api/api-error';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { LoadError, Loading } from '../../shared/ui/feedback';
import { StateBadge } from '../../shared/ui/state-badge';

interface DeviceAccess {
  writesEnabled: boolean;
  httpFromWifi: boolean;
}

/** Device access control: whether devices on Wi-Fi may open the router's web interface. */
@Component({
  selector: 'app-router-device-access',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StateBadge, LoadError, Loading],
  styleUrl: './router-firewall.scss',
  template: `
    <section class="panel">
      <header class="panel__header">
        <h2>Router admin from Wi-Fi</h2>
        <span class="panel__meta"
          >whether devices on Wi-Fi may open the router's web interface</span
        >
      </header>
      @if (access.isLoading() && !access.hasValue()) {
        <app-loading />
      }
      @if (access.error(); as e) {
        <app-load-error [error]="e" (retry)="access.reload()" />
      }
      @if (access.hasValue()) {
        @let a = access.value();
        <div class="panel__body filter-state">
          <app-state-badge
            [state]="a.httpFromWifi ? 'operational' : 'disabled'"
            [label]="a.httpFromWifi ? 'Allowed from Wi-Fi' : 'Blocked from Wi-Fi'"
          />
          @if (writable()) {
            <span class="spacer"></span>
            <button
              type="button"
              class="btn"
              [disabled]="saving()"
              (click)="toggle(!a.httpFromWifi)"
            >
              {{ saving() ? 'Saving on the router…' : a.httpFromWifi ? 'Block' : 'Allow' }}
            </button>
          }
        </div>
        <p class="panel__body field__hint">
          Wired devices always keep access. Telnet and other services are managed by the provider
          and cannot be changed with this account.
        </p>
        @if (error()) {
          <p class="panel__body notice notice--error" role="alert">{{ error() }}</p>
        }
      }
    </section>
  `,
})
export class RouterDeviceAccess {
  private readonly http = inject(HttpClient);
  private readonly confirm = inject(ConfirmService);

  protected readonly access = httpResource<DeviceAccess>(() => apiUrl('/router/device-access'));
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly writable = computed(
    () => this.access.hasValue() && this.access.value().writesEnabled,
  );

  protected async toggle(httpFromWifi: boolean) {
    const ok = await this.confirm.ask({
      title: httpFromWifi ? 'Allow router admin from Wi-Fi?' : 'Block router admin from Wi-Fi?',
      message: httpFromWifi
        ? 'Devices on Wi-Fi can open the router login page again.'
        : 'Phones and laptops on Wi-Fi can no longer open the router login page. Internet on Wi-Fi ' +
          'keeps working, and wired devices (server, PC) keep access.',
      confirmLabel: httpFromWifi ? 'Allow' : 'Block',
      danger: !httpFromWifi,
    });
    if (!ok) return;
    this.error.set(null);
    this.saving.set(true);
    this.http.put(apiUrl('/router/device-access'), { httpFromWifi }).subscribe({
      next: () => {
        this.saving.set(false);
        this.access.reload();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(toApiError(err).message);
        this.access.reload();
      },
    });
  }
}
