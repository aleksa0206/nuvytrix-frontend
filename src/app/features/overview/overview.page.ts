import { HttpClient, httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { apiUrl } from '../../core/api/http';
import { pollWhileVisible } from '../../core/polling';
import { DIRECTION_LABELS, type FirewallDirection } from '../../core/models/firewall.model';
import type { Overview } from '../../core/models/system.model';
import { DevicesService } from '../../core/services/devices.service';
import { FirewallService } from '../../core/services/firewall.service';
import { RouterService } from '../../core/services/router.service';
import { SystemService } from '../../core/services/system.service';
import { AvailabilityStrip } from '../../shared/ui/availability-strip';
import { EmptyState, LoadError, Loading } from '../../shared/ui/feedback';
import { LineChart } from '../../shared/ui/line-chart';
import { StateBadge } from '../../shared/ui/state-badge';
import { TopologyMap } from '../../shared/ui/topology-map';
import { formatDuration } from '../../shared/util/format';
import {
  DateTimePipe,
  EndpointPipe,
  NumberPipe,
  RelativePipe,
} from '../../shared/util/format.pipes';

interface Alert {
  id: number;
  kind: string;
  severity: 'info' | 'warning' | 'error';
  title: string;
  createdAt: string;
  read: boolean;
}

interface Attention {
  severity: 'error' | 'warning';
  title: string;
  detail: string;
  link: string;
  query?: Record<string, string>;
}

@Component({
  selector: 'app-overview-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    StateBadge,
    LoadError,
    Loading,
    EmptyState,
    LineChart,
    AvailabilityStrip,
    TopologyMap,
    NumberPipe,
    RelativePipe,
    DateTimePipe,
    EndpointPipe,
  ],
  templateUrl: './overview.page.html',
  styleUrl: './overview.page.scss',
})
export class OverviewPage {
  private readonly system = inject(SystemService);
  private readonly router = inject(Router);

  protected readonly overview = this.system.overviewResource();
  protected readonly targets = this.system.targetsResource();
  protected readonly devices = inject(DevicesService).listResource(() => ({
    page: 1,
    pageSize: 200,
    sort: 'ip_address',
    order: 'asc',
  }));
  protected readonly events = inject(FirewallService).eventsResource(() => ({
    page: 1,
    pageSize: 8,
    sort: 'occurred_at',
    order: 'desc',
  }));
  protected readonly changes = this.system.auditResource(() => 1);

  private readonly http = inject(HttpClient);
  private readonly routerApi = inject(RouterService);
  protected readonly alerts = httpResource<{ unread: number; alerts: Alert[] }>(() =>
    apiUrl('/alerts'),
  );
  protected readonly routerStatus = this.routerApi.statusResource();
  protected readonly traffic = this.routerApi.historyResource(() => 24);
  protected readonly internetTarget = computed(() =>
    this.targets.hasValue()
      ? this.targets.value().find((target) => target.managedKey === 'internet')
      : undefined,
  );
  protected readonly internetState = computed(() => {
    const status = this.internetTarget()?.status;
    return status === 'up'
      ? 'operational'
      : status === 'degraded'
        ? 'warning'
        : status === 'down'
          ? 'error'
          : 'unknown';
  });
  /** Fiber signal and Wi-Fi from the last router reading; null until the router was read. */
  protected readonly routerNow = computed(() => {
    const s = this.routerStatus.hasValue() ? this.routerStatus.value() : null;
    if (!s || !s.configured) return null;
    const rx = s.optical?.rxPowerDbm ?? null;
    return {
      rx,
      fiberState: !s.optical
        ? 'unknown'
        : s.optical.lossOfSignal
          ? 'error'
          : rx !== null && rx < -27
            ? 'warning'
            : 'operational',
      wifiClients: s.wifiClients,
    } as const;
  });
  /** Internet download in Mbit/s from the fiber counters. */
  protected readonly downloadPoints = computed(() =>
    this.traffic.hasValue()
      ? this.traffic.value().points.map((p) => ({
          at: p.at,
          value: p.wanDownloadBps === null ? null : Math.round(p.wanDownloadBps / 10_000) / 100,
        }))
      : [],
  );
  protected readonly lastDownload = computed(() => {
    const points = this.traffic.hasValue() ? this.traffic.value().points : [];
    return [...points].reverse().find((p) => p.wanDownloadBps !== null)?.wanDownloadBps ?? null;
  });

