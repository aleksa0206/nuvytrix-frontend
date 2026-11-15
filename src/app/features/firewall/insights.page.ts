import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DIRECTION_LABELS, type FirewallDirection } from '../../core/models/firewall.model';
import { FirewallService } from '../../core/services/firewall.service';
import { EmptyState, LoadError, Loading } from '../../shared/ui/feedback';
import { DateTimePipe, NumberPipe } from '../../shared/util/format.pipes';

@Component({
  selector: 'app-firewall-insights-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, EmptyState, LoadError, Loading, DateTimePipe, NumberPipe],
  templateUrl: './insights.page.html',
  styles: `
    .timeline {
      display: flex;
      align-items: flex-end;
      gap: 1px;
      height: 80px;
    }
    .bar {
      display: flex;
      flex: 1;
      flex-direction: column;
      justify-content: flex-end;
      min-width: 1px;
      height: 100%;
    }
    .denied {
      background: var(--color-error);
      opacity: 0.8;
    }
    .accepted {
      background: var(--color-ok);
      opacity: 0.8;
    }
    .legend {
      display: flex;
      gap: var(--space-4);
      font-size: var(--text-xs);
      color: var(--color-text-tertiary);
    }
    .interpretation {
      white-space: normal;
      min-width: 280px;
      color: var(--color-text-secondary);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
      gap: var(--space-4);
    }
    @media (width < 720px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class InsightsPage {
  private readonly firewall = inject(FirewallService);
  protected readonly summary = this.firewall.summaryResource();
  protected readonly insights = this.firewall.insightsResource();

  /** Bar heights for the hourly timeline, scaled to the busiest hour. */
  protected readonly bars = computed(() => {
    if (!this.summary.hasValue()) return [];
    const summary = this.summary.value();
    if (!summary.hasData) return [];
    const max = Math.max(1, ...summary.timeline.map((hour) => hour.denied + hour.accepted));
    return summary.timeline.map((hour) => ({
      bucket: hour.bucket,
      denied: (hour.denied / max) * 100,
      accepted: (hour.accepted / max) * 100,
      title: `${hour.denied} denied, ${hour.accepted} accepted`,
    }));
  });

  protected directions(list: FirewallDirection[]): string {
    return list.map((direction) => DIRECTION_LABELS[direction]).join(', ') || '—';
  }
}
