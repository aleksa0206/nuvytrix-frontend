import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  DIRECTION_LABELS,
  type FirewallDirection,
  type FirewallEventQuery,
} from '../../core/models/firewall.model';
import { FirewallService } from '../../core/services/firewall.service';
import { EmptyState, LoadError, Loading } from '../../shared/ui/feedback';
import { Pagination } from '../../shared/ui/pagination';
import { StateBadge } from '../../shared/ui/state-badge';
import { DateTimePipe, EndpointPipe } from '../../shared/util/format.pipes';

const IP_PATTERN = /^[0-9a-fA-F:.]{2,45}$/;

@Component({
  selector: 'app-firewall-events-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    StateBadge,
    LoadError,
    Loading,
    EmptyState,
    Pagination,
    DateTimePipe,
    EndpointPipe,
  ],
  templateUrl: './events.page.html',
  styleUrl: './events.page.scss',
})
export class EventsPage {
  private readonly firewall = inject(FirewallService);

  protected readonly query = signal<FirewallEventQuery>({
    page: 1,
    pageSize: 50,
    sort: 'occurred_at',
    order: 'desc',
  });
  protected readonly events = this.firewall.eventsResource(this.query);
  protected readonly facets = this.firewall.facetsResource();
  protected readonly selectedId = signal<number | undefined>(undefined);
  protected readonly selected = this.firewall.eventResource(this.selectedId);
  protected readonly ipError = signal(false);
  protected readonly directionLabels = DIRECTION_LABELS;

  protected readonly hasFilters = computed(() => {
    const { action, direction, flow, protocol, ipVersion, ip, port } = this.query();
    return [action, direction, flow, protocol, ipVersion, ip, port].some((v) => v !== undefined);
  });

  protected update(changes: Partial<FirewallEventQuery>) {
    this.query.update((q) => ({ ...q, ...changes, page: 1 }));
  }

  protected setFilter(key: 'action' | 'direction' | 'flow' | 'protocol', value: string) {
    this.update({ [key]: value || undefined });
  }

  protected setIpVersion(value: string) {
    this.update({ ipVersion: value ? Number(value) : undefined });
  }

  protected setAddress(value: string) {
    const ip = value.trim();
    const valid = ip === '' || IP_PATTERN.test(ip);
    this.ipError.set(!valid);
    if (valid) this.update({ ip: ip || undefined });
  }

  protected setPort(value: string) {
    const port = value.trim() === '' ? undefined : Number(value);
    if (port === undefined || (Number.isInteger(port) && port >= 0 && port <= 65535)) {
      this.update({ port });
    }
  }

  protected clearFilters() {
    this.query.set({ page: 1, pageSize: 50, sort: 'occurred_at', order: 'desc' });
    this.ipError.set(false);
  }

  protected sortBy(sort: FirewallEventQuery['sort']) {
    this.query.update((q) => ({
      ...q,
      sort,
      order: q.sort === sort && q.order === 'desc' ? 'asc' : 'desc',
      page: 1,
    }));
  }

  protected sortIndicator(sort: FirewallEventQuery['sort']): string {
    const q = this.query();
    return q.sort === sort ? (q.order === 'asc' ? ' ↑' : ' ↓') : '';
  }

  protected setPage(page: number) {
    this.query.update((q) => ({ ...q, page }));
  }

  protected directionLabel(direction: FirewallDirection | null, raw: string | null): string {
    return direction ? DIRECTION_LABELS[direction] : (raw ?? '—');
  }
}
