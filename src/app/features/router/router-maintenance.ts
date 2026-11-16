import { HttpClient, httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { apiUrl } from '../../core/api/http';
import { toApiError } from '../../core/api/api-error';
import { EmptyState, LoadError, Loading } from '../../shared/ui/feedback';

interface DiagnosticsResult {
  state: string;
  output: string;
}

/** Ping and traceroute run by the router, and the router's user log. */
@Component({
  selector: 'app-router-maintenance',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, EmptyState, LoadError, Loading],
  styleUrl: './router-firewall.scss',
  host: { class: 'stack' },
  template: `
    <section class="panel">
      <header class="panel__header">
        <h2>Test from the router</h2>
        <span class="panel__meta">ping or traceroute run by the router itself</span>
      </header>
      <form class="panel__body toolbar" (submit)="$event.preventDefault(); run()">
        <label class="visually-hidden" for="diag-kind">Test</label>
        <select id="diag-kind" class="select" name="kind" [(ngModel)]="kind">
          <option value="ping">Ping</option>
          <option value="traceroute">Traceroute</option>
        </select>
        <label class="visually-hidden" for="diag-host">Host</label>
        <input
          id="diag-host"
          class="input mono"
          name="host"
          [(ngModel)]="host"
          placeholder="1.1.1.1 or example.com"
          maxlength="255"
        />
        <button type="submit" class="btn btn--primary" [disabled]="running() || !host.trim()">
          {{ running() ? 'Running on the router…' : 'Run' }}
        </button>
      </form>
      @if (error()) {
        <p class="panel__body notice notice--error" role="alert">{{ error() }}</p>
      }
      @if (result(); as r) {
        <div class="panel__body">
          <p class="field__hint">
            {{
              r.state === 'Complete'
                ? 'Finished'
                : r.state === 'Complete_Err'
                  ? 'Failed'
                  : 'Still running when Nuvytrix stopped waiting'
            }}
          </p>
          <pre class="mono">{{ r.output || '(no output)' }}</pre>
        </div>
      }
    </section>

    <section class="panel">
      <header class="panel__header">
        <h2>Router log</h2>
        <span class="panel__meta">configuration, shell and alarm entries kept by the router</span>
      </header>
      @if (log.isLoading() && !log.hasValue()) {
        <app-loading />
      }
      @if (log.error(); as e) {
        <app-load-error [error]="e" (retry)="log.reload()" />
      }
      @if (log.hasValue()) {
        @if (log.value().entries.length === 0) {
          <app-empty-state title="The router log is empty" />
        } @else {
          <pre class="panel__body mono">{{ log.value().entries.join('\\n') }}</pre>
        }
      }
    </section>
  `,
})
export class RouterMaintenance {
  private readonly http = inject(HttpClient);

  protected readonly log = httpResource<{ entries: string[] }>(() => apiUrl('/router/user-log'));
  protected kind: 'ping' | 'traceroute' = 'ping';
  protected host = '';
  protected readonly running = signal(false);
  protected readonly result = signal<DiagnosticsResult | null>(null);
  protected readonly error = signal<string | null>(null);

  protected run() {
    this.error.set(null);
    this.result.set(null);
    this.running.set(true);
    this.http
      .post<DiagnosticsResult>(apiUrl('/router/diagnostics'), {
        kind: this.kind,
        host: this.host.trim(),
      })
      .subscribe({
        next: (result) => {
          this.running.set(false);
          this.result.set(result);
        },
        error: (err: unknown) => {
          this.running.set(false);
          this.error.set(toApiError(err).message);
        },
      });
  }
}
