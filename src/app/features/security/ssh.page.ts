import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { apiUrl } from '../../core/api/http';
import { pollWhileVisible } from '../../core/polling';
import { EmptyState, LoadError, Loading } from '../../shared/ui/feedback';
import { DateTimePipe, RelativePipe } from '../../shared/util/format.pipes';

type Source = 'tailscale' | 'lan' | 'internet' | 'unknown';

interface SshSummary {
  hours: number;
  enabled: boolean;
  lastRun: string | null;
  error: { at: string; message: string } | null;
  accepted: number;
  failed: number;
  sources: { ip: string; kind: Source; accepted: number; failed: number; lastAt: string }[];
  recent: {
    at: string;
    kind: 'accepted' | 'failed' | 'invalid_user';
    username: string | null;
    ip: string | null;
    source: Source;
    method: string | null;
  }[];
}

const SOURCE_LABELS: Record<Source, string> = {
  tailscale: 'Tailscale',
  lan: 'LAN',
  internet: 'Internet',
  unknown: '—',
};

/** SSH logins to the server, read from its auth.log. */
@Component({
  selector: 'app-ssh-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoadError, Loading, EmptyState, DateTimePipe, RelativePipe],
  template: `
    <div class="page">
      <header class="page-title">
        <h1>SSH logins</h1>
        <div class="segmented" role="group" aria-label="Time range">
          @for (h of [24, 168, 720]; track h) {
            <button type="button" [attr.aria-pressed]="hours() === h" (click)="hours.set(h)">
              {{ h === 24 ? '24 h' : h === 168 ? '7 d' : '30 d' }}
            </button>
          }
        </div>
      </header>

      @if (ssh.isLoading() && !ssh.hasValue()) {
        <app-loading />
      }
      @if (ssh.error(); as e) {
        <app-load-error [error]="e" (retry)="ssh.reload()" />
      }
      @if (ssh.hasValue()) {
        @let s = ssh.value();
        @if (!s.enabled) {
          <app-empty-state title="SSH monitoring is off" description="Set SSH_AUTH_LOG." />
        } @else {
          @if (s.error) {
            <p class="notice notice--error" role="alert">
              Could not read auth.log: {{ s.error.message }}
            </p>
          }
          <section class="panel">
            <div class="panel__body figures">
              <div>
                <span class="label">Successful</span><strong class="mono">{{ s.accepted }}</strong>
              </div>
              <div>
                <span class="label">Failed</span
                ><strong class="mono" [class.text-error]="s.failed > 0">{{ s.failed }}</strong>
              </div>
              <div>
                <span class="label">Read</span
                ><span>{{ s.lastRun ? (s.lastRun | relative) : 'never' }}</span>
              </div>
            </div>
          </section>

          <section class="panel">
            <header class="panel__header"><h2>Sources</h2></header>
            @if (s.sources.length === 0) {
              <p class="panel__body text-tertiary">No SSH activity in this period.</p>
            } @else {
              <div class="table-wrap">
                <table class="table table--compact">
                  <thead>
                    <tr>
                      <th scope="col">Address</th>
                      <th scope="col">From</th>
                      <th scope="col" class="num">Successful</th>
                      <th scope="col" class="num">Failed</th>
                      <th scope="col">Last</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (src of s.sources; track src.ip) {
                      <tr>
                        <td class="mono">{{ src.ip }}</td>
                        <td>
                          <span class="chip" [class.chip--deny]="src.kind === 'internet'">{{
                            labels[src.kind]
                          }}</span>
                        </td>
                        <td class="num mono">{{ src.accepted }}</td>
                        <td class="num mono">{{ src.failed }}</td>
                        <td>{{ src.lastAt | relative }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </section>

          <section class="panel">
            <header class="panel__header"><h2>Latest events</h2></header>
            <div class="table-wrap">
              <table class="table table--compact">
                <tbody>
                  @for (e of s.recent; track $index) {
                    <tr>
                      <td>{{ e.at | dateTime }}</td>
                      <td>
                        <span
                          class="chip"
                          [class.chip--accept]="e.kind === 'accepted'"
                          [class.chip--deny]="e.kind !== 'accepted'"
                          >{{
                            e.kind === 'accepted'
                              ? 'LOGIN'
                              : e.kind === 'failed'
                                ? 'FAILED'
                                : 'INVALID USER'
                          }}</span
                        >
                      </td>
                      <td>{{ e.username ?? '—' }}</td>
                      <td class="mono">
                        {{ e.ip ?? '—' }}
                        <small class="text-tertiary">{{ labels[e.source] }}</small>
                      </td>
                      <td class="text-tertiary">{{ e.method ?? '' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
        }
      }
    </div>
  `,
  styles: `
    .page-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
    }
    .figures {
      display: flex;
      gap: var(--space-6);
      div {
        display: grid;
        gap: 2px;
      }
      .label {
        font-size: var(--text-2xs);
        text-transform: uppercase;
        letter-spacing: 0.07em;
        color: var(--color-text-tertiary);
      }
      strong {
        font-size: 1.25rem;
      }
    }
    .text-error {
      color: var(--color-error);
    }
  `,
})
export class SshPage {
  protected readonly hours = signal(24);
  protected readonly ssh = httpResource<SshSummary>(() => ({
    url: apiUrl('/security/ssh'),
    params: { hours: this.hours() },
  }));
  protected readonly labels = SOURCE_LABELS;

  constructor() {
    pollWhileVisible(() => this.ssh.reload(), 60_000);
  }
}
