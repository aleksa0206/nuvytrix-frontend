import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { apiUrl } from '../../core/api/http';
import { pollWhileVisible } from '../../core/polling';
import { StateBadge } from '../../shared/ui/state-badge';
import { RelativePipe } from '../../shared/util/format.pipes';

interface Integration {
  name: string;
  state: 'ok' | 'warning' | 'error' | 'off';
  lastSuccessAt: string | null;
  detail: string;
  error: string | null;
}

const BADGE = {
  ok: 'operational',
  warning: 'warning',
  error: 'error',
  off: 'not_configured',
} as const;

/** Health of every integration: last success, state and latest error. */
@Component({
  selector: 'app-integrations-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StateBadge, RelativePipe],
  template: `
    <section class="panel">
      <header class="panel__header">
        <h2>Integrations</h2>
        <span class="panel__meta">checked now</span>
      </header>
      @if (items.hasValue()) {
        <table class="table table--compact">
          <tbody>
            @for (i of items.value(); track i.name) {
              <tr>
                <td>
                  <strong>{{ i.name }}</strong>
                  <small class="text-tertiary"> {{ i.detail }}</small>
                </td>
                <td><app-state-badge [state]="badge[i.state]" /></td>
                <td>{{ i.lastSuccessAt ? 'ok ' + (i.lastSuccessAt | relative) : '—' }}</td>
                <td class="text-secondary">{{ i.error ?? '' }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
})
export class IntegrationsPanel {
  protected readonly items = httpResource<Integration[]>(() => apiUrl('/integrations'));
  protected readonly badge = BADGE;

  constructor() {
    pollWhileVisible(() => this.items.reload(), 60_000);
  }
}
