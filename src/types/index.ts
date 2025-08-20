export interface Device {
  id: string;
  name: string;
  host: string;
  username: string;
  port: number;
  connected: boolean;
  lastUpdate: string | null;
  error: string | null;
}

export interface SystemInfo {
  identity: string;
  version: string;
  uptime: string;
  cpuLoad: number;
  freeMemory: number;
  totalMemory: number;
  freeDisk: number;
  totalDisk: number;
  temperature: number | null;
  boardName?: string;
  architectureName?: string;
  serialNumber?: string;
  factorySoftwareVersion?: string;
  platform?: string;
  boardType?: string;
  cpuFrequency?: number;
  cpuCount?: number;
}

export interface InterfaceInfo {
  id: string;
  name: string;
  type: string;
  running: boolean;
  disabled: boolean;
  'rx-bits-per-second'?: string;
  'tx-bits-per-second'?: string;
  'rx-packets-per-second'?: string;
  'tx-packets-per-second'?: string;
  'mac-address'?: string;
  'ip-address'?: string;
  comment?: string;
}

export interface FirewallRule {
  '.id': string;
  chain: 'input' | 'forward' | 'output';
  action: 'accept' | 'drop' | 'reject' | 'log';
  protocol?: string;
  'src-address'?: string;
  'dst-port'?: string;
  comment?: string;
  disabled: boolean;
}

export interface SecurityInfo {
  firewallRules: number | FirewallRule[];
  activeConnections: number;
  dhcpLeases: number;
  blockedIpsCount?: number;
}

export interface DHCPLease {
  address: string;
  macAddress: string;
  hostName: string;
  status: string;
}

export interface ActiveConnection {
  srcAddress: string;
  dstAddress: string;
  protocol: string;
  state: string;
  timeout: string;
}

export interface LogEntry {
  time: string;
  topics: string;
  message: string;
}

export interface DeviceLogEntry extends LogEntry {
  deviceId?: string;
  deviceName?: string;
}

export interface AddressListEntry {
  '.id': string;
  list: string;
  address: string;
  comment?: string;
}

export interface ScriptEntry {
  '.id': string;
  name: string;
  source: string;
  owner?: string;
  policy?: string;
  lastStarted?: string;
  runCount?: string;
}

export interface NetworkInfo {
  dhcpLeases: DHCPLease[];
  activeConnections: ActiveConnection[];
  gateway?: string;
  dns?: string;
  address?: string;
  subnet?: string;
  interface?: string;
  status?: string;
  defaultGateway?: string;
  'dns-server'?: string;
  'dns1'?: string;
  'ip-address'?: string;
  'subnet-mask'?: string;
  'interface-name'?: string;
  'interface.name'?: string;
  ip?: string;
  state?: string;
  running?: boolean;
  [key: string]: unknown; // Add index signature to make it compatible with Record<string, unknown>
}

export interface MonitoringData {
  system: SystemInfo;
  interfaces: InterfaceInfo[];
  security: SecurityInfo;
  network: NetworkInfo;
  queues: Queue[];
  queueTree: QueueTreeItem[];
  error?: string;
}

export interface Queue {
  id: string;
  name: string;
  target: string;
  rate: string;
  maxLimit: string;
  comment?: string;
  disabled: boolean;
}

export interface QueueTreeItem {
  id: string;
  name: string;
  parent: string;
  'packet-mark': string;
  rate: string;
  'max-limit': string;
  comment?: string;
  disabled: boolean;
}

export interface User {
  id?: string;
  username: string;
  name?: string;
  profilePictureUrl?: string;
}
  id?: string;
  username: string;
  name?: string;
  profilePictureUrl?: string;
}