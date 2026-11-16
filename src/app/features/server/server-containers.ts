import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { apiUrl } from '../../core/api/http';
import { pollWhileVisible } from '../../core/polling';
import { EmptyState, LoadError, Loading } from '../../shared/ui/feedback';
import { StateBadge } from '../../shared/ui/state-badge';
import { formatBytes, formatDuration } from '../../shared/util/format';
import { RelativePipe } from '../../shared/util/format.pipes';

interface ContainerState {
  id: string;
  name: string;
  project: string | null;
  service: string | null;
  image: string;
  state: string;
  health: string | null;
  restartCount: number;
  startedAt: string | null;
  uptimeSeconds: number | null;
  cpuPercent: number | null;
  memoryBytes: number | null;
  memoryLimitBytes: number | null;
  exitCode: number | null;
}

interface DockerStatus {
  enabled: boolean;
  checkedAt: string | null;
  error: { at: string; message: string } | null;
  containers: ContainerState[];
}

/** Containers on the server, read through the read-only Docker API proxy. */
@Component({
  selector: 'app-server-containers',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StateBadge, LoadError, Loading, EmptyState, RelativePipe],
  template: `
    <section class="panel">
      <header class="panel__header">
        <h2>Containers</h2>
        @if (docker.hasValue() && docker.value().checkedAt; as at) {
          <span class="panel__meta">read-only Docker view · {{ at | relative }}</span>
        }
      </header>
      @if (docker.isLoading() && !docker.hasValue()) {
        <app-loading />
      }
      @if (docker.error(); as e) {
        <app-load-error [error]="e" (retry)="docker.reload()" />
      }
      @if (docker.hasValue()) {
        @let d = docker.value();
        @if (!d.enabled) {
          <app-empty-state
            title="Container monitoring is off"
            description="Set DOCKER_PROXY_URL."
          />
        } @else {
          @if (d.error) {
            <p class="panel__body notice notice--error" role="alert">
              Docker proxy not reachable: {{ d.error.message }}
            </p>
          }
          <div class="table-wrap">
            <table class="table table--compact">
              <thead>
                <tr>
                  <th scope="col">Container</th>
                  <th scope="col">State</th>
                  <th scope="col">Uptime</th>
                  <th scope="col" class="num">Restarts</th>
                  <th scope="col" class="num">CPU</th>
                  <th scope="col" class="num">Memory</th>
                </tr>
              </thead>
              <tbody>
                @for (c of d.containers; track c.id) {
                  <tr>
                    <td>
                      <strong>{{ c.name }}</strong>
                      <small class="text-tertiary mono"> {{ c.image }}</small>
                    </td>
                    <td>
                      <app-state-badge
                        [state]="
                          c.state !== 'running'
                            ? 'error'
                            : c.health === 'unhealthy'
                              ? 'warning'
                              : 'operational'
                        "
                        [label]="
                          c.state === 'running'
                            ? c.health
                              ? 'running · ' + c.health
                              : 'running'
                            : c.state + (c.exitCode !== null ? ' (' + c.exitCode + ')' : '')
                        "
                      />
                    </td>
                    <td>{{ c.uptimeSeconds !== null ? duration(c.uptimeSeconds) : '—' }}</td>
                    <td class="num mono">{{ c.restartCount }}</td>
                    <td class="num mono">
                      {{ c.cpuPercent !== null ? c.cpuPercent + ' %' : '—' }}
                    </td>
                    <td class="num mono">
                      {{ c.memoryBytes !== null ? bytes(c.memoryBytes) : '—' }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    </section>
  `,
})
export class ServerContainers {
  protected readonly docker = httpResource<DockerStatus>(() => apiUrl('/docker/containers'));
  protected readonly duration = formatDuration;
  protected readonly bytes = formatBytes;

  constructor() {
    pollWhileVisible(() => this.docker.reload(), 60_000);
  }
}
