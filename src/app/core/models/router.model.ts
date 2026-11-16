export interface RouterSystemInfo {
  model: string;
  hardwareVersion: string;
  softwareVersion: string;
  description: string;
  uptimeSeconds: number | null;
  cpuPercent: number | null;
  memoryPercent: number | null;
  ontRegistrationState: string | null;
}

export interface OpticalInfo {
  linkStatus: string;
  txPowerDbm: number | null;
  rxPowerDbm: number | null;
  voltageMv: number | null;
  temperatureC: number | null;
  biasMa: number | null;
  vendor: string;
  txWavelengthNm: number | null;
  rxWavelengthNm: number | null;
  lossOfSignal: boolean;
}

export interface WanStatus {
  connected: boolean;
  connectionStatus: string;
  uptimeSeconds: number | null;
  externalIp: string | null;
  natEnabled: boolean | null;
  bytesSent: number | null;
  bytesReceived: number | null;
}

export interface LanPort {
  port: number;
  linkUp: boolean;
  speedMbps: number | null;
  fullDuplex: boolean | null;
  bytesSent: number;
  bytesReceived: number;
  packetsSent: number;
  packetsReceived: number;
}

export interface WlanInterface {
  instance: number;
  band: string;
  ssid: string;
  channel: number | null;
  standard: string;
  transmitPowerPercent: number | null;
  bytesSent: number | null;
  bytesReceived: number | null;
  errorsSent: number | null;
  errorsReceived: number | null;
}

export interface IpFilterRule {
  domain: string;
  name: string;
  priority: number | null;
  protocol: string;
  direction: string;
  sourceIpStart: string;
  sourceIpEnd: string;
  destIpStart: string;
  destIpEnd: string;
  action: string;
  lanTcpPorts: string;
  lanUdpPorts: string;
  wanTcpPorts: string;
  wanUdpPorts: string;
}

export interface IpFilterState {
  enabled: boolean;
  mode: 'blacklist' | 'whitelist' | 'hybrid' | 'unknown';
  firewallLevel: string | null;
  rules: IpFilterRule[];
}

export interface RouterFirewallState extends IpFilterState {
  writesEnabled: boolean;
}

export interface IpFilterRuleInput {
  name: string;
  protocol: 'ALL' | 'TCP/UDP' | 'TCP' | 'UDP' | 'ICMP';
  lanIpStart: string;
  lanIpEnd: string;
  wanIpStart: string;
  wanIpEnd: string;
  lanTcpPorts: string;
  lanUdpPorts: string;
  wanTcpPorts: string;
  wanUdpPorts: string;
}

export type RouterStatus =
  | { configured: false; host: string | null }
  | {
      configured: true;
      host: string;
      polling: boolean;
      pollSeconds: number;
      capturedAt: string | null;
      system: RouterSystemInfo | null;
      optical: OpticalInfo | null;
      wan: WanStatus | null;
      lanPorts: LanPort[] | null;
      wlan: WlanInterface[] | null;
      ipFilter: IpFilterState | null;
      devicesOnline: number | null;
      devicesKnown: number | null;
      wifiClients: number | null;
      errors: { section: string; message: string }[];
    };

export interface RouterClient {
  macAddress: string;
  ipAddress: string | null;
  hostName: string | null;
  online: boolean;
  connection: 'ethernet' | 'wifi' | 'unknown';
  port: string | null;
  addressSource: string | null;
  dhcpVendorClass: string | null;
  onlineDuration: string | null;
  leaseRemainingSeconds: number | null;
  deviceId: number | null;
  customName: string | null;
  wifi: {
    band: string;
    rssiDbm: number | null;
    noiseDbm: number | null;
    snrDb: number | null;
    signalQuality: number | null;
    rxRateMbps: number | null;
    txRateMbps: number | null;
    standard: string;
    streams: string | null;
    connectedSeconds: number | null;
  } | null;
}

export interface PortMapping {
  externalPort: number;
  internalPort: number;
  internalClient: string;
  protocol: string;
  description: string;
  enabled: boolean;
  leaseSeconds: number;
}

export interface RouterHistoryPoint {
  at: string;
  cpuPercent: number | null;
  memoryPercent: number | null;
  opticalRxDbm: number | null;
  opticalTxDbm: number | null;
  opticalTemperatureC: number | null;
  wanDownloadBps: number | null;
  wanUploadBps: number | null;
  lanDownloadBps: number | null;
  lanUploadBps: number | null;
  wifiClients: number | null;
  devicesOnline: number | null;
}

export interface DhcpServer {
  enabled: boolean;
  lanIp: string;
  subnetMask: string;
  startIp: string;
  endIp: string;
  leaseSeconds: number;
  /** Empty: devices use the router itself as DNS server. */
  dnsServers: string[];
}

export interface DhcpReservation {
  /** TR-098 path; its last number is the index used by the API. */
  domain: string;
  enabled: boolean;
  ip: string;
  mac: string;
}

export interface RouterDhcpState {
  writesEnabled: boolean;
  server: DhcpServer;
  reservations: DhcpReservation[];
}

export interface DhcpServerInput {
  startIp: string;
  endIp: string;
  leaseSeconds: number;
}

export interface DhcpReservationInput {
  mac: string;
  ip: string;
}
