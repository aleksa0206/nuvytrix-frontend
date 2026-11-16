import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { apiUrl } from '../../core/api/http';
import { pollWhileVisible } from '../../core/polling';
import { EmptyState, LoadError, Loading } from '../../shared/ui/feedback';
import { LineChart } from '../../shared/ui/line-chart';
import { StateBadge } from '../../shared/ui/state-badge';
import { formatBytes, formatDuration } from '../../shared/util/format';
import { RelativePipe } from '../../shared/util/format.pipes';
import { ServerContainers } from './server-containers';

interface ServerStatus {
  sampledAt: string;
  cpuPercent: number | null;
  load1: number | null;
  loadCores: number | null;
  memoryPercent: number | null;
  memoryAvailableBytes: number | null;
  swapPercent: number | null;
  uptimeSeconds: number | null;
  temperatureC: number | null;
  onBattery: boolean | null;
  batteryPercent: number | null;
  disks: { name: string; totalBytes: number; usedBytes: number; percent: number }[];
  netErrors: number | null;
  db: {
    up: boolean;
    connections: number | null;
    sizeBytes: number | null;
    longestQuerySeconds: number | null;
    error: string | null;
  };
}

interface ServerHistory {
  hours: number;
  points: {
    at: string;
    cpuPercent: number | null;
    memoryPercent: number | null;
    temperatureC: number | null;
    load1: number | null;
  }[];
}

