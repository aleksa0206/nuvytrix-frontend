import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toApiError } from '../../core/api/api-error';
import { pollWhileVisible } from '../../core/polling';
import type { MonitoringTarget } from '../../core/models/system.model';
import { SystemService } from '../../core/services/system.service';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { EmptyState, LoadError, Loading } from '../../shared/ui/feedback';
import { LineChart } from '../../shared/ui/line-chart';
import { PageHeader } from '../../shared/ui/page-header';
import { StateBadge } from '../../shared/ui/state-badge';
import { DateTimePipe, RelativePipe } from '../../shared/util/format.pipes';

const HOST = /^[a-zA-Z0-9]([a-zA-Z0-9.:-]{0,252})$/;

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
    RelativePipe,
    DateTimePipe,
  ],
  templateUrl: './monitoring.page.html',
  styles: `
    .layout {
      display: grid;
      gap: var(--space-4);
    }
    .ranges {
      margin-left: auto;
    }
    .chart-meta {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-4);
      font-size: var(--text-xs);
      color: var(--color-text-tertiary);
    }
    .error-cell {
      max-width: 260px;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--color-error);
    }
    .actions {
      display: flex;
      gap: var(--space-1);
      justify-content: flex-end;
    }
  `,
})
export class MonitoringPage {
  private readonly system = inject(SystemService);
  private readonly confirm = inject(ConfirmService);

  protected readonly targets = this.system.targetsResource();
  protected readonly selectedId = signal<number | undefined>(undefined);
  protected readonly hours = signal(24);
  protected readonly series = this.system.seriesResource(this.selectedId, this.hours);
  protected readonly ranges = [
    { hours: 1, label: '1 h' },
    { hours: 24, label: '24 h' },
    { hours: 24 * 7, label: '7 d' },
    { hours: 24 * 30, label: '30 d' },
  ];

  protected readonly selected = computed(() =>
    this.targets.hasValue()
      ? this.targets.value().find((target) => target.id === this.selectedId())
      : undefined,
  );
  protected readonly latencyPoints = computed(() =>
    this.series.hasValue()
      ? this.series.value().points.map((point) => ({ at: point.at, value: point.avgLatencyMs }))
      : [],
  );

  protected readonly showForm = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    kind: ['icmp' as 'icmp' | 'dns'],
    host: ['', [Validators.required, Validators.pattern(HOST)]],
    dnsQueryName: ['example.com'],
  });

  constructor() {
    pollWhileVisible(() => {
      this.targets.reload();
      if (this.selectedId()) this.series.reload();
    }, 30_000);
  }

  protected metric(value: number | null | undefined, unit: string): string {
    return value === null || value === undefined ? '—' : value + unit;
  }

  protected select(target: MonitoringTarget) {
    this.selectedId.set(this.selectedId() === target.id ? undefined : target.id);
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
        next: () => {
          this.showForm.set(false);
          this.form.reset();
          this.targets.reload();
        },
        error: (err: unknown) => this.formError.set(toApiError(err).message),
      });
  }

  protected checkNow(target: MonitoringTarget) {
    this.actionError.set(null);
    this.system.checkTarget(target.id).subscribe({
      next: () => {
        this.targets.reload();
        if (this.selectedId() === target.id) this.series.reload();
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
        if (this.selectedId() === target.id) this.selectedId.set(undefined);
        this.targets.reload();
      },
      error: (err: unknown) => this.actionError.set(toApiError(err).message),
    });
  }
}
