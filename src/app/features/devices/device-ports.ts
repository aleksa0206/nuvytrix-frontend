import { HttpClient, httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { apiUrl } from '../../core/api/http';
import { toApiError } from '../../core/api/api-error';
import { DateTimePipe, RelativePipe } from '../../shared/util/format.pipes';

interface DevicePort {
  protocol: string;
  port: number;
  service: string | null;
  product: string | null;
  version: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  closedAt: string | null;
}

/** Open ports and services of one device, from nmap port scans, with a manual scan button. */
@Component({
  selector: 'app-device-ports',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DateTimePipe, RelativePipe],
  template: `
    <section class="panel">
      <header class="panel__header">
        <h2>Open ports</h2>
        <span class="panel__meta">
          @if (ports.hasValue() && ports.value().scannedAt; as at) {
            scanned {{ at | relative }} ·
          }
          top 200 TCP ports, nightly
        </span>
        <button type="button" class="btn btn--sm" [disabled]="scanning()" (click)="scan()">
          {{ scanning() ? 'Scanning…' : 'Scan ports now' }}
        </button>
      </header>
      @if (error()) {
        <p class="panel__body notice notice--error" role="alert">{{ error() }}</p>
      }
      @if (ports.hasValue()) {
        @let p = ports.value();
        @if (!p.scannedAt) {
          <p class="panel__body text-tertiary">Not scanned yet.</p>
        } @else if (p.ports.length === 0) {
          <p class="panel__body text-tertiary">No open ports among the top 200.</p>
        } @else {
          <div class="table-wrap">
            <table class="table table--compact">
              <thead>
                <tr>
                  <th scope="col">Port</th>
                  <th scope="col">Service</th>
                  <th scope="col">First seen</th>
                  <th scope="col">State</th>
                </tr>
              </thead>
              <tbody>
                @for (port of p.ports; track port.protocol + port.port) {
                  <tr [class.text-tertiary]="port.closedAt">
                    <td class="mono">{{ port.port }}/{{ port.protocol }}</td>
                    <td>
                      {{ port.service ?? '—' }}
                      <small class="text-tertiary"
                        >{{ port.product ?? '' }} {{ port.version ?? '' }}</small
                      >
                    </td>
                    <td>{{ port.firstSeenAt | dateTime }}</td>
                    <td>{{ port.closedAt ? 'closed ' + (port.closedAt | dateTime) : 'open' }}</td>
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
export class DevicePorts {
  private readonly http = inject(HttpClient);
  readonly deviceId = input.required<number>();
  protected readonly ports = httpResource<{ scannedAt: string | null; ports: DevicePort[] }>(() =>
    apiUrl(`/devices/${this.deviceId()}/ports`),
  );
  protected readonly scanning = signal(false);
  protected readonly error = signal<string | null>(null);

  protected scan() {
    this.error.set(null);
    this.scanning.set(true);
    this.http.post(apiUrl('/port-scans'), { deviceId: this.deviceId() }).subscribe({
      next: () => this.waitForScan(),
      error: (err: unknown) => {
        this.scanning.set(false);
        this.error.set(toApiError(err).message);
      },
    });
  }

  /** Polls until the scan is finished (a device takes up to a few minutes), then reloads. */
  private waitForScan() {
    const check = () =>
      this.http.get<{ running: boolean }>(apiUrl('/port-scans')).subscribe({
        next: (s) => {
          if (s.running) {
            setTimeout(check, 5000);
            return;
          }
          this.scanning.set(false);
          this.ports.reload();
        },
        error: () => this.scanning.set(false),
      });
    setTimeout(check, 3000);
  }
}
