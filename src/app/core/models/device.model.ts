export const DEVICE_TYPES = [
  'router',
  'switch',
  'access_point',
  'server',
  'computer',
  'laptop',
  'phone',
  'tablet',
  'tv',
  'printer',
  'iot',
  'console',
  'other',
] as const;

export type DeviceType = (typeof DEVICE_TYPES)[number];

export const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  router: 'Router',
  switch: 'Switch',
  access_point: 'Access point',
  server: 'Server',
  computer: 'Computer',
  laptop: 'Laptop',
  phone: 'Phone',
  tablet: 'Tablet',
  tv: 'TV',
  printer: 'Printer',
  iot: 'IoT',
  console: 'Console',
  other: 'Other',
};

export interface Device {
  id: number;
  ipAddress: string;
  macAddress: string | null;
  hostname: string | null;
  vendor: string | null;
  customName: string | null;
  deviceType: DeviceType | null;
  notes: string | null;
  tags: string[];
  /** null = not reviewed yet. */
  trusted: boolean | null;
  /** From the router: `dhcp` or `static`. */
  addressSource: string | null;
  leaseExpiresAt: string | null;
  reservedIp: string | null;
  connection: 'ethernet' | 'wifi' | 'unknown' | null;
  status: 'online' | 'offline';
  isNew: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
}

export type DeviceEventKind = 'ip_changed' | 'hostname_changed' | 'mac_changed' | 'ip_conflict';

export const DEVICE_EVENT_LABELS: Record<DeviceEventKind, string> = {
  ip_changed: 'IP address changed',
  hostname_changed: 'Hostname changed',
  mac_changed: 'Took over the IP of another device',
  ip_conflict: 'IP conflict',
};

export interface DeviceDetail extends Device {
  events: { kind: DeviceEventKind; oldValue: string | null; newValue: string | null; at: string }[];
  observations: {
    scanId: number;
    ipAddress: string;
    hostname: string | null;
    observedAt: string;
  }[];
}

export interface DeviceQuery {
  page: number;
  pageSize: number;
  search?: string;
  status?: 'online' | 'offline' | 'new';
  trust?: 'trusted' | 'untrusted' | 'unreviewed';
  tag?: string;
  sort: 'last_seen_at' | 'first_seen_at' | 'ip_address' | 'name';
  order: 'asc' | 'desc';
}

export interface DeviceChanges {
  customName?: string | null;
  deviceType?: DeviceType | null;
  notes?: string | null;
  tags?: string[];
  trusted?: boolean | null;
}

export interface DiscoveryScan {
  id: number;
  target: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  finishedAt: string | null;
  hostsUp: number | null;
  newDevices: number | null;
  error: string | null;
  scheduled: boolean;
}
