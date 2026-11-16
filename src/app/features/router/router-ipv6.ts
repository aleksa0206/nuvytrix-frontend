import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { apiUrl } from '../../core/api/http';
import { LoadError, Loading } from '../../shared/ui/feedback';

interface Ipv6Lan {
  prefix: { prefix: string; mode: string } | null;
  routerAdvertisement: {
    enabled: boolean;
    managed: boolean;
    otherConfig: boolean;
    mtu: number | null;
  } | null;
  dhcpv6Server: { enabled: boolean } | null;
  dns: { mode: string; servers: string[] } | null;
}

const PREFIX_SOURCE: Record<string, string> = {
  WANDelegated: 'from the provider',
  Static: 'set by hand',
  HGWProxy: 'router proxy',
};
const DNS_MODE: Record<string, string> = {
  HGWProxy: 'the router answers',
  WANConnection: "the provider's servers",
  Static: 'servers set by hand',
};

/** IPv6 on the LAN, read only: changing it can cut IPv6 for every device. */
@Component({
  selector: 'app-router-ipv6',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoadError, Loading],
  styleUrl: './router-firewall.scss',
  template: `
    <section class="panel">
      <header class="panel__header">
        <h2>IPv6 on the LAN</h2>
        <span class="panel__meta">read only</span>
      </header>
      @if (ipv6.isLoading() && !ipv6.hasValue()) {
        <app-loading />
      }
      @if (ipv6.error(); as e) {
        <app-load-error [error]="e" (retry)="ipv6.reload()" />
      }
      @if (ipv6.hasValue()) {
        @let v = ipv6.value();
        <dl class="panel__body kv">
          <dt>Prefix</dt>
          <dd>
            @if (v.prefix) {
              <span class="mono">{{ v.prefix.prefix || '—' }}</span>
              ({{ prefixSource[v.prefix.mode] ?? v.prefix.mode }})
            } @else {
              —
            }
          </dd>
          <dt>Addresses for devices</dt>
          <dd>
            @if (v.routerAdvertisement; as ra) {
              {{
                !ra.enabled
                  ? 'Router advertisements off'
                  : ra.managed
                    ? 'DHCPv6'
                    : 'Automatic (SLAAC)'
              }}
              @if (ra.enabled && ra.otherConfig) {
                , DNS over DHCPv6
              }
              @if (ra.mtu) {
                · MTU {{ ra.mtu }}
              }
            } @else {
              —
            }
          </dd>
          <dt>DHCPv6 server</dt>
          <dd>{{ v.dhcpv6Server ? (v.dhcpv6Server.enabled ? 'On' : 'Off') : '—' }}</dd>
          <dt>DNS</dt>
          <dd>
            @if (v.dns) {
              {{ dnsMode[v.dns.mode] ?? v.dns.mode }}
              @if (v.dns.servers.length) {
                (<span class="mono">{{ v.dns.servers.join(', ') }}</span
                >)
              }
            } @else {
              —
            }
          </dd>
        </dl>
      }
    </section>
  `,
})
export class RouterIpv6 {
  protected readonly ipv6 = httpResource<Ipv6Lan>(() => apiUrl('/router/ipv6'));
  protected readonly prefixSource = PREFIX_SOURCE;
  protected readonly dnsMode = DNS_MODE;
}
