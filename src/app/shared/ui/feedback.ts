import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { toApiError } from '../../core/api/api-error';

/** Explains why there is nothing to show and, through ng-content, what to do next. */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="title">{{ title() }}</p>
    @if (description()) {
      <p class="description">{{ description() }}</p>
    }
    <div class="actions"><ng-content /></div>
  `,
  styles: `
    :host {
      display: grid;
      justify-items: center;
      gap: var(--space-1);
      padding: var(--space-8) var(--space-4);
      text-align: center;
    }
    .title {
      font-weight: var(--weight-medium);
    }
    .description {
      max-width: 52ch;
      color: var(--color-text-secondary);
      font-size: var(--text-sm);
    }
    .actions:not(:empty) {
      margin-top: var(--space-3);
    }
  `,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly description = input<string>();
}

/** Load failure with the server's message and a retry button. */
@Component({
  selector: 'app-load-error',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p role="alert">{{ message() }}</p>
    <button type="button" class="btn btn--sm" (click)="retry.emit()">Try again</button>
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      border-left: 3px solid var(--color-error);
      background: var(--color-error-subtle);
      font-size: var(--text-sm);
    }
  `,
})
export class LoadError {
  readonly error = input.required<unknown>();
  readonly retry = output<void>();
  protected readonly message = computed(() => toApiError(this.error()).message);
}

@Component({
  selector: 'app-loading',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="bar" aria-hidden="true"></span
    ><span class="visually-hidden">Loading</span>`,
  styles: `
    :host {
      display: block;
      height: 2px;
      overflow: hidden;
    }
    .bar {
      display: block;
      height: 100%;
      width: 30%;
      background: var(--color-accent);
      animation: slide 1s ease-in-out infinite;
    }
    @keyframes slide {
      from {
        transform: translateX(-100%);
      }
      to {
        transform: translateX(340%);
      }
    }
  `,
})
export class Loading {}
