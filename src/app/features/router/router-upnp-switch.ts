import { HttpClient, httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { apiUrl } from '../../core/api/http';
import { toApiError } from '../../core/api/api-error';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { LoadError, Loading } from '../../shared/ui/feedback';
import { StateBadge } from '../../shared/ui/state-badge';

interface UpnpSettings {
  writesEnabled: boolean;
  enabled: boolean;
}

/** The router's UPnP on/off switch, read live, changed after confirmation. */
@Component({
  selector: 'app-router-upnp-switch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StateBadge, LoadError, Loading],
  styleUrl: './router-firewall.scss',
  template: `
    <section class="panel">
      <header class="panel__header">
        <h2>UPnP on the router</h2>
        <span class="panel__meta">lets apps on your devices open ports by themselves</span>
      </header>
      @if (upnp.isLoading() && !upnp.hasValue()) {
        <app-loading />
      }
      @if (upnp.error(); as e) {
        <app-load-error [error]="e" (retry)="upnp.reload()" />
      }
      @if (upnp.hasValue()) {
        @let u = upnp.value();
        <div class="panel__body filter-state">
          <app-state-badge
            [state]="u.enabled ? 'operational' : 'disabled'"
            [label]="u.enabled ? 'UPnP on' : 'UPnP off'"
          />
          @if (writable()) {
            <span class="spacer"></span>
            <button type="button" class="btn" [disabled]="saving()" (click)="toggle(!u.enabled)">
              {{ saving() ? 'Saving on the router…' : u.enabled ? 'Turn off' : 'Turn on' }}
            </button>
          }
        </div>
        @if (!u.enabled) {
          <p class="panel__body notice notice--info">
            While UPnP is off, Nuvytrix cannot read the WAN status, traffic counters and port
            mappings it gets over UPnP.
          </p>
        }
        @if (error()) {
          <p class="panel__body notice notice--error" role="alert">{{ error() }}</p>
        }
      }
    </section>
  `,
})
export class RouterUpnpSwitch {
  private readonly http = inject(HttpClient);
  private readonly confirm = inject(ConfirmService);

  protected readonly upnp = httpResource<UpnpSettings>(() => apiUrl('/router/upnp-settings'));
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly writable = computed(
    () => this.upnp.hasValue() && this.upnp.value().writesEnabled,
  );

  protected async toggle(enabled: boolean) {
    const ok = await this.confirm.ask({
      title: enabled ? 'Turn UPnP on?' : 'Turn UPnP off?',
      message: enabled
        ? 'Apps on your devices can open ports on the router again without asking.'
        : 'Apps can no longer open ports by themselves; ports they opened close. Nuvytrix loses ' +
          'the WAN status, traffic counters and port mappings it reads over UPnP until it is on again.',
      confirmLabel: enabled ? 'Turn on' : 'Turn off',
      danger: !enabled,
    });
    if (!ok) return;
    this.error.set(null);
    this.saving.set(true);
    this.http.patch(apiUrl('/router/upnp-settings'), { enabled }).subscribe({
      next: () => {
        this.saving.set(false);
        this.upnp.reload();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(toApiError(err).message);
        this.upnp.reload();
      },
    });
  }
}
