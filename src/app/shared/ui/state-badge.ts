import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

type Tone = 'ok' | 'warning' | 'error' | 'unknown' | 'muted' | 'accent';

const STATES: Record<string, { tone: Tone; label: string }> = {
  operational: { tone: 'ok', label: 'Operational' },
  warning: { tone: 'warning', label: 'Warning' },
  error: { tone: 'error', label: 'Error' },
  unknown: { tone: 'unknown', label: 'Unknown' },
  not_configured: { tone: 'muted', label: 'Not configured' },
  up: { tone: 'ok', label: 'Up' },
  degraded: { tone: 'warning', label: 'Degraded' },
  down: { tone: 'error', label: 'Down' },
  disabled: { tone: 'muted', label: 'Disabled' },
  online: { tone: 'ok', label: 'Online' },
  offline: { tone: 'muted', label: 'Offline' },
  running: { tone: 'accent', label: 'Running' },
  completed: { tone: 'ok', label: 'Completed' },
  failed: { tone: 'error', label: 'Failed' },
  accept: { tone: 'ok', label: 'Accept' },
  deny: { tone: 'error', label: 'Deny' },
  implemented: { tone: 'ok', label: 'Implemented' },
  partial: { tone: 'warning', label: 'Partial' },
  requires_hardware: { tone: 'muted', label: 'Requires hardware' },
  requires_router_support: { tone: 'muted', label: 'Requires router support' },
  planned: { tone: 'unknown', label: 'Planned' },
  draft: { tone: 'muted', label: 'Draft (app only)' },
  pending_manual: { tone: 'warning', label: 'Waiting for manual apply' },
  marked_applied: { tone: 'ok', label: 'Marked applied (unverified)' },
  apply_failed: { tone: 'error', label: 'Apply failed' },
  retired: { tone: 'unknown', label: 'Retired' },
};

/** Dot + label for any state value the API returns. Color is never the only signal. */
@Component({
  selector: 'app-state-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="dot" aria-hidden="true"></span>{{ label() ?? meta().label }}`,
  host: { '[class]': '"tone-" + meta().tone' },
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: var(--text-sm);
      white-space: nowrap;
      color: var(--color-text-secondary);
    }
    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--tone);
      flex: none;
    }
    :host(.tone-ok) {
      --tone: var(--color-ok);
    }
    :host(.tone-warning) {
      --tone: var(--color-warning);
    }
    :host(.tone-error) {
      --tone: var(--color-error);
    }
    :host(.tone-unknown) {
      --tone: var(--color-unknown);
    }
    :host(.tone-accent) {
      --tone: var(--color-accent);
    }
    :host(.tone-muted) {
      --tone: transparent;
    }
    :host(.tone-muted) .dot {
      box-shadow: inset 0 0 0 1.5px var(--color-text-tertiary);
    }
  `,
})
export class StateBadge {
  readonly state = input.required<string>();
  readonly label = input<string>();
  protected readonly meta = computed(
    () => STATES[this.state()] ?? { tone: 'unknown' as Tone, label: this.state() },
  );
}
