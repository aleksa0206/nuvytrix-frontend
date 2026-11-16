import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { filter, interval, switchMap, takeWhile } from 'rxjs';
import { toApiError } from '../../core/api/api-error';
import {
  DEVICE_TYPE_LABELS,
  type DeviceQuery,
  type DiscoveryScan,
} from '../../core/models/device.model';
import { DevicesService } from '../../core/services/devices.service';
import { SystemService } from '../../core/services/system.service';
import { EmptyState, LoadError, Loading } from '../../shared/ui/feedback';
import { Icon, deviceIcon } from '../../shared/ui/icon';
import { PageHeader } from '../../shared/ui/page-header';
import { Pagination } from '../../shared/ui/pagination';
import { StateBadge } from '../../shared/ui/state-badge';
import { DateTimePipe, RelativePipe } from '../../shared/util/format.pipes';
import { DevicePanel } from './device-panel';

const SCAN_POLL_MS = 2000;
type StatusFilter = DeviceQuery['status'];

@Component({
  selector: 'app-devices-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeader,
    StateBadge,
    LoadError,
    Loading,
    EmptyState,
    Pagination,
    Icon,
    DevicePanel,
    RelativePipe,
    DateTimePipe,
  ],
  templateUrl: './devices.page.html',
  styleUrl: './devices.page.scss',
})
export class DevicesPage {
  private readonly devices = inject(DevicesService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly params = inject(ActivatedRoute).snapshot.queryParamMap;

  protected readonly counts = inject(SystemService).overviewResource();
  protected readonly query = signal<DeviceQuery>({
    page: 1,
    pageSize: 50,
    sort: 'ip_address',
    order: 'asc',
    status: parseStatus(this.params.get('status')),
    search: this.params.get('search') ?? undefined,
  });
  protected readonly list = this.devices.listResource(this.query);
  protected readonly scans = this.devices.scansResource();
  protected readonly selectedId = signal<number | null>(Number(this.params.get('device')) || null);
  protected readonly activeScan = signal<DiscoveryScan | null>(null);
  protected readonly scanError = signal<string | null>(null);
  protected readonly showScans = signal(false);
  protected readonly iconFor = deviceIcon;
  protected readonly typeLabels = DEVICE_TYPE_LABELS;

  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  protected setTrust(value: string) {
    const trust = (['trusted', 'untrusted', 'unreviewed'] as const).find((t) => t === value);
    this.query.update((q) => ({ ...q, trust, page: 1 }));
  }

  protected setStatus(status: StatusFilter) {
    this.query.update((q) => ({ ...q, status, page: 1 }));
    this.syncUrl();
  }

  protected onSearch(value: string) {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.query.update((q) => ({ ...q, search: value.trim() || undefined, page: 1 }));
      this.syncUrl();
    }, 250);
  }

  protected sortBy(sort: DeviceQuery['sort']) {
    this.query.update((q) => ({
      ...q,
      sort,
      order: q.sort === sort && q.order === 'asc' ? 'desc' : 'asc',
      page: 1,
    }));
  }

  protected sortIndicator(sort: DeviceQuery['sort']): string {
    const q = this.query();
    return q.sort === sort ? (q.order === 'asc' ? ' ↑' : ' ↓') : '';
  }

  protected setPage(page: number) {
    this.query.update((q) => ({ ...q, page }));
  }

  protected select(id: number | null) {
    this.selectedId.set(this.selectedId() === id ? null : id);
    this.syncUrl();
  }

  private syncUrl() {
    const q = this.query();
    this.router.navigate([], {
      queryParams: {
        status: q.status ?? null,
        search: q.search ?? null,
        device: this.selectedId(),
      },
      replaceUrl: true,
    });
  }

  protected startScan() {
    this.scanError.set(null);
    this.devices
      .startScan()
      .pipe(
        switchMap((scan) => {
          this.activeScan.set(scan);
          return interval(SCAN_POLL_MS).pipe(
            switchMap(() => this.devices.getScan(scan.id)),
            takeWhile((current) => current.status === 'running', true),
            filter((current) => current.status !== 'running'),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (finished) => {
          this.activeScan.set(null);
          if (finished.status === 'failed') this.scanError.set(`Scan failed: ${finished.error}`);
          this.list.reload();
          this.scans.reload();
          this.counts.reload();
        },
        error: (err: unknown) => {
          this.activeScan.set(null);
          this.scanError.set(toApiError(err).message);
        },
      });
  }
}

function parseStatus(value: string | null): StatusFilter {
  return value === 'online' || value === 'offline' || value === 'new' ? value : undefined;
}
