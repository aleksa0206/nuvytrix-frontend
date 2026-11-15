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
  status: 'online' | 'offline';
  isNew: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface DeviceDetail extends Device {
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
  sort: 'last_seen_at' | 'first_seen_at' | 'ip_address' | 'name';
  order: 'asc' | 'desc';
}

export interface DeviceChanges {
  customName?: string | null;
  deviceType?: DeviceType | null;
  notes?: string | null;
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
