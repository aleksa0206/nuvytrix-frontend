export type FirewallAction = 'accept' | 'deny';
export type FirewallDirection =
  'internet_to_lan' | 'internet_to_router' | 'lan_to_internet' | 'lan_to_router';

export const DIRECTION_LABELS: Record<FirewallDirection, string> = {
  internet_to_lan: 'Internet → LAN',
  internet_to_router: 'Internet → Router',
  lan_to_internet: 'LAN → Internet',
  lan_to_router: 'LAN → Router',
};

export interface FirewallEvent {
  id: number;
  occurredAt: string;
  action: FirewallAction;
  actionRaw: string;
  direction: FirewallDirection | null;
  directionRaw: string | null;
  inInterface: string | null;
  outInterface: string | null;
  sourceIp: string;
  sourcePort: number | null;
  destinationIp: string;
  destinationPort: number | null;
  protocol: string;
  ipVersion: number;
  severity: string | null;
}

export interface FirewallEventDetail extends FirewallEvent {
  rawLine: string;
  importId: number;
}

export interface FirewallEventQuery {
  page: number;
  pageSize: number;
  action?: FirewallAction;
  direction?: FirewallDirection;
  flow?: 'inbound' | 'outbound';
  protocol?: string;
  ipVersion?: number;
  ip?: string;
  port?: number;
  sort: 'occurred_at' | 'source_ip' | 'destination_ip' | 'destination_port';
  order: 'asc' | 'desc';
}

export interface FirewallFacets {
  actions: FirewallAction[];
  directions: FirewallDirection[];
  protocols: string[];
  ipVersions: number[];
}

export interface FirewallImport {
  id: number;
  fileName: string;
  fileSizeBytes: number;
  fileSha256: string;
  totalLines: number;
  parsedEvents: number;
  insertedEvents: number;
  duplicateEvents: number;
  rejectedLines: number;
  blankLines: number;
  firstEventAt: string | null;
  lastEventAt: string | null;
  createdAt: string;
  importedBy?: string | null;
}

export interface RejectedLine {
  lineNumber: number;
  reason: string;
  rawLine: string;
}

export interface FirewallImportResult extends FirewallImport {
  rejectedSample: RejectedLine[];
  rejectedStoredLimit: number;
}

export interface FirewallImportDetail extends FirewallImport {
  rejected: RejectedLine[];
  rejectedLinesTruncated: boolean;
}

export interface TimeRange {
  from: string;
  to: string;
}

export type FirewallSummary =
  | { hasData: false; totalEvents: 0 }
  | {
      hasData: true;
      totalEvents: number;
      dataFrom: string;
      dataTo: string;
      range: TimeRange;
      denied: number;
      accepted: number;
      timeline: { bucket: string; denied: number; accepted: number }[];
    };

export interface RepeatedDeniedSource {
  sourceIp: string;
  events: number;
  distinctPorts: number;
  distinctDestinations: number;
  commonSourcePort: number | null;
  directions: FirewallDirection[];
  firstSeen: string;
  lastSeen: string;
  interpretation: string;
}

export type FirewallInsights =
  | { hasData: false; observations: [] }
  | {
      hasData: true;
      range: TimeRange;
      disclaimer: string;
      repeatedDeniedSources: RepeatedDeniedSource[];
      acceptedInbound: {
        destinationIp: string;
        destinationPort: number | null;
        protocol: string;
        events: number;
        distinctSources: number;
        lastSeen: string;
        interpretation: string;
      }[];
      topDeniedInboundPorts: {
        destinationPort: number;
        protocol: string;
        events: number;
        distinctSources: number;
        ephemeral: boolean;
      }[];
    };

export type PolicyStatus =
  'draft' | 'pending_manual' | 'marked_applied' | 'apply_failed' | 'retired';

export const POLICY_STATUS_LABELS: Record<PolicyStatus, string> = {
  draft: 'Draft (app only)',
  pending_manual: 'Waiting for manual apply',
  marked_applied: 'Marked applied (unverified)',
  apply_failed: 'Apply failed',
  retired: 'Retired',
};

export interface PolicyInput {
  name: string;
  description?: string | null;
  action: FirewallAction;
  direction: FirewallDirection;
  protocol: 'any' | 'tcp' | 'udp' | 'icmp';
  source: string;
  destination: string;
  destinationPorts?: string | null;
}

export interface FirewallPolicy extends Required<PolicyInput> {
  id: number;
  status: PolicyStatus;
  statusNote: string | null;
  statusChangedAt: string;
  routerState: 'unverified';
  allowedTransitions: PolicyStatus[];
  warnings: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PolicyInstructions {
  policyId: number;
  steps: string[];
  warnings: string[];
  note: string;
}
