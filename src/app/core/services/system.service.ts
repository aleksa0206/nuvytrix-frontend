import { HttpClient, httpResource } from '@angular/common/http';
import { Service, inject, signal } from '@angular/core';
import type { Paginated } from '../models/api.models';
import type {
  AuditEntry,
  Capability,
  DnsStats,
  DnsStatus,
  MonitoringTarget,
  Overview,
  SystemSettings,
  TargetInput,
  TargetSeries,
} from '../models/system.model';
import { apiUrl, toParams } from '../api/http';

/** Overview, monitoring, DNS and system endpoints: small, read-mostly APIs. */
@Service()
export class SystemService {
  private http = inject(HttpClient);
  /** Bumped when something changes the status bar's data (e.g. notifications marked read). */
  readonly statusChanged = signal(0);

  overviewResource() {
    return httpResource<Overview>(() => apiUrl('/overview'));
  }

  capabilitiesResource() {
    return httpResource<Capability[]>(() => apiUrl('/system/capabilities'));
  }

  settingsResource() {
    return httpResource<SystemSettings>(() => apiUrl('/system/settings'));
  }

  auditResource(page: () => number) {
    return httpResource<Paginated<AuditEntry>>(() => ({
      url: apiUrl('/audit-logs'),
      params: toParams({ page: page(), pageSize: 25 }),
    }));
  }

  targetsResource() {
    return httpResource<MonitoringTarget[]>(() => apiUrl('/monitoring/targets'));
  }

  seriesResource(target: () => number | undefined, hours: () => number) {
    return httpResource<TargetSeries>(() => {
      const id = target();
      return id
        ? { url: apiUrl(`/monitoring/targets/${id}/series`), params: toParams({ hours: hours() }) }
        : undefined;
    });
  }

  createTarget(input: TargetInput) {
    return this.http.post<MonitoringTarget>(apiUrl('/monitoring/targets'), input);
  }

  updateTarget(id: number, input: Partial<TargetInput>) {
    return this.http.patch<MonitoringTarget>(apiUrl(`/monitoring/targets/${id}`), input);
  }

  deleteTarget(id: number) {
    return this.http.delete<void>(apiUrl(`/monitoring/targets/${id}`));
  }

  checkTarget(id: number) {
    return this.http.post(apiUrl(`/monitoring/targets/${id}/check`), {});
  }

  dnsStatusResource() {
    return httpResource<DnsStatus>(() => apiUrl('/dns/status'));
  }

  dnsStatsResource(enabled: () => boolean) {
    return httpResource<DnsStats>(() => (enabled() ? apiUrl('/dns/stats') : undefined));
  }
}
