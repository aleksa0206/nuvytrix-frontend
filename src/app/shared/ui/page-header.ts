import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <h1>{{ title() }}</h1>
      @if (description()) {
        <p class="description">{{ description() }}</p>
      }
    </div>
    <div class="actions"><ng-content /></div>
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: var(--space-3);
    }
    .description {
      margin-top: var(--space-1);
      color: var(--color-text-secondary);
      font-size: var(--text-sm);
      max-width: 80ch;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly description = input<string>();
}
