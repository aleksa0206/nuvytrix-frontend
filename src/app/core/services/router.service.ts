import { HttpClient, httpResource } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import type {
  PortMapping,
  RouterClient,
  RouterHistoryPoint,
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

  refresh() {
    return this.http.post<RouterStatus>(apiUrl('/router/refresh'), {});
  }
}
