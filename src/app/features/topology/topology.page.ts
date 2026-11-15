import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DevicesService } from '../../core/services/devices.service';
import { SystemService } from '../../core/services/system.service';
import { EmptyState, LoadError, Loading } from '../../shared/ui/feedback';
import { PageHeader } from '../../shared/ui/page-header';
import { TopologyMap } from '../../shared/ui/topology-map';
import { DevicePanel } from '../devices/device-panel';

@Component({
  selector: 'app-topology-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeader, TopologyMap, DevicePanel, EmptyState, LoadError, Loading],
  template: `
    <div class="page">
      <app-page-header
        title="Topology"
        description="What is known about how the network is connected: the ISP uplink, the router and the hosts discovered on the LAN."
      >
        <label class="toggle">
          <input
            type="checkbox"
            [checked]="showOffline()"
            (change)="showOffline.set(!showOffline())"
          />
          Show offline hosts
        </label>
      </app-page-header>

      <p class="notice notice--info">
        Links between individual hosts and switch ports are not drawn: the TP-Link TL-SG1005D is
        unmanaged and reports nothing, so that layer cannot be discovered. A managed switch with
        LLDP or SNMP would make it visible. Groups come from the device types you assign on the
        Devices page.
      </p>

      @if (devices.error(); as error) {
        <app-load-error [error]="error" (retry)="devices.reload()" />
      }
      @if (devices.isLoading() && !devices.hasValue()) {
        <app-loading />
      }

      <div class="layout" [class.has-panel]="selectedId()">
        <section class="panel">
          <header class="panel__header">
            <h2>Logical map</h2>
            @if (devices.hasValue()) {
              <span class="panel__meta mono">{{ visible().length }} hosts</span>
            }
          </header>
          <div class="panel__body map">
            @if (devices.hasValue()) {
              @if (devices.value().data.length === 0) {
                <app-empty-state
                  title="No hosts discovered yet"
                  description="Run a scan to place hosts on the map."
                >
                  <a class="btn btn--primary" routerLink="/devices">Go to devices</a>
                </app-empty-state>
              } @else {
                <app-topology-map
                  [devices]="visible()"
                  [routerHost]="routerHost()"
                  [selectedId]="selectedId()"
                  (deviceSelect)="selectedId.set(selectedId() === $event ? null : $event)"
                />
              }
            }
          </div>
        </section>
        @if (selectedId(); as id) {
          <app-device-panel
            [deviceId]="id"
            (closed)="selectedId.set(null)"
            (saved)="devices.reload()"
          />
        }
      </div>
    </div>
  `,
  styles: `
    .layout {
      display: grid;
      gap: var(--space-4);
      align-items: start;
    }
    .layout.has-panel {
      grid-template-columns: minmax(0, 1fr) 360px;
    }
    @media (width < 1200px) {
      .layout.has-panel {
        grid-template-columns: 1fr;
      }
    }
    .map {
      padding: var(--space-6) var(--space-5);
    }
    .toggle {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-sm);
      color: var(--color-text-secondary);
    }
  `,
})
export class TopologyPage {
  protected readonly devices = inject(DevicesService).listResource(() => ({
    page: 1,
    pageSize: 200,
    sort: 'ip_address',
    order: 'asc',
  }));
  private readonly settings = inject(SystemService).settingsResource();

  protected readonly showOffline = signal(true);
  protected readonly selectedId = signal<number | null>(null);
  protected readonly routerHost = computed(() =>
    this.settings.hasValue() ? this.settings.value().routerHost : null,
  );
  protected readonly visible = computed(() => {
    if (!this.devices.hasValue()) return [];
    const all = this.devices.value().data;
    return this.showOffline()
      ? all
      : all.filter(
          (device) => device.status === 'online' || device.ipAddress === this.routerHost(),
        );
  });
}
