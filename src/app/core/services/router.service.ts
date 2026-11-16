import { HttpClient, httpResource } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import type {
  IpFilterRule,
  IpFilterRuleInput,
  IpFilterState,
  PortMapping,
  RouterClient,
  RouterHistoryPoint,
  RouterFirewallState,
  RouterStatus,
} from '../models/router.model';
import { apiUrl, toParams } from '../api/http';

/** Huawei router data read by the backend (the browser never talks to the router). */
@Service()
export class RouterService {
  private http = inject(HttpClient);

  statusResource() {
    return httpResource<RouterStatus>(() => apiUrl('/router/status'));
  }

  clientsResource(enabled: () => boolean) {
    return httpResource<{ capturedAt: string; clients: RouterClient[] }>(() =>
      enabled() ? apiUrl('/router/clients') : undefined,
    );
  }

  upnpResource(enabled: () => boolean) {
    return httpResource<PortMapping[]>(() => (enabled() ? apiUrl('/router/upnp') : undefined));
  }

  historyResource(hours: () => number) {
    return httpResource<{ hours: number; points: RouterHistoryPoint[] }>(() => ({
      url: apiUrl('/router/history'),
      params: toParams({ hours: hours() }),
    }));
  }

  /** IPv4 filter read from the router on request (not from the last poll). */
  firewallResource() {
    return httpResource<RouterFirewallState>(() => apiUrl('/router/firewall'));
  }

  addFirewallRule(input: IpFilterRuleInput) {
    return this.http.post<{ rule: IpFilterRule }>(apiUrl('/router/firewall/rules'), input);
  }

  updateFirewallRule(index: number, input: IpFilterRuleInput) {
    return this.http.put<{ rule: IpFilterRule }>(apiUrl(`/router/firewall/rules/${index}`), input);
  }

  deleteFirewallRule(index: number) {
    return this.http.delete<IpFilterState>(apiUrl(`/router/firewall/rules/${index}`));
  }

  changeFirewall(change: { enabled?: boolean; mode?: 'blacklist' }) {
    return this.http.patch<IpFilterState>(apiUrl('/router/firewall'), change);
  }

  refresh() {
    return this.http.post<RouterStatus>(apiUrl('/router/refresh'), {});
  }
}
