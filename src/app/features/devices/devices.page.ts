import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { filter, interval, switchMap, takeWhile } from 'rxjs';
import { toApiError } from '../../core/api/api-error';
import type { DeviceQuery, DiscoveryScan } from '../../core/models/device.model';
import { DevicesService } from '../../core/services/devices.service';
import { EmptyState, LoadError, Loading } from '../../shared/ui/feedback';
import { PageHeader } from '../../shared/ui/page-header';
import { Pagination } from '../../shared/ui/pagination';
import { StateBadge } from '../../shared/ui/state-badge';
import { DateTimePipe, RelativePipe } from '../../shared/util/format.pipes';

const SCAN_POLL_MS = 2000;
type StatusFilter = DeviceQuery['status'];

@Component({
  selector: 'app-devices-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    PageHeader,
    StateBadge,
    LoadError,
    Loading,
    EmptyState,
    Pagination,
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

  protected readonly statusFilters: { value: StatusFilter; label: string }[] = [
    { value: undefined, label: 'All' },
    { value: 'online', label: 'Online' },
    { value: 'offline', label: 'Offline' },
    { value: 'new', label: 'New (24 h)' },
  ];

  protected readonly query = signal<DeviceQuery>({
    page: 1,
    pageSize: 50,
    sort: 'ip_address',
    order: 'asc',
    status: parseStatus(inject(ActivatedRoute).snapshot.queryParamMap.get('status')),
  });
  protected readonly list = this.devices.listResource(this.query);
  protected readonly scans = this.devices.scansResource();
  protected readonly activeScan = signal<DiscoveryScan | null>(null);
  protected readonly scanError = signal<string | null>(null);

  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  protected setStatus(status: StatusFilter) {
    this.query.update((q) => ({ ...q, status, page: 1 }));
    this.router.navigate([], { queryParams: { status: status ?? null }, replaceUrl: true });
  }

  protected onSearch(value: string) {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(
      () => this.query.update((q) => ({ ...q, search: value.trim() || undefined, page: 1 })),
      250,
    );
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

  protected open(id: number) {
    this.router.navigate(['/devices', id]);
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
