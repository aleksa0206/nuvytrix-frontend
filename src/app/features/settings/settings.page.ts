import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { SystemService } from '../../core/services/system.service';
import { EmptyState, LoadError, Loading } from '../../shared/ui/feedback';
import { PageHeader } from '../../shared/ui/page-header';
import { Pagination } from '../../shared/ui/pagination';
import { StateBadge } from '../../shared/ui/state-badge';
import { DateTimePipe } from '../../shared/util/format.pipes';

@Component({
  selector: 'app-settings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, StateBadge, EmptyState, LoadError, Loading, Pagination, DateTimePipe],
  template: `
    <div class="page">
      <app-page-header
        title="Settings"
        description="What this installation can do on the current hardware, its configuration, and the audit log."
      />

      <section class="panel">
        <header class="panel__header"><h2>Capabilities</h2></header>
        @if (capabilities.hasValue()) {
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th scope="col">Feature</th>
                  <th scope="col">Status</th>
                  <th scope="col">Details</th>
                </tr>
              </thead>
              <tbody>
                @for (capability of capabilities.value(); track capability.feature) {
                  <tr>
                    <td>{{ capability.feature }}</td>
                    <td><app-state-badge [state]="capability.status" /></td>
                    <td class="wrap text-secondary">{{ capability.note }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else if (capabilities.error(); as error) {
          <app-load-error [error]="error" (retry)="capabilities.reload()" />
        }
      </section>

      <section class="panel">
        <header class="panel__header">
          <h2>Configuration</h2>
          <span class="text-tertiary">Set in the API environment (.env); read-only here</span>
        </header>
        @if (settings.hasValue()) {
          @let s = settings.value();
          <dl class="kv panel__body">
            <dt>Router address</dt>
            <dd class="mono">{{ s.routerHost ?? 'Not set (ROUTER_HOST)' }}</dd>
            <dt>Networks allowed for scans</dt>
            <dd class="mono">{{ s.allowedScanCidrs.join(', ') }}</dd>
            <dt>Scheduled discovery</dt>
            <dd>
              {{
                s.discoveryIntervalMinutes > 0
                  ? 'Every ' + s.discoveryIntervalMinutes + ' min'
                  : 'Off'
              }}
            </dd>
            <dt>Monitoring interval</dt>
            <dd>Every {{ s.monitoringIntervalSeconds }} s</dd>
          </dl>
        }
      </section>

      <section class="panel">
        <header class="panel__header"><h2>Audit log</h2></header>
        @if (audit.isLoading()) {
          <app-loading />
        }
        @if (audit.error(); as error) {
          <app-load-error [error]="error" (retry)="audit.reload()" />
        }
        @if (audit.hasValue()) {
          @if (audit.value().meta.total === 0) {
            <app-empty-state title="No administrative actions recorded yet" />
          } @else {
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th scope="col">Time</th>
                    <th scope="col">Action</th>
                    <th scope="col">User</th>
                    <th scope="col">Target</th>
                    <th scope="col">From</th>
                    <th scope="col">Details</th>
                  </tr>
                </thead>
                <tbody>
                  @for (entry of audit.value().data; track entry.id) {
                    <tr>
                      <td class="num">{{ entry.createdAt | dateTime }}</td>
                      <td class="mono" [class.failed]="entry.action === 'auth.login_failed'">
                        {{ entry.action }}
                      </td>
                      <td>{{ entry.username ?? '—' }}</td>
                      <td class="text-secondary">
                        {{ entry.entityType ? entry.entityType + ' #' + entry.entityId : '—' }}
                      </td>
                      <td class="mono">{{ entry.ipAddress ?? '—' }}</td>
                      <td class="mono details" [title]="details(entry.details)">
                        {{ details(entry.details) }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <app-pagination [meta]="audit.value().meta" (pageChange)="auditPage.set($event)" />
          }
        }
      </section>
    </div>
  `,
  styles: `
    .wrap {
      white-space: normal;
      min-width: 320px;
    }
    .failed {
      color: var(--color-warning);
    }
    .details {
      max-width: 340px;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--color-text-tertiary);
    }
  `,
})
export class SettingsPage {
  private readonly system = inject(SystemService);
  protected readonly capabilities = this.system.capabilitiesResource();
  protected readonly settings = this.system.settingsResource();
  protected readonly auditPage = signal(1);
  protected readonly audit = this.system.auditResource(this.auditPage);

  protected details(value: Record<string, unknown> | null): string {
    return value ? JSON.stringify(value) : '';
  }
}
