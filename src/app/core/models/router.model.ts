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

export type MacFilterList = 'lan' | 'wifi';

export interface MacFilterEntry {
  /** TR-098 path; its last number is the index used by the API. */
  domain: string;
  mac: string;
  name: string;
  /** Wi-Fi list only, e.g. `SSID-1`. */
  ssid?: string;
}

export interface MacFilterState {
  enabled: boolean;
  mode: 'blacklist' | 'whitelist' | 'unknown';
  entries: MacFilterEntry[];
}

export interface WifiNetwork {
  id: string;
  ssid: string;
  band: string;
}

export interface RouterMacFilterState {
  writesEnabled: boolean;
  lan: MacFilterState;
  wifi: MacFilterState;
  wifiNetworks: WifiNetwork[];
}

export interface MacFilterEntryInput {
  mac: string;
  name: string;
  ssid?: string;
}

export interface PortMappingRange {
  domain: string;
  protocol: string;
  /** `start` or `start:end`. */
  internalPort: string;
  externalPort: string;
  externalSourcePort: string;
}

export interface PortMappingRule {
  /** TR-098 path; its last number is the index used by the API. */
  domain: string;
  enabled: boolean;
  name: string;
  internalHost: string;
  remoteHostStart: string;
  remoteHostEnd: string;
  ranges: PortMappingRange[];
}

export interface RouterPortMappingState {
  writesEnabled: boolean;
  /** WAN connection mappings are created on; null when the router has none for internet. */
  internetWan: string | null;
  mappings: PortMappingRule[];
}

export interface PortMappingInput {
  name: string;
  enabled: boolean;
  protocol: 'TCP' | 'UDP' | 'TCP/UDP';
  internalHost: string;
  internalPort: number;
  externalPortStart: number;
  externalPortEnd: number;
  remoteHostStart: string;
  remoteHostEnd: string;
}

export interface DmzState {
  domain: string;
  enabled: boolean;
  host: string;
}

export interface RouterDmzState {
  writesEnabled: boolean;
  internetWan: string | null;
  dmz: DmzState | null;
}

export interface PortTriggerRule {
  /** TR-098 path; its last number is the index used by the API. */
  domain: string;
  enabled: boolean;
  triggerProtocol: string;
  triggerPortStart: number;
  triggerPortEnd: number;
  openProtocol: string;
  openPortStart: number;
  openPortEnd: number;
}

export type PortTriggerInput = Omit<PortTriggerRule, 'domain'> & {
  triggerProtocol: 'TCP' | 'UDP' | 'TCP/UDP';
  openProtocol: 'TCP' | 'UDP' | 'TCP/UDP';
};

export interface RouterPortTriggerState {
  writesEnabled: boolean;
  internetWan: string | null;
  triggers: PortTriggerRule[];
}

export type WifiSecurity = 'open' | 'wep' | 'wpa' | 'wpa2' | 'wpa-wpa2' | 'wpa3' | 'other';

export interface WifiNetworkConfig {
  /** TR-098 path (`…WLANConfiguration.N`); `instance` is N, the index used by the API. */
  domain: string;
  instance: number;
  band: '2.4 GHz' | '5 GHz';
  enabled: boolean;
  ssid: string;
  visible: boolean;
  security: WifiSecurity;
}

export interface RouterWifiState {
  writesEnabled: boolean;
  networks: WifiNetworkConfig[];
}

export interface WifiNetworkInput {
  ssid: string;
  enabled: boolean;
  visible: boolean;
  security: 'wpa2' | 'wpa-wpa2';
  password?: string;
}

export type ParentalMode = 'block' | 'allow';

export interface ParentalPeriod {
  index: number;
  start: string;
  end: string;
  /** 1 = Monday … 7 = Sunday. */
  days: number[];
}

export interface ParentalTemplate {
  index: number;
  name: string;
  timeEnabled: boolean;
  timeMode: ParentalMode;
  urlEnabled: boolean;
  urlMode: ParentalMode;
  periods: ParentalPeriod[];
  urls: { index: number; url: string }[];
}

export interface ParentalDevice {
  index: number;
  mac: string;
  description: string;
  template: number;
}

export interface RouterParentalState {
  writesEnabled: boolean;
  templates: ParentalTemplate[];
  devices: ParentalDevice[];
}

export type ParentalTemplateUpdate = Partial<
  Pick<ParentalTemplate, 'name' | 'timeEnabled' | 'timeMode' | 'urlEnabled' | 'urlMode'>
>;

export interface DnsHost {
  domain: string;
  index: number;
  name: string;
  ip: string;
}

export interface RouterDnsHostsState {
  writesEnabled: boolean;
  hosts: DnsHost[];
}
