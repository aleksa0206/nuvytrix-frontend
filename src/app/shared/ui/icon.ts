import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

// 16px stroke icons drawn for Nuvytrix. Used only where they carry meaning: navigation and device types.
const PATHS = {
  overview: 'M2.5 2.5h4.5v4.5H2.5zM9 2.5h4.5v7H9zM2.5 9h4.5v4.5H2.5zM9 11.5h4.5v2H9z',
  topology: 'M8 2.5v3M8 10.5v3M3.5 13.5v-2.5h9v2.5M6 5.5h4v5H6zM2 13.5h3M11 13.5h3M6.5 13.5h3',
  devices: 'M2 3.5h12v7H2zM5.5 13.5h5M8 10.5v3',
  firewall:
    'M8 1.8 13.5 4v4c0 3.2-2.4 5.4-5.5 6.2C4.9 13.4 2.5 11.2 2.5 8V4z M5.5 8l1.8 1.8L10.8 6.3',
  rules: 'M3 3.5h10M3 8h10M3 12.5h6M11.5 11l1.5 1.5 2.3-2.5',
  imports: 'M8 2v8M5 7l3 3 3-3M2.5 11v2.5h11V11',
  monitoring: 'M1.5 8.5h3l1.8-4.5 3.4 8 1.8-3.5h3',
  dns: 'M8 1.8a6.2 6.2 0 1 0 0 12.4A6.2 6.2 0 0 0 8 1.8zM1.8 8h12.4M8 1.8c1.8 2 2.6 4 2.6 6.2S9.8 12.2 8 14.2C6.2 12.2 5.4 10.2 5.4 8S6.2 3.8 8 1.8z',
  settings:
    'M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4',
  insights: 'M2.5 13.5h11M4 11V8M7 11V4.5M10 11V6.5M13 11V3',
  search: 'M7 2.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM10.3 10.3l3.2 3.2',
  internet: 'M4.5 12.5h7.2a3 3 0 0 0 .3-6 4 4 0 0 0-7.7-.6A3.3 3.3 0 0 0 4.5 12.5z',
  router: 'M2 9h12v4H2zM4.5 11h.01M7 11h.01M5 9l-1.5-4M11 9l1.5-4',
  switch: 'M1.5 5.5h13v5h-13zM4 8h.01M6 8h.01M8 8h.01M10 8h.01M12 8h.01',
  access_point: 'M8 9.5h.01M5.5 7a3.6 3.6 0 0 1 5 0M3.5 5a6.4 6.4 0 0 1 9 0M6 13.5h4',
  server: 'M3 2.5h10v4.5H3zM3 9h10v4.5H3zM5.5 4.8h.01M5.5 11.3h.01',
  computer: 'M2 3h12v8H2zM6 13.5h4M8 11v2.5',
  laptop: 'M3.5 4h9v6h-9zM1.5 12.5h13',
  phone: 'M5 1.8h6v12.4H5zM7.5 12h1',
  tablet: 'M3.5 2h9v12h-9zM7.5 12h1',
  tv: 'M1.5 3.5h13v8h-13zM5.5 13.8h5',
  printer: 'M4.5 6V2.5h7V6M3 6h10v5.5h-1.5M4.5 11.5H3V6M4.5 9.5h7v4h-7z',
  iot: 'M5 5h6v6H5zM7 2.5V5M9 2.5V5M7 11v2.5M9 11v2.5M2.5 7H5M2.5 9H5M11 7h2.5M11 9h2.5',
  console:
    'M4.5 5h7a3 3 0 0 1 3 3v1a2.5 2.5 0 0 1-4.5 1.5h-4A2.5 2.5 0 0 1 1.5 9V8a3 3 0 0 1 3-3zM5 7v2M4 8h2M10.5 7.5h.01M12 8.5h.01',
  other: 'M3 3h10v10H3zM6 8h4',
  unknown: 'M3 3h10v10H3zM6.5 6.3a1.6 1.6 0 1 1 2.2 1.5c-.5.2-.7.6-.7 1.1M8 11h.01',
  chevron: 'M6 4l4 4-4 4',
  close: 'M4 4l8 8M12 4l-8 8',
  arrow: 'M2.5 8h11M10 4.5 13.5 8 10 11.5',
  menu: 'M2.5 4h11M2.5 8h11M2.5 12h11',
} as const;

export type IconName = keyof typeof PATHS;

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      viewBox="0 0 16 16"
      [attr.width]="size()"
      [attr.height]="size()"
      fill="none"
      stroke="currentColor"
      stroke-width="1.3"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path [attr.d]="path()" />
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
    }
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input(16);
  protected readonly path = computed(() => PATHS[this.name()]);
}

/** Device-type icon, falling back to "unknown" when the user has not set a type. */
export function deviceIcon(type: string | null): IconName {
  return type && type in PATHS ? (type as IconName) : 'unknown';
}
