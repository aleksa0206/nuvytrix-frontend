import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Service,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  warnings?: string[];
}

/** Opens the single app-wide confirmation dialog and resolves with the user's choice. */
@Service()
export class ConfirmService {
  readonly pending = signal<(ConfirmRequest & { resolve: (ok: boolean) => void }) | null>(null);

  ask(request: ConfirmRequest): Promise<boolean> {
    this.pending()?.resolve(false);
    return new Promise((resolve) => this.pending.set({ ...request, resolve }));
  }

  settle(ok: boolean) {
    this.pending()?.resolve(ok);
    this.pending.set(null);
  }
}

@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dialog (close)="confirm.settle(false)" aria-labelledby="confirm-title">
      @if (confirm.pending(); as request) {
        <h2 id="confirm-title">{{ request.title }}</h2>
        <p class="message">{{ request.message }}</p>
        @for (warning of request.warnings ?? []; track warning) {
          <p class="notice notice--warning">{{ warning }}</p>
        }
        <div class="actions">
          <button type="button" class="btn" (click)="confirm.settle(false)">Cancel</button>
          <button
            type="button"
            class="btn"
            [class.btn--danger]="request.danger"
            [class.btn--primary]="!request.danger"
            (click)="confirm.settle(true)"
          >
            {{ request.confirmLabel }}
          </button>
        </div>
      }
    </dialog>
  `,
  styles: `
    dialog {
      width: min(460px, calc(100vw - 32px));
      padding: var(--space-5);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius);
      background: var(--color-surface-raised);
      color: var(--color-text);
    }
    dialog::backdrop {
      background: rgb(0 0 0 / 55%);
    }
    .message {
      margin: var(--space-2) 0 var(--space-4);
      color: var(--color-text-secondary);
    }
    .notice {
      margin-bottom: var(--space-3);
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-2);
    }
  `,
})
export class ConfirmDialog {
  protected readonly confirm = inject(ConfirmService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const element = this.dialog().nativeElement;
      if (this.confirm.pending() && !element.open) element.showModal();
      if (!this.confirm.pending() && element.open) element.close();
    });
  }
}
