import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { formatDateTime } from '../util/format';

export interface AvailabilityBucket {
  at: string;
  checks: number;
  successes: number;
}

/**
 * One cell per time bucket across the whole window: green when every check succeeded, amber when
 * some failed, red when all failed, and empty where nothing was recorded.
 */
@Component({
  selector: 'app-availability-strip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cells" role="img" [attr.aria-label]="summary()">
      @for (cell of cells(); track cell.start) {
        <span class="cell" [class]="cell.state" [title]="cell.title"></span>
      }
    </div>
    <div class="legend">
      <span>{{ startLabel() }}</span>
      <span class="keys">
        <span><i class="cell up"></i>Up</span>
        <span><i class="cell partial"></i>Partial</span>
        <span><i class="cell down"></i>Down</span>
        <span><i class="cell none"></i>No data</span>
      </span>
      <span>now</span>
    </div>
  `,
  styles: `
    :host {
      display: grid;
      gap: 6px;
    }
    .cells {
      display: flex;
      gap: 1px;
      min-width: 0;
      height: 18px;
    }
    .cell {
      flex: 1 1 0;
      min-width: 0;
      border-radius: 1px;
      background: var(--color-surface-hover);
    }
    .cell.up {
      background: var(--color-ok);
      opacity: 0.75;
    }
    .cell.partial {
      background: var(--color-warning);
    }
    .cell.down {
      background: var(--color-error);
    }
    .cell.none {
      background: var(--color-surface-hover);
    }
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      justify-content: space-between;
      font-size: var(--text-2xs);
      color: var(--color-text-tertiary);
      font-family: var(--font-mono);
    }
    .keys {
      display: flex;
      gap: var(--space-3);
      font-family: var(--font-sans);
    }
    .keys span {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .keys i {
      display: inline-block;
      width: 8px;
      height: 8px;
    }
  `,
})
export class AvailabilityStrip {
  readonly buckets = input.required<AvailabilityBucket[]>();
  readonly hours = input.required<number>();
  readonly cellCount = input(96);

  protected readonly cells = computed(() => {
    const end = Date.now();
    const span = (this.hours() * 3_600_000) / this.cellCount();
    const start = end - this.hours() * 3_600_000;
    const cells = Array.from({ length: this.cellCount() }, (_, i) => ({
      start: start + i * span,
      checks: 0,
      successes: 0,
    }));
    for (const bucket of this.buckets()) {
      const index = Math.floor((new Date(bucket.at).getTime() - start) / span);
      const cell = cells[Math.min(Math.max(index, 0), cells.length - 1)]!;
      cell.checks += bucket.checks;
      cell.successes += bucket.successes;
    }
    return cells.map((cell) => {
      const state =
        cell.checks === 0
          ? 'none'
          : cell.successes === cell.checks
            ? 'up'
            : cell.successes === 0
              ? 'down'
              : 'partial';
      return {
        start: cell.start,
        state,
        title:
          `${formatDateTime(new Date(cell.start))}: ` +
          (cell.checks === 0
            ? 'no checks recorded'
            : `${cell.successes}/${cell.checks} checks succeeded`),
      };
    });
  });

  protected readonly summary = computed(() => {
    const cells = this.cells();
    const down = cells.filter((cell) => cell.state === 'down').length;
    const partial = cells.filter((cell) => cell.state === 'partial').length;
    return `Availability over ${this.hours()} hours: ${down} down and ${partial} partial intervals`;
  });

  protected readonly startLabel = computed(() =>
    this.hours() >= 48 ? `${Math.round(this.hours() / 24)} d ago` : `${this.hours()} h ago`,
  );
}
