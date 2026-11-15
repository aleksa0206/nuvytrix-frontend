import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { Device } from '../../core/models/device.model';
import { Icon, deviceIcon } from './icon';

// Order of device groups under the LAN segment: infrastructure first, then clients.
const GROUPS: { label: string; types: (string | null)[] }[] = [
  { label: 'Infrastructure', types: ['switch', 'access_point', 'server'] },
  { label: 'Computers', types: ['computer', 'laptop'] },
  { label: 'Mobile', types: ['phone', 'tablet'] },
  { label: 'Media & IoT', types: ['tv', 'console', 'printer', 'iot'] },
  { label: 'Unclassified', types: ['other', null] },
];

/**
 * Logical map of what is actually known: internet → router → one LAN segment → discovered hosts.
 * The switch layer is unmanaged and cannot be discovered, so no host-to-switch links are drawn;
 * hosts hang off the segment, grouped by the type the administrator assigned.
 */
@Component({
  selector: 'app-topology-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="upstream">
      <div class="node node--wan">
        <app-icon name="internet" [size]="18" />
        <span class="node__text">
          <strong>Internet</strong>
          <small>ISP uplink · CGNAT IPv4</small>
        </span>
      </div>
      <span class="link" aria-hidden="true"></span>
      <button
        type="button"
        class="node node--router"
        [class.is-selected]="router()?.id === selectedId()"
        [class.is-offline]="router()?.status === 'offline'"
        [disabled]="!router()"
        (click)="router() && deviceSelect.emit(router()!.id)"
      >
        <app-icon name="router" [size]="18" />
        <span class="node__text">
          <strong>{{ router()?.customName ?? 'Router' }}</strong>
          <small class="mono"
            >{{ routerHost() ?? 'address not set'
            }}{{ router() ? '' : ' · not discovered yet' }}</small
          >
        </span>
        @if (router(); as r) {
          <span class="led" [class.led--on]="r.status === 'online'" aria-hidden="true"></span>
        }
      </button>
      <span class="link" aria-hidden="true"></span>
    </div>

    <div class="segment">
      <div class="segment__label">
        <span class="mono">{{ subnet() }}</span>
        <span>LAN · via unmanaged switch (port-level links not discoverable)</span>
      </div>

      @for (group of groups(); track group.label) {
        <section class="group" [attr.aria-label]="group.label">
          <h4>
            {{ group.label }} <span class="mono">{{ group.devices.length }}</span>
          </h4>
          <div class="hosts" [class.hosts--compact]="compact()">
            @for (device of group.devices; track device.id) {
              <button
                type="button"
                class="node node--host"
                [class.is-selected]="device.id === selectedId()"
                [class.is-offline]="device.status === 'offline'"
                [attr.aria-pressed]="device.id === selectedId()"
                (click)="deviceSelect.emit(device.id)"
              >
                <app-icon [name]="iconFor(device.deviceType)" />
                <span class="node__text">
                  <strong>{{
                    device.customName ??
                      device.hostname ??
                      (device.vendor ? device.vendor + ' device' : 'Unknown host')
                  }}</strong>
                  <small class="mono">{{ device.ipAddress }}</small>
                </span>
                <span
                  class="led"
                  [class.led--on]="device.status === 'online'"
                  aria-hidden="true"
                ></span>
                <span class="visually-hidden">{{ device.status }}</span>
              </button>
            }
          </div>
        </section>
      }
    </div>
  `,
  styleUrl: './topology-map.scss',
})
export class TopologyMap {
  readonly devices = input.required<Device[]>();
  readonly routerHost = input<string | null>(null);
  readonly selectedId = input<number | null>(null);
  readonly compact = input(false);
  readonly deviceSelect = output<number>();

  protected readonly router = computed(() =>
    this.devices().find((device) => device.ipAddress === this.routerHost()),
  );

  protected readonly subnet = computed(() => {
    const host = this.routerHost();
    return host && /^\d+\.\d+\.\d+\.\d+$/.test(host) ? host.replace(/\.\d+$/, '.0/24') : 'LAN';
  });

  protected readonly groups = computed(() => {
    const hosts = this.devices().filter((device) => device.ipAddress !== this.routerHost());
    return GROUPS.map((group) => ({
      label: group.label,
      devices: hosts
        // Any other device marked as a router is extra infrastructure (e.g. a mesh node).
        .filter((device) =>
          group.types.includes(device.deviceType === 'router' ? 'switch' : device.deviceType),
        )
        .sort((a, b) =>
          a.status === b.status
            ? compareIp(a.ipAddress, b.ipAddress)
            : a.status === 'online'
              ? -1
              : 1,
        ),
    })).filter((group) => group.devices.length > 0);
  });

  protected iconFor(type: string | null) {
    return deviceIcon(type);
  }
}

function compareIp(a: string, b: string): number {
  const parts = (ip: string) => ip.split('.').map(Number);
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < 4; i++) if (x[i] !== y[i]) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
}
