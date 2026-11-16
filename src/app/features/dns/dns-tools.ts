import { HttpClient, httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { apiUrl } from '../../core/api/http';
import { toApiError } from '../../core/api/api-error';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { DateTimePipe } from '../../shared/util/format.pipes';

interface Query {
  at: string;
  client: string;
  clientName: string | null;
  domain: string | null;
  type: string | null;
  blocked: boolean;
  reason: string | null;
  elapsedMs: number | null;
}

interface DnsRule {
  domain: string;
  action: 'allow' | 'block';
}

/** Latest DNS queries and the allow/block rules, managed in AdGuard Home. */
@Component({
  selector: 'app-dns-tools',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DateTimePipe],
  template: `
    <section class="panel">
      <header class="panel__header">
        <h2>Allow and block rules</h2>
        <span class="panel__meta">single domains, applied by AdGuard Home at once</span>
      </header>
      <form class="panel__body toolbar" (submit)="$event.preventDefault(); add()">
        <label class="visually-hidden" for="rule-domain">Domain</label>
        <input
          id="rule-domain"
          class="input mono"
          name="domain"
          [(ngModel)]="domain"
          placeholder="example.com"
          maxlength="253"
        />
        <select class="select" name="action" [(ngModel)]="action" aria-label="Rule">
          <option value="block">Block</option>
          <option value="allow">Allow (never block)</option>
        </select>
        <button type="submit" class="btn btn--primary" [disabled]="busy() || !domain.trim()">
          Add
        </button>
      </form>
      @if (error()) {
        <p class="panel__body notice notice--error" role="alert">{{ error() }}</p>
      }
      @if (rules.hasValue()) {
        @let r = rules.value();
        @if (r.rules.length === 0) {
          <p class="panel__body text-tertiary">No rules yet.</p>
        } @else {
          <table class="table table--compact">
            <tbody>
              @for (rule of r.rules; track rule.domain + rule.action) {
                <tr>
                  <td class="mono">{{ rule.domain }}</td>
                  <td>
                    <span
                      class="chip"
                      [class.chip--accept]="rule.action === 'allow'"
                      [class.chip--deny]="rule.action === 'block'"
                      >{{ rule.action === 'allow' ? 'ALLOW' : 'BLOCK' }}</span
                    >
                  </td>
                  <td class="row-actions">
                    <button
                      type="button"
                      class="btn btn--sm btn--ghost"
                      [disabled]="busy()"
                      (click)="remove(rule)"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
        @if (r.otherRules.length) {
          <p class="panel__body field__hint">
            {{ r.otherRules.length }} other custom rule(s) are kept as they are (edit them in
            AdGuard Home).
          </p>
        }
      }
    </section>

    <section class="panel">
      <header class="panel__header">
        <h2>Latest queries</h2>
        <div class="toolbar">
          <input
            class="input"
            type="search"
            placeholder="Filter by domain or client"
            aria-label="Filter queries"
            [ngModel]="search()"
            (ngModelChange)="search.set($event)"
          />
          <label class="check">
            <input
              type="checkbox"
              [ngModel]="blockedOnly()"
              (ngModelChange)="blockedOnly.set($event)"
            />
            Blocked only
          </label>
        </div>
      </header>
      @if (log.hasValue()) {
        <div class="table-wrap">
          <table class="table table--compact">
            <tbody>
              @for (q of log.value(); track $index) {
                <tr>
                  <td>{{ q.at | dateTime }}</td>
                  <td>
                    {{ q.clientName ?? q.client }}
                    @if (q.clientName) {
                      <small class="text-tertiary mono">{{ q.client }}</small>
                    }
                  </td>
                  <td class="mono">
                    {{ q.domain }} <small class="text-tertiary">{{ q.type }}</small>
                  </td>
                  <td>
                    @if (q.blocked) {
                      <span class="chip chip--deny">BLOCKED</span>
                    }
                  </td>
                  <td class="num mono">{{ q.elapsedMs !== null ? q.elapsedMs + ' ms' : '' }}</td>
                  <td class="row-actions">
                    @if (q.domain) {
                      <button
                        type="button"
                        class="btn btn--sm btn--ghost"
                        [disabled]="busy()"
                        (click)="quick(q.domain, q.blocked ? 'allow' : 'block')"
                      >
                        {{ q.blocked ? 'Allow' : 'Block' }}
                      </button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td class="text-tertiary">No queries.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
  styles: `
    .check {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: var(--text-sm);
    }
  `,
})
export class DnsTools {
  private readonly http = inject(HttpClient);
  private readonly confirm = inject(ConfirmService);

  protected domain = '';
  protected action: 'allow' | 'block' = 'block';
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly blockedOnly = signal(false);

  protected readonly rules = httpResource<{ rules: DnsRule[]; otherRules: string[] }>(() =>
    apiUrl('/dns/rules'),
  );
  protected readonly log = httpResource<Query[]>(() => ({
    url: apiUrl('/dns/querylog'),
    params: {
      limit: 100,
      ...(this.search().trim() ? { search: this.search().trim() } : {}),
      ...(this.blockedOnly() ? { blocked: 'true' } : {}),
    },
  }));

  protected add() {
    this.save(
      '/dns/rules',
      { domain: this.domain.trim(), action: this.action },
      () => (this.domain = ''),
    );
  }

  protected remove(rule: DnsRule) {
    this.save('/dns/rules/delete', rule);
  }

  protected async quick(domain: string, action: 'allow' | 'block') {
    const ok = await this.confirm.ask({
      title: action === 'block' ? `Block ${domain}?` : `Always allow ${domain}?`,
      message:
        action === 'block'
          ? 'Every device using AdGuard Home will no longer reach this domain.'
          : 'AdGuard Home will never block this domain, even if a blocklist contains it.',
      confirmLabel: action === 'block' ? 'Block' : 'Allow',
      danger: action === 'block',
    });
    if (ok) this.save('/dns/rules', { domain, action });
  }

  private save(path: string, body: DnsRule, done?: () => void) {
    this.error.set(null);
    this.busy.set(true);
    this.http.post(apiUrl(path), body).subscribe({
      next: () => {
        this.busy.set(false);
        done?.();
        this.rules.reload();
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(toApiError(err).message);
      },
    });
  }
}