/** The Ubuntu server itself: resources, power, disks and the database, measured on the server. */
@Component({
  selector: 'app-server-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LineChart, StateBadge, LoadError, Loading, EmptyState, RelativePipe, ServerContainers],
  template: `
    <div class="page">
      <header class="page-title">
        <h1>Server</h1>
        @if (status.hasValue()) {
          <span class="text-tertiary"
            >Measured on the server from /proc and /sys ·
            {{ status.value().sampledAt | relative }}</span
          >
        }
      </header>

      @if (status.isLoading() && !status.hasValue()) {
        <app-loading />
      }
      @if (status.error(); as e) {
        <app-load-error [error]="e" (retry)="status.reload()" />
      }

      @if (status.hasValue()) {
        @let s = status.value();
        <section class="health" aria-label="Server health">
          <div class="health__cell">
            <span class="health__name">CPU</span>
            <span class="health__value mono">{{ s.cpuPercent ?? '—' }}<small>%</small></span>
            <span class="health__note"
              >load {{ s.load1 ?? '—' }} on {{ s.loadCores ?? '?' }} cores</span
            >
          </div>
          <div class="health__cell">
            <span class="health__name">Memory</span>
            <span class="health__value mono">{{ s.memoryPercent ?? '—' }}<small>%</small></span>
            <span class="health__note"
              >{{ bytes(s.memoryAvailableBytes) }} free · swap {{ s.swapPercent ?? '—' }} %</span
            >
          </div>
          <div class="health__cell">
            <span class="health__name">Temperature</span>
            <span class="health__value mono">{{ s.temperatureC ?? '—' }}<small>°C</small></span>
            <span class="health__note">hottest CPU core</span>
          </div>
          <div class="health__cell">
            <span class="health__name">Power</span>
            <app-state-badge
              [state]="s.onBattery === null ? 'unknown' : s.onBattery ? 'error' : 'operational'"
              [label]="s.onBattery === null ? 'Unknown' : s.onBattery ? 'On battery' : 'Mains'"
            />
            <span class="health__note">battery {{ s.batteryPercent ?? '—' }} %</span>
          </div>
          <div class="health__cell">
            <span class="health__name">Uptime</span>
            <span class="health__value mono">{{
              s.uptimeSeconds !== null ? duration(s.uptimeSeconds) : '—'
            }}</span>
            <span class="health__note">network errors {{ s.netErrors ?? '—' }}</span>
          </div>
          <div class="health__cell">
            <span class="health__name">Database</span>
            <app-state-badge
              [state]="s.db.up ? 'operational' : 'error'"
              [label]="s.db.up ? 'Up' : 'Down'"
            />
            <span class="health__note">
              {{ s.db.connections ?? '—' }} connections · {{ bytes(s.db.sizeBytes) }}
              @if (s.db.longestQuerySeconds) {
                · longest query {{ s.db.longestQuerySeconds }} s
              }
            </span>
          </div>
        </section>

        <section class="panel">
          <header class="panel__header"><h2>Disks</h2></header>
          <div class="panel__body stack">
            @for (d of s.disks; track d.name) {
              <div class="disk">
                <span class="disk__name">{{ d.name }}</span>
                <span class="disk__bar" [attr.aria-label]="d.percent + '% used'"
                  ><span [style.width.%]="d.percent" [class.is-warn]="d.percent >= 90"></span
                ></span>
                <span class="mono"
                  >{{ bytes(d.usedBytes) }} / {{ bytes(d.totalBytes) }} · {{ d.percent }} %</span
                >
              </div>
            } @empty {
              <p class="text-tertiary">No disks reported.</p>
            }
          </div>
        </section>
      }

      <app-server-containers />

      <section class="panel">
        <header class="panel__header">
          <h2>History</h2>
          <div class="segmented" role="group" aria-label="Time range">
            @for (h of [6, 24, 168]; track h) {
              <button type="button" [attr.aria-pressed]="hours() === h" (click)="hours.set(h)">
                {{ h === 168 ? '7 d' : h + ' h' }}
              </button>
            }
          </div>
        </header>
        <div class="panel__body stack">
          @if (points('cpuPercent').length > 2) {
            <h3 class="chart-title">CPU %</h3>
            <app-line-chart
              [points]="points('cpuPercent')"
              [bucketMinutes]="bucket()"
              unit=" %"
              [height]="120"
              label="CPU"
            />
            <h3 class="chart-title">Memory %</h3>
            <app-line-chart
              [points]="points('memoryPercent')"
              [bucketMinutes]="bucket()"
              unit=" %"
              [height]="120"
              label="Memory"
            />
            <h3 class="chart-title">Temperature °C</h3>
            <app-line-chart
              [points]="points('temperatureC')"
              [bucketMinutes]="bucket()"
              unit=" °C"
              [height]="120"
              label="Temperature"
            />
          } @else {
            <app-empty-state
              title="Collecting samples"
              description="One sample is stored every minute."
            />
          }
        </div>
      </section>
    </div>
  `,
  styles: `
    .page-title {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--space-2);
      font-size: var(--text-xs);
    }
    .health {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
    }
    .health__cell {
      display: grid;
      align-content: start;
      gap: 5px;
      padding: var(--space-3) var(--space-4);
      border-right: 1px solid var(--color-border);
    }
    .health__name {
      font-size: var(--text-2xs);
      font-weight: var(--weight-semibold);
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: var(--color-text-tertiary);
    }
    .health__value {
      font-size: 1.25rem;
      white-space: nowrap;
      small {
        font-size: var(--text-sm);
        color: var(--color-text-tertiary);
      }
    }
    .health__note {
      font-size: var(--text-xs);
      color: var(--color-text-secondary);
    }
    .disk {
      display: grid;
      grid-template-columns: 90px 1fr auto;
      align-items: center;
      gap: var(--space-3);
      font-size: var(--text-sm);
    }
    .disk__bar {
      height: 8px;
      border-radius: 4px;
      background: var(--color-surface-hover);
      overflow: hidden;
      span {
        display: block;
        height: 100%;
        background: var(--color-accent);
      }
      span.is-warn {
        background: var(--color-error);
      }
    }
    .chart-title {
      font-size: var(--text-xs);
      color: var(--color-text-secondary);
      font-weight: var(--weight-medium);
    }
  `,
})
export class ServerPage {
  protected readonly status = httpResource<ServerStatus>(() => apiUrl('/server/status'));
  protected readonly hours = signal(24);
  protected readonly history = httpResource<ServerHistory>(() => ({
    url: apiUrl('/server/history'),
    params: { hours: this.hours() },
  }));
  /** Chart buckets sized so a range shows a few hundred points at most. */
  protected readonly bucket = computed(() => Math.max(1, Math.ceil((this.hours() * 60) / 300)));
  protected readonly bytes = (value: number | null) => (value === null ? '—' : formatBytes(value));
  protected readonly duration = formatDuration;

  constructor() {
    pollWhileVisible(() => {
      this.status.reload();
      this.history.reload();
    }, 60_000);
  }

  protected points(field: 'cpuPercent' | 'memoryPercent' | 'temperatureC') {
    return this.history.hasValue()
      ? this.history.value().points.map((p) => ({ at: p.at, value: p[field] }))
      : [];
  }
}
