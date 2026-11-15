import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { Paginated } from '../../core/models/api.models';
import { NumberPipe } from '../util/format.pipes';

@Component({
  selector: 'app-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NumberPipe],
  template: `
    <span class="summary">
      @if (meta().total === 0) {
        No results
      } @else {
        {{ (meta().page - 1) * meta().pageSize + 1 | num }}–{{
          Math.min(meta().page * meta().pageSize, meta().total) | num
        }}
        of {{ meta().total | num }}
      }
    </span>
    <span class="controls">
      <button
        type="button"
        class="btn btn--sm"
        [disabled]="meta().page <= 1"
        (click)="pageChange.emit(meta().page - 1)"
      >
        Previous
      </button>
      <button
        type="button"
        class="btn btn--sm"
        [disabled]="meta().page >= meta().totalPages"
        (click)="pageChange.emit(meta().page + 1)"
      >
        Next
      </button>
    </span>
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      padding: var(--space-2) var(--space-4);
      border-top: 1px solid var(--color-border);
      font-size: var(--text-sm);
      color: var(--color-text-secondary);
      font-variant-numeric: tabular-nums;
    }
    .controls {
      display: flex;
      gap: var(--space-2);
    }
  `,
})
export class Pagination {
  readonly meta = input.required<Paginated<unknown>['meta']>();
  readonly pageChange = output<number>();
  protected readonly Math = Math;
}
