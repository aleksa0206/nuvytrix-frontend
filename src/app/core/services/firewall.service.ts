import { HttpClient, httpResource } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import type { Paginated } from '../models/api.models';
import type {
  FirewallEvent,
  FirewallEventDetail,
  FirewallEventQuery,
  FirewallFacets,
  FirewallImport,
  FirewallImportDetail,
  FirewallImportResult,
  FirewallInsights,
  FirewallPolicy,
  FirewallSummary,
  PolicyInput,
  PolicyInstructions,
  PolicyStatus,
} from '../models/firewall.model';
import { apiUrl, toParams } from '../api/http';

@Service()
export class FirewallService {
  private http = inject(HttpClient);

  eventsResource(query: () => FirewallEventQuery) {
    return httpResource<Paginated<FirewallEvent>>(() => ({
      url: apiUrl('/firewall/events'),
      params: toParams(query()),
    }));
  }

  eventResource(id: () => number | undefined) {
    return httpResource<FirewallEventDetail>(() => {
      const eventId = id();
      return eventId ? apiUrl(`/firewall/events/${eventId}`) : undefined;
    });
  }

  facetsResource() {
    return httpResource<FirewallFacets>(() => apiUrl('/firewall/events/facets'));
  }

  summaryResource() {
    return httpResource<FirewallSummary>(() => apiUrl('/firewall/summary'));
  }

  insightsResource() {
    return httpResource<FirewallInsights>(() => apiUrl('/firewall/insights'));
  }

  importsResource() {
    return httpResource<Paginated<FirewallImport>>(() => ({
      url: apiUrl('/firewall/imports'),
      params: toParams({ pageSize: 20 }),
    }));
  }

  importResource(id: () => number | undefined) {
    return httpResource<FirewallImportDetail>(() => {
      const importId = id();
      return importId ? apiUrl(`/firewall/imports/${importId}`) : undefined;
    });
  }

  uploadLog(file: File) {
    const body = new FormData();
    body.append('file', file, file.name);
    return this.http.post<FirewallImportResult>(apiUrl('/firewall/imports'), body);
  }

  policiesResource() {
    return httpResource<FirewallPolicy[]>(() => apiUrl('/firewall/policies'));
  }

  createPolicy(input: PolicyInput) {
    return this.http.post<FirewallPolicy>(apiUrl('/firewall/policies'), input);
  }

  updatePolicy(id: number, input: Partial<PolicyInput>) {
    return this.http.patch<FirewallPolicy>(apiUrl(`/firewall/policies/${id}`), input);
  }

  changePolicyStatus(id: number, status: PolicyStatus, note?: string, confirm?: boolean) {
    return this.http.post<FirewallPolicy>(apiUrl(`/firewall/policies/${id}/status`), {
      status,
      note: note || undefined,
      confirm,
    });
  }

  deletePolicy(id: number) {
    return this.http.delete<void>(apiUrl(`/firewall/policies/${id}`), { body: { confirm: true } });
  }

  policyInstructions(id: number) {
    return this.http.get<PolicyInstructions>(apiUrl(`/firewall/policies/${id}/instructions`));
  }
}
