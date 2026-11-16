import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toApiError } from '../../core/api/api-error';
import { pollWhileVisible } from '../../core/polling';
import { RouterService } from '../../core/services/router.service';
import { RouterDhcp } from './router-dhcp';
import { RouterFirewall } from './router-firewall';
import { EmptyState, LoadError, Loading } from '../../shared/ui/feedback';
import { LineChart } from '../../shared/ui/line-chart';
import { PageHeader } from '../../shared/ui/page-header';
import { StateBadge } from '../../shared/ui/state-badge';
import { formatBytes, formatDuration } from '../../shared/util/format';
import { RelativePipe } from '../../shared/util/format.pipes';

type Tab = 'overview' | 'clients' | 'dhcp' | 'firewall';

@Component({
  selector: 'app-router-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    PageHeader,
    StateBadge,
    LoadError,
    Loading,
    EmptyState,
    LineChart,
    RelativePipe,
    RouterFirewall,
    RouterDhcp,
  ],
  templateUrl: './router.page.html',
  styleUrl: './router.page.scss',
})
export class RouterPage {
  private readonly api = inject(RouterService);

  protected readonly status = this.api.statusResource();
  private readonly ready = computed(() => {
    const status = this.status.hasValue() ? this.status.value() : null;
    return status !== null && status.configured && !!status.capturedAt;
  });
  protected readonly clients = this.api.clientsResource(this.ready);
  protected readonly upnp = this.api.upnpResource(this.ready);
  protected readonly hours = signal(24);
  protected readonly history = this.api.historyResource(this.hours);
  protected readonly tab = signal<Tab>('overview');
  protected readonly refreshing = signal(false);
  protected readonly refreshError = signal<string | null>(null);

  protected readonly rxPoints = computed(() =>
    this.history.hasValue()
      ? this.history.value().points.map((p) => ({
          at: p.at,
          value: p.opticalRxDbm === null ? null : -p.opticalRxDbm,
        }))
      : [],
  );
  protected readonly downloadPoints = computed(() =>
    this.history.hasValue()
      ? this.history.value().points.map((p) => ({
          at: p.at,
          value: p.lanDownloadBps === null ? null : Math.round(p.lanDownloadBps / 10_000) / 100,
        }))
      : [],
  );
  protected readonly cpuPoints = computed(() =>
    this.history.hasValue()
      ? this.history.value().points.map((p) => ({ at: p.at, value: p.cpuPercent }))
      : [],
  );

  protected readonly sortedClients = computed(() => {
    if (!this.clients.hasValue()) return [];
    return [...this.clients.value().clients].sort(
      (a, b) =>
        Number(b.online) - Number(a.online) ||
        (a.ipAddress ?? '').localeCompare(b.ipAddress ?? '', undefined, { numeric: true }),
    );
  });

  protected readonly formatBytes = formatBytes;
  protected readonly formatDuration = formatDuration;

  constructor() {
    pollWhileVisible(() => {
      this.status.reload();
      this.clients.reload();
    }, 60_000);
  }

  protected refresh() {
    this.refreshing.set(true);
    this.refreshError.set(null);
    this.api.refresh().subscribe({
      next: () => {
        this.refreshing.set(false);
        this.status.reload();
        this.clients.reload();
        this.history.reload();
        this.upnp.reload();
      },
      error: (err: unknown) => {
        this.refreshing.set(false);
        this.refreshError.set(toApiError(err).message);
      },
    });
  }

  protected uptime(seconds: number | null | undefined): string {
    return seconds === null || seconds === undefined ? '—' : formatDuration(seconds);
  }

  protected signalState(rssi: number | null): string {
    if (rssi === null) return 'unknown';
    if (rssi >= -60) return 'operational';
    if (rssi >= -72) return 'warning';
    return 'error';
  }

  protected signalLabel(rssi: number | null): string {
    if (rssi === null) return 'n/a';
    return `${rssi} dBm`;
  }

  protected portLabel(port: string | null): string {
    if (!port) return '—';
    if (port === 'SSID1') return 'Wi-Fi 2.4 GHz';
    if (port === 'SSID5') return 'Wi-Fi 5 GHz';
    return port.replace('LAN', 'LAN ');
  }
}
