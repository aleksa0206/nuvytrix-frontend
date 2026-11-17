import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { apiUrl } from '../../core/api/http';
import { StateBadge } from '../../shared/ui/state-badge';
import { formatBytes } from '../../shared/util/format';
import { DateTimePipe, RelativePipe } from '../../shared/util/format.pipes';

interface BackupStatus {
  project: string;
  files: number;
  latest: { name: string; sizeBytes: number; at: string; intact: boolean | null } | null;
  ageHours: number | null;
  state: 'ok' | 'late' | 'missing' | 'broken';
}

const LABELS: Record<BackupStatus['state'], string> = {
  ok: 'OK',
  late: 'Late',
  missing: 'No backup',
  broken: 'Unreadable',
};

/** The server's database backups on the data disk, per project. */
@Component({
  selector: 'app-server-backups',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StateBadge, DateTimePipe, RelativePipe],
  template: `
    <section class="panel">
      <header class="panel__header">
        <h2>Backups</h2>
        <span class="panel__meta">/mnt/data/backups, written nightly by the backup scripts</span>
      </header>
      @if (backups.hasValue()) {
        @let b = backups.value();
        @if (!b.enabled) {
          <p class="panel__body text-tertiary">Backup monitoring is off (BACKUP_DIR not set).</p>
        } @else if (b.error) {
          <p class="panel__body notice notice--error">
            Backup directory not readable: {{ b.error }}
          </p>
        } @else {
          <table class="table table--compact">
            <thead>
              <tr>
                <th scope="col">Project</th>
                <th scope="col">State</th>
                <th scope="col">Newest</th>
                <th scope="col" class="num">Size</th>
                <th scope="col" class="num">Kept</th>
              </tr>
            </thead>
            <tbody>
              @for (p of b.projects; track p.project) {
                <tr>
                  <td>{{ p.project }}</td>
                  <td>
                    <app-state-badge
                      [state]="
                        p.state === 'ok' ? 'operational' : p.state === 'late' ? 'warning' : 'error'
                      "
                      [label]="labels[p.state]"
                    />
                  </td>
                  <td>
                    @if (p.latest) {
                      <span [title]="p.latest.at | dateTime">{{ p.latest.at | relative }}</span>
                      <small class="text-tertiary mono"> {{ p.latest.name }}</small>
                    } @else {
                      —
                    }
                  </td>
                  <td class="num mono">{{ p.latest ? bytes(p.latest.sizeBytes) : '—' }}</td>
                  <td class="num mono">{{ p.files }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      }
    </section>
  `,
})
export class ServerBackups {
  protected readonly backups = httpResource<{
    enabled: boolean;
    checkedAt: string | null;
    error: string | null;
    projects: BackupStatus[];
  }>(() => apiUrl('/server/backups'));
  protected readonly labels = LABELS;
  protected readonly bytes = formatBytes;
}
