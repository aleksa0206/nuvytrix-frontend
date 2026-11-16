import type { HealthState } from './api.models';
import type { DiscoveryScan } from './device.model';

export type TargetStatus = 'up' | 'degraded' | 'down' | 'unknown' | 'disabled';

export interface MonitoringTarget {
  id: number;
  name: string;
  kind: 'icmp' | 'dns' | 'http';
  host: string;
  dnsQueryName: string | null;
  enabled: boolean;
  managed: boolean;
  /** `router` or `internet` for the built-in targets. */
  managedKey: string | null;
  status: TargetStatus;
  lastCheck: {
    checkedAt: string;
    success: boolean;
    latencyMs: number | null;
    packetLossPercent: number | null;
    error: string | null;
    jitterMs: number | null;
    httpStatus: number | null;
    certExpiresAt: string | null;
  } | null;
  lastSuccessAt: string | null;
  window: {
    hours: number;
    checks: number;
    uptimePercent: number;
    avgLatencyMs: number | null;
    avgPacketLossPercent: number | null;
  } | null;
}

export interface TargetInput {
  name: string;
  kind: 'icmp' | 'dns' | 'http';
  host: string;
  dnsQueryName?: string | null;
  enabled?: boolean;
}

export interface SeriesPoint {
  at: string;
  checks: number;
  successes: number;
  avgLatencyMs: number | null;
  maxLatencyMs: number | null;
  avgPacketLossPercent: number | null;
  avgJitterMs: number | null;
}

export interface Outage {
  start: string;
  end: string | null;
  durationSeconds: number;
  checks: number;
  error: string | null;
}

export interface TargetSeries {
  hours: number;
  bucketMinutes: number;
  points: SeriesPoint[];
}

export type DnsStatus =
  | { provider: 'adguard_home'; configured: false }
  | { provider: 'adguard_home'; configured: true; reachable: false; error: string }
  | {
      provider: 'adguard_home';
      configured: true;
      reachable: true;
      running: boolean;
      protectionEnabled: boolean;
      version: string;
      dnsAddresses: string[];
    };

export interface NamedCount {
  name: string;
  count: number;
}

export interface DnsStats {
  period: string;
  totalQueries: number;
  blockedByFilters: number;
  blockedPercent: number | null;
  safeBrowsingReplaced: number;
  parentalReplaced: number;
  avgProcessingMs: number;
  topQueriedDomains: NamedCount[];
  topBlockedDomains: NamedCount[];
  topClients: NamedCount[];
}

export interface Overview {
  generatedAt: string;
  api: { state: HealthState; uptimeSeconds: number };
  database: { state: HealthState };
  router: {
    state: HealthState;
    host: string | null;
    lastCheck: MonitoringTarget['lastCheck'];
    uptimePercent24h: number | null;
  };
  devices: {
    state: HealthState;
    total: number;
    online: number;
    newLast24h: number;
    latestScan: DiscoveryScan | null;
  };
  firewall:
    | { state: HealthState; hasData: false }
    | {
        state: HealthState;
        hasData: true;
        totalEvents: number;
        dataTo: string;
        range: { from: string; to: string };
        denied: number;
        accepted: number;
        repeatedDeniedSources: number;
        acceptedInbound: number;
      };
  monitoring: { state: HealthState; targets: number; failing: { id: number; name: string }[] };
  dns: { state: HealthState; provider: string };
  policies: { pendingManual: number; failed: number };
  alerts: { unread: number };
}

export type CapabilityStatus =
  'implemented' | 'partial' | 'requires_hardware' | 'requires_router_support' | 'planned';

export interface Capability {
  feature: string;
  status: CapabilityStatus;
  note: string;
}

export interface SystemSettings {
  routerHost: string | null;
  allowedScanCidrs: string[];
  discoveryIntervalMinutes: number;
  monitoringIntervalSeconds: number;
}

export interface AuditEntry {
  id: number;
  action: string;
  username: string | null;
  entityType: string | null;
  entityId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}
