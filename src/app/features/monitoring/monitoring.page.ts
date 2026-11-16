import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toApiError } from '../../core/api/api-error';
import { pollWhileVisible } from '../../core/polling';
import type { MonitoringTarget, SeriesPoint } from '../../core/models/system.model';
import { SystemService } from '../../core/services/system.service';
import { AvailabilityStrip } from '../../shared/ui/availability-strip';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { EmptyState, LoadError, Loading } from '../../shared/ui/feedback';
import { LineChart } from '../../shared/ui/line-chart';
import { PageHeader } from '../../shared/ui/page-header';
import { StateBadge } from '../../shared/ui/state-badge';
import { DateTimePipe, RelativePipe } from '../../shared/util/format.pipes';

const HOST = /^[a-zA-Z0-9]([a-zA-Z0-9.:-]{0,252})$/;
const URL_PATTERN = /^https?:\/\/[^\s/@]+(\/\S*)?$/;

interface WindowStats {
  checks: number;
  uptime: number | null;
  avgLatency: number | null;
  maxLatency: number | null;
  avgLoss: number | null;
}

@Component({
  selector: 'app-monitoring-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    PageHeader,
    StateBadge,
    EmptyState,
    LoadError,
    Loading,
    LineChart,
    AvailabilityStrip,
    RelativePipe,
    DateTimePipe,
  ],
  templateUrl: './monitoring.page.html',
  styleUrl: './monitoring.page.scss',
})
export class MonitoringPage {
  private readonly system = inject(SystemService);
  private readonly confirm = inject(ConfirmService);

  protected readonly targets = this.system.targetsResource();
  protected readonly selectedId = signal<number | undefined>(undefined);
  protected readonly hours = signal(24);
  // Twice the visible window, so the current period can be compared with the one before it.
  protected readonly series = this.system.seriesResource(this.selectedId, () => this.hours() * 2);
  protected readonly ranges = [
    { hours: 1, label: '1 h' },
    { hours: 6, label: '6 h' },
    { hours: 24, label: '24 h' },
    { hours: 24 * 7, label: '7 d' },
    { hours: 24 * 30, label: '30 d' },
  ];

  protected readonly selected = computed(() =>
    this.targets.hasValue()
      ? this.targets.value().find((t) => t.id === this.selectedId())
      : undefined,
  );

  private readonly split = computed(() => {
    const points = this.series.hasValue() ? this.series.value().points : [];
    const cutoff = Date.now() - this.hours() * 3_600_000;
    return {
      current: points.filter((p) => new Date(p.at).getTime() >= cutoff),
      previous: points.filter((p) => new Date(p.at).getTime() < cutoff),
    };
  });

  protected readonly current = computed(() => this.split().current);
  protected readonly stats = computed(() => ({
    current: summarize(this.split().current),
    previous: summarize(this.split().previous),
  }));
  protected readonly latencyPoints = computed(() =>
    this.current().map((p) => ({ at: p.at, value: p.avgLatencyMs, max: p.maxLatencyMs })),
  );
  protected readonly lossPoints = computed(() =>
    this.current().map((p) => ({ at: p.at, value: p.avgPacketLossPercent })),
  );
  protected readonly hasLoss = computed(() => this.lossPoints().some((p) => p.value !== null));
  protected readonly jitterPoints = computed(() =>
    this.current().map((p) => ({ at: p.at, value: p.avgJitterMs })),
  );
  protected readonly hasJitter = computed(() => this.jitterPoints().some((p) => p.value !== null));
  protected readonly outages = this.system.outagesResource(this.selectedId, () =>
    Math.max(1, Math.ceil(this.hours() / 24)),
  );
  protected readonly kindLabel = { icmp: 'PING', dns: 'DNS', http: 'HTTP' } as const;

  /** Days until an HTTPS certificate expires. */
  protected certDays(iso: string): number {
    return Math.floor((new Date(iso).getTime() - Date.now()) / 86_400_000);
  }

  protected duration(seconds: number): string {
    if (seconds < 120) return `${seconds} s`;
    if (seconds < 7200) return `${Math.round(seconds / 60)} min`;
    return `${Math.round(seconds / 360) / 10} h`;
  }

