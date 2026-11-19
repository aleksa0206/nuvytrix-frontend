import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { apiUrl } from '../../core/api/http';
import { EmptyState, LoadError, Loading } from '../../shared/ui/feedback';
import { StateBadge } from '../../shared/ui/state-badge';
import { formatDateTime, formatDuration } from '../../shared/util/format';

export interface AdguardLease {
  mac: string;
  ip: string;
  hostname: string | null;
  deviceName: string | null;
  expires: string | null;
}

export interface AdguardDhcpState {
  enabled: boolean;
  interface: string | null;
  gateway: string | null;
  subnetMask: string | null;
  rangeStart: string | null;
  rangeEnd: string | null;
  leaseSeconds: number | null;
  leases: AdguardLease[];
  staticLeases: AdguardLease[];
}

/** AdGuard Home's DHCP server, which hands out the home's addresses; read only. */
@Component({
  selector: 'app-adguard-dhcp',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyState, LoadError, Loading, StateBadge],
  styleUrl: './router-firewall.scss',
  template: `
    <section class="panel">
      <header class="panel__header">
        <h2>DHCP on AdGuard Home</h2>
        <span class="panel__meta"
          >hands out the home's addresses and AdGuard as DNS; change it in AdGuard's own page</span
        >
      </header>
      @if (dhcp.isLoading() && !dhcp.hasValue()) {
        <app-loading />
      }
      @if (dhcp.error(); as e) {
        <app-load-error [error]="e" (retry)="dhcp.reload()" />
      }
      @if (dhcp.hasValue()) {
        @let d = dhcp.value();
        <div class="panel__body filter-state">
          <app-state-badge
            [state]="d.enabled ? 'operational' : 'down'"
            [label]="d.enabled ? 'DHCP server on' : 'DHCP server off'"
          />
          <span
            >Pool <strong class="mono">{{ d.rangeStart }} – {{ d.rangeEnd }}</strong></span
          >
          <span
            >Gateway <strong class="mono">{{ d.gateway }}</strong></span
          >
          @if (d.leaseSeconds) {
            <span
              >Lease <strong>{{ formatDuration(d.leaseSeconds) }}</strong></span
            >
          }
        </div>
        @if (!d.enabled) {
          <p class="panel__body notice notice--error" role="alert">
            AdGuard's DHCP is off and the router's is off too: devices that join the network get no
            address. Turn it on in AdGuard (Settings → DHCP), or the router's DHCP back on.
          </p>
        }
        @if (d.leases.length + d.staticLeases.length === 0) {
          <app-empty-state title="No devices have an address from AdGuard yet" />
        } @else {
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Device</th>
                  <th>MAC address</th>
                  <th>Address</th>
                  <th>Lease ends</th>
                </tr>
              </thead>
              <tbody>
                @for (l of d.staticLeases; track l.mac) {
                  <tr>
                    <td>{{ l.deviceName ?? l.hostname ?? '—' }}</td>
                    <td class="mono">{{ l.mac }}</td>
                    <td class="mono">{{ l.ip }}</td>
                    <td>fixed</td>
                  </tr>
                }
                @for (l of d.leases; track l.mac) {
                  <tr>
                    <td>{{ l.deviceName ?? l.hostname ?? '—' }}</td>
                    <td class="mono">{{ l.mac }}</td>
                    <td class="mono">{{ l.ip }}</td>
                    <td>{{ formatDateTime(l.expires) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    </section>
  `,
})
export class AdguardDhcp {
  protected readonly dhcp = httpResource<AdguardDhcpState>(() => apiUrl('/dns/dhcp'));
  protected readonly formatDuration = formatDuration;
  protected readonly formatDateTime = formatDateTime;
}
