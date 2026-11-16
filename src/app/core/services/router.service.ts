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
  DhcpReservation,
  DhcpReservationInput,
  DhcpServer,
  DhcpServerInput,
  RouterDhcpState,
  MacFilterEntry,
  MacFilterEntryInput,
  MacFilterList,
  MacFilterState,
  RouterMacFilterState,
  PortMappingInput,
  PortMappingRule,
  RouterPortMappingState,
  DmzState,
  PortTriggerInput,
  PortTriggerRule,
  RouterDmzState,
  RouterPortTriggerState,
  RouterWifiState,
  WifiNetworkConfig,
  WifiNetworkInput,
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

  dhcpResource() {
    return httpResource<RouterDhcpState>(() => apiUrl('/router/dhcp'));
  }

  changeDhcpServer(input: DhcpServerInput) {
    return this.http.patch<DhcpServer>(apiUrl('/router/dhcp'), input);
  }

  addDhcpReservation(input: DhcpReservationInput) {
    return this.http.post<{ reservation: DhcpReservation }>(
      apiUrl('/router/dhcp/reservations'),
      input,
    );
  }

  updateDhcpReservation(index: number, input: DhcpReservationInput) {
    return this.http.put<{ reservation: DhcpReservation }>(
      apiUrl(`/router/dhcp/reservations/${index}`),
      input,
    );
  }

  deleteDhcpReservation(index: number) {
    return this.http.delete<DhcpReservation[]>(apiUrl(`/router/dhcp/reservations/${index}`));
  }

  macFilterResource() {
    return httpResource<RouterMacFilterState>(() => apiUrl('/router/mac-filter'));
  }

  setMacFilterEnabled(list: MacFilterList, enabled: boolean) {
    return this.http.patch<MacFilterState>(apiUrl(`/router/mac-filter/${list}`), { enabled });
  }

  addMacFilterEntry(list: MacFilterList, input: MacFilterEntryInput) {
    return this.http.post<{ entry: MacFilterEntry }>(
      apiUrl(`/router/mac-filter/${list}/entries`),
      input,
    );
  }

  updateMacFilterEntry(list: MacFilterList, index: number, input: MacFilterEntryInput) {
    return this.http.put<{ entry: MacFilterEntry }>(
      apiUrl(`/router/mac-filter/${list}/entries/${index}`),
      input,
    );
  }

  deleteMacFilterEntry(list: MacFilterList, index: number) {
    return this.http.delete<MacFilterState>(apiUrl(`/router/mac-filter/${list}/entries/${index}`));
  }

  portMappingResource() {
    return httpResource<RouterPortMappingState>(() => apiUrl('/router/port-mappings'));
  }

  addPortMapping(input: PortMappingInput) {
    return this.http.post<{ mapping: PortMappingRule }>(apiUrl('/router/port-mappings'), input);
  }

  updatePortMapping(index: number, input: PortMappingInput) {
    return this.http.put<{ mapping: PortMappingRule }>(
      apiUrl(`/router/port-mappings/${index}`),
      input,
    );
  }

  deletePortMapping(index: number) {
    return this.http.delete<PortMappingRule[]>(apiUrl(`/router/port-mappings/${index}`));
  }

  dmzResource() {
    return httpResource<RouterDmzState>(() => apiUrl('/router/dmz'));
  }

  setDmz(input: { enabled: boolean; host: string }) {
    return this.http.put<DmzState>(apiUrl('/router/dmz'), input);
  }

  deleteDmz() {
    return this.http.delete<void>(apiUrl('/router/dmz'));
  }

  portTriggerResource() {
    return httpResource<RouterPortTriggerState>(() => apiUrl('/router/port-triggers'));
  }

  addPortTrigger(input: PortTriggerInput) {
    return this.http.post<{ trigger: PortTriggerRule }>(apiUrl('/router/port-triggers'), input);
  }

  updatePortTrigger(index: number, input: PortTriggerInput) {
    return this.http.put<{ trigger: PortTriggerRule }>(
      apiUrl(`/router/port-triggers/${index}`),
      input,
    );
  }

  deletePortTrigger(index: number) {
    return this.http.delete<PortTriggerRule[]>(apiUrl(`/router/port-triggers/${index}`));
  }

  wifiResource() {
    return httpResource<RouterWifiState>(() => apiUrl('/router/wifi'));
  }

  addWifiNetwork(input: WifiNetworkInput & { band: WifiNetworkConfig['band']; password: string }) {
    return this.http.post<{ network: WifiNetworkConfig }>(apiUrl('/router/wifi'), input);
  }

  updateWifiNetwork(index: number, input: WifiNetworkInput) {
    return this.http.put<{ network: WifiNetworkConfig }>(apiUrl(`/router/wifi/${index}`), input);
  }

  deleteWifiNetwork(index: number) {
    return this.http.delete<WifiNetworkConfig[]>(apiUrl(`/router/wifi/${index}`));
  }

  refresh() {
    return this.http.post<RouterStatus>(apiUrl('/router/refresh'), {});
  }
}