  protected readonly showForm = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    kind: ['icmp' as 'icmp' | 'dns' | 'http'],
    host: ['', [Validators.required, Validators.pattern(HOST)]],
    dnsQueryName: ['example.com'],
  });

  constructor() {
    // Select the first target once the list arrives, so the page never opens on an empty detail.
    effect(() => {
      if (
        this.selectedId() === undefined &&
        this.targets.hasValue() &&
        this.targets.value().length > 0
      ) {
        this.selectedId.set(this.targets.value()[0]!.id);
      }
    });
    pollWhileVisible(() => {
      this.targets.reload();
      this.series.reload();
      this.outages.reload();
    }, 30_000);
    // The host field means a URL for HTTP targets and an IP or hostname otherwise.
    this.form.controls.kind.valueChanges.subscribe((kind) => {
      this.form.controls.host.setValidators([
        Validators.required,
        Validators.pattern(kind === 'http' ? URL_PATTERN : HOST),
      ]);
      this.form.controls.host.updateValueAndValidity();
    });
  }

  protected metric(value: number | null | undefined, unit: string): string {
    return value === null || value === undefined ? '—' : value + unit;
  }

  /** Signed change against the previous window, or null when either side has no data. */
  protected delta(current: number | null, previous: number | null): number | null {
    if (current === null || previous === null) return null;
    return Math.round((current - previous) * 100) / 100;
  }

  protected create() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.formError.set(null);
    this.system
      .createTarget({
        name: value.name.trim(),
        kind: value.kind,
        host: value.host.trim(),
        dnsQueryName: value.kind === 'dns' ? value.dnsQueryName.trim() : null,
      })
      .subscribe({
        next: (target) => {
          this.showForm.set(false);
          this.form.reset();
          this.targets.reload();
          this.selectedId.set(target.id);
        },
        error: (err: unknown) => this.formError.set(toApiError(err).message),
      });
  }

  protected checkNow(target: MonitoringTarget) {
    this.actionError.set(null);
    this.system.checkTarget(target.id).subscribe({
      next: () => {
        this.targets.reload();
        this.series.reload();
      },
      error: (err: unknown) => this.actionError.set(toApiError(err).message),
    });
  }

  protected toggleEnabled(target: MonitoringTarget) {
    this.system.updateTarget(target.id, { enabled: !target.enabled }).subscribe({
      next: () => this.targets.reload(),
      error: (err: unknown) => this.actionError.set(toApiError(err).message),
    });
  }

  protected async remove(target: MonitoringTarget) {
    const confirmed = await this.confirm.ask({
      title: `Delete “${target.name}”?`,
      message: 'The target and all of its recorded measurements are deleted.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!confirmed) return;
    this.system.deleteTarget(target.id).subscribe({
      next: () => {
        this.selectedId.set(undefined);
        this.targets.reload();
      },
      error: (err: unknown) => this.actionError.set(toApiError(err).message),
    });
  }
}

/** Check-weighted statistics over a set of buckets; null where nothing was measured. */
function summarize(points: SeriesPoint[]): WindowStats {
  const checks = points.reduce((sum, p) => sum + p.checks, 0);
  const successes = points.reduce((sum, p) => sum + p.successes, 0);
  const weighted = (pick: (p: SeriesPoint) => number | null) => {
    const measured = points.filter((p) => pick(p) !== null);
    const weight = measured.reduce((sum, p) => sum + p.checks, 0);
    return weight === 0
      ? null
      : Math.round((measured.reduce((sum, p) => sum + pick(p)! * p.checks, 0) / weight) * 100) /
          100;
  };
  const maxima = points.map((p) => p.maxLatencyMs).filter((v): v is number => v !== null);
  return {
    checks,
    uptime: checks === 0 ? null : Math.round((successes / checks) * 10000) / 100,
    avgLatency: weighted((p) => p.avgLatencyMs),
    maxLatency: maxima.length ? Math.max(...maxima) : null,
    avgLoss: weighted((p) => p.avgPacketLossPercent),
  };
}