  private readonly routerTargetId = computed(() =>
    this.targets.hasValue()
      ? this.targets.value().find((target) => target.managedKey === 'router')?.id
      : undefined,
  );
  protected readonly routerSeries = this.system.seriesResource(this.routerTargetId, signal(24));
  protected readonly latencyPoints = computed(() =>
    this.routerSeries.hasValue()
      ? this.routerSeries
          .value()
          .points.map((p) => ({ at: p.at, value: p.avgLatencyMs, max: p.maxLatencyMs }))
      : [],
  );

  protected readonly attention = computed<Attention[]>(() =>
    this.overview.hasValue() ? attentionItems(this.overview.value()) : [],
  );

  protected readonly formatDuration = formatDuration;
  protected readonly directionLabels = DIRECTION_LABELS;

  constructor() {
    pollWhileVisible(() => {
      this.overview.reload();
      this.targets.reload();
      this.routerSeries.reload();
      this.alerts.reload();
      this.routerStatus.reload();
      this.traffic.reload();
    }, 30_000);
  }

  protected markAllRead() {
    this.http.post(apiUrl('/alerts/read-all'), {}).subscribe(() => {
      this.alerts.reload();
      this.overview.reload();
    });
  }

  protected mbps(bps: number | null): string {
    return bps === null ? '—' : (bps / 1_000_000).toFixed(2);
  }

  protected openDevice(id: number) {
    this.router.navigate(['/devices'], { queryParams: { device: id } });
  }

  protected directionLabel(direction: FirewallDirection | null, raw: string | null): string {
    return direction ? DIRECTION_LABELS[direction] : (raw ?? '—');
  }

  protected changeLabel(action: string): string {
    return action.replace('.', ': ').replace(/_/g, ' ');
  }
}

/** Only conditions that need a decision or a look; healthy areas stay out of this list. */
function attentionItems(o: Overview): Attention[] {
  const items: Attention[] = [];
  if (o.router.state === 'error') {
    items.push({
      severity: 'error',
      title: 'Router not responding',
      detail: `${o.router.host} did not answer the last ping`,
      link: '/monitoring',
    });
  }
  for (const target of o.monitoring.failing) {
    if (target.name === 'Router') continue;
    items.push({
      severity: 'error',
      title: `${target.name} is down`,
      detail: 'Last check failed',
      link: '/monitoring',
    });
  }
  if (o.devices.latestScan?.status === 'failed') {
    items.push({
      severity: 'error',
      title: 'Last discovery scan failed',
      detail: o.devices.latestScan.error ?? '',
      link: '/devices',
    });
  }
  if (o.devices.newLast24h > 0) {
    items.push({
      severity: 'warning',
      title: `${o.devices.newLast24h} new device${o.devices.newLast24h === 1 ? '' : 's'}`,
      detail: 'First seen in the last 24 hours; identify and name them',
      link: '/devices',
      query: { status: 'new' },
    });
  }
  if (o.firewall.hasData && o.firewall.acceptedInbound > 0) {
    items.push({
      severity: 'warning',
      title: 'Inbound traffic was accepted',
      detail: 'Connections from the internet passed the firewall',
      link: '/firewall/insights',
    });
  }
  if (o.firewall.hasData && o.firewall.repeatedDeniedSources > 0) {
    items.push({
      severity: 'warning',
      title: `${o.firewall.repeatedDeniedSources} source${o.firewall.repeatedDeniedSources === 1 ? '' : 's'} with repeated denials`,
      detail: 'Observed in the imported log; review before drawing conclusions',
      link: '/firewall/insights',
    });
  }
  if (o.policies.failed > 0) {
    items.push({
      severity: 'error',
      title: `${o.policies.failed} rule${o.policies.failed === 1 ? '' : 's'} failed to apply`,
      detail: 'Marked as failed on the router',
      link: '/firewall/policies',
    });
  }
  if (o.policies.pendingManual > 0) {
    items.push({
      severity: 'warning',
      title: `${o.policies.pendingManual} rule${o.policies.pendingManual === 1 ? '' : 's'} waiting`,
      detail: 'Ready to be applied by hand on the router',
      link: '/firewall/policies',
    });
  }
  return items;
}
