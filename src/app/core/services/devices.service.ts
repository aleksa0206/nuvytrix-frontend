import { HttpClient, httpResource } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import type { Paginated } from '../models/api.models';
import type {
  Device,
  DeviceChanges,
  DeviceDetail,
  DeviceQuery,
  DiscoveryScan,
} from '../models/device.model';
import { apiUrl, toParams } from '../api/http';

/**
 * Resource factories must be called from an injection context (a component field initializer);
 * they re-request whenever the signals they read change.
 */
@Service()
export class DevicesService {
  private http = inject(HttpClient);

  listResource(query: () => DeviceQuery) {
    return httpResource<Paginated<Device>>(() => ({
      url: apiUrl('/devices'),
      params: toParams(query()),
    }));
  }

  detailResource(id: () => number | undefined) {
    return httpResource<DeviceDetail>(() => {
      const deviceId = id();
      return deviceId ? apiUrl(`/devices/${deviceId}`) : undefined;
    });
  }

  scansResource() {
    return httpResource<Paginated<DiscoveryScan>>(() => ({
      url: apiUrl('/discovery/scans'),
      params: toParams({ pageSize: 10 }),
    }));
  }

  update(id: number, changes: DeviceChanges) {
    return this.http.patch<Device>(apiUrl(`/devices/${id}`), changes);
  }

  startScan(target?: string) {
    return this.http.post<DiscoveryScan>(apiUrl('/discovery/scans'), target ? { target } : {});
  }

  getScan(id: number) {
    return this.http.get<DiscoveryScan>(apiUrl(`/discovery/scans/${id}`));
  }
}
