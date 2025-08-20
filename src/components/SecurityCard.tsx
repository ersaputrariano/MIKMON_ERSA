import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogEntry, SystemInfo, InterfaceInfo, Device, SecurityInfo, MonitoringData } from '../types';
import {
    WifiOff,
    ServerCrash,
    Server,
    Shield,
    ShieldAlert,
    ShieldCheck,
    AlertTriangle,
    Network,
    Users,
    Ban
} from 'lucide-react';

// ============================================================================
// KOMPONEN CARD (PLACEHOLDER & REFACTORED)
// ============================================================================

const cardStyle = "bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-lg p-3";

const SystemCard = ({ system, deviceName }: { system: SystemInfo, deviceName: string }) => {
  // Extract system information with fallbacks for missing data
  const systemInfo = system || {};
  const boardName = systemInfo.boardName || 'Unknown';
  const version = systemInfo.version || 'Unknown';
  const uptime = systemInfo.uptime || 'Unknown';
  const cpuCount = systemInfo.cpuCount || 'Unknown';
  const freeMemory = systemInfo.freeMemory || 0;
  const totalMemory = systemInfo.totalMemory || 0;
  const freeDisk = systemInfo.freeDisk || 0;
  const totalDisk = systemInfo.totalDisk || 0;

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className={cardStyle}>
      <h3 className="text-xl font-semibold text-slate-100 mb-4">System: {deviceName}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-400">Board Name:</span>
            <span className="text-slate-100">{boardName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Version:</span>
            <span className="text-slate-100">{version}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Uptime:</span>
            <span className="text-slate-100">{uptime}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">CPU Count:</span>
            <span className="text-slate-100">{cpuCount} cores</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-400">Memory:</span>
            <span className="text-slate-100">{formatBytes(freeMemory)} / {formatBytes(totalMemory)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Disk Space:</span>
            <span className="text-slate-100">{formatBytes(freeDisk)} / {formatBytes(totalDisk)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const InterfacesCard = ({ interfaces }: { interfaces: InterfaceInfo[] }) => (
  <div className={cardStyle}>
    <h3 className="text-xl font-semibold text-slate-100 mb-4">Interfaces</h3>
    {interfaces && interfaces.length > 0 ? (
      <div className="space-y-3">
        {interfaces.map((iface: InterfaceInfo, index: number) => (
          <div key={index} className="bg-slate-900/50 p-3 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium text-slate-100">{iface.name || `Interface ${index + 1}`}</span>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                iface.running ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {iface.running ? 'Up' : 'Down'}
              </span>
            </div>
            {iface.comment && (
              <p className="text-sm text-slate-400 mt-1">{iface.comment}</p>
            )}
          </div>
        ))}
      </div>
    ) : (
      <p className="text-slate-400">No interface data available</p>
    )}
  </div>
);
// --- SecurityCard (Refactored for better presentation) ---

const SecurityMetric = ({ icon: Icon, value, label, className = '' }: {
    icon: React.ElementType;
    value: string | number;
    label: string;
    className?: string;
}) => (
    <div className="bg-slate-900/50 p-2 rounded-lg flex items-center space-x-3">
        <div className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full ${className}`}>
            <Icon className="w-4 h-4 text-slate-100" />
        </div>
        <div>
            <div className="text-xl font-bold text-slate-50">{value}</div>
            <div className="text-sm text-slate-400">{label}</div>
        </div>
    </div>
);

export function SecurityCard({ security, logs, blockedIpsCount }: { security: SecurityInfo, logs: LogEntry[], blockedIpsCount: number }) {
    const intrusionAnalysis = useMemo(() => {
        let portScanAttempts = 0;
        let bruteForceAttempts = 0;
        logs.forEach(log => {
            const message = log.message.toLowerCase();
            if (message.includes('port scan') || message.includes('tcp scan')) portScanAttempts++;
            if (message.includes('authentication failure') || message.includes('brute-force')) bruteForceAttempts++;
        });
        return { portScanAttempts, bruteForceAttempts, hasIntrusion: portScanAttempts > 0 || bruteForceAttempts > 0 };
    }, [logs]);

    const firewallRulesCount = Array.isArray(security.firewallRules) ? security.firewallRules.length : security.firewallRules;

    const getSecurityHealth = () => {
        if (firewallRulesCount === 0) {
            return {
                level: 'danger',
                Icon: ShieldAlert,
                message: 'Tidak Terproteksi',
                colorClass: 'text-red-400',
                bgClass: 'bg-red-500/10',
            };
        }
        if (intrusionAnalysis.hasIntrusion) {
            return {
                level: 'warning',
                Icon: ShieldAlert,
                message: 'Potensi Ancaman',
                colorClass: 'text-yellow-400',
                bgClass: 'bg-yellow-500/10',
            };
        }
        return {
            level: 'good',
            Icon: ShieldCheck,
            message: 'Aman',
            colorClass: 'text-cyan-400',
            bgClass: 'bg-cyan-500/10',
        };
    };

    const health = getSecurityHealth();

    return (
        <div className={cardStyle}>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <h3 className="text-lg font-bold text-slate-100 flex items-center">
                    <Shield className="w-5 h-5 mr-3 text-cyan-400" />
                    Tinjauan Keamanan
                </h3>
                <div className={`flex items-center text-sm font-semibold px-3 py-1 rounded-full ${health.bgClass} ${health.colorClass} animate-pulse`}>
                    <health.Icon className="w-4 h-4 mr-2" />
                    {health.message}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SecurityMetric icon={AlertTriangle} value={firewallRulesCount} label="Aturan Firewall" className="bg-orange-500/80" />
                <SecurityMetric icon={Ban} value={blockedIpsCount} label="IP Diblokir" className="bg-red-500/80" />
                <SecurityMetric icon={Network} value={security.activeConnections} label="Koneksi Aktif" className="bg-blue-500/80" />
                <SecurityMetric icon={Users} value={security.dhcpLeases} label="DHCP Leases" className="bg-green-500/80" />
            </div>

            {intrusionAnalysis.hasIntrusion && (
                <div className="mt-6 pt-4 border-t border-slate-700">
                    <h4 className="font-semibold text-yellow-400 mb-3 flex items-center">
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Deteksi Intrusi
                    </h4>
                    <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4 animate-pulse">
                        <ul className="space-y-2">
                            {intrusionAnalysis.portScanAttempts > 0 && (
                                <li className="flex justify-between items-center">
                                    <span className="text-slate-300">Percobaan Port Scan</span>
                                    <span className="bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded text-sm font-medium">
                                        {intrusionAnalysis.portScanAttempts}
                                    </span>
                                </li>
                            )}
                            {intrusionAnalysis.bruteForceAttempts > 0 && (
                                <li className="flex justify-between items-center">
                                    <span className="text-slate-300">Percobaan Brute-force</span>
                                    <span className="bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded text-sm font-medium">
                                        {intrusionAnalysis.bruteForceAttempts}
                                    </span>
                                </li>
                            )}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// KOMPONEN PEMBANTU (HELPER COMPONENTS)
// ============================================================================

const CenteredMessage = ({ icon: Icon, title, children }: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-center justify-center w-full min-h-[calc(100vh-250px)] p-4">
    <div className={`${cardStyle} text-center max-w-md w-full py-12`}>
      <Icon className="w-16 h-16 mx-auto mb-4 text-slate-500" />
      <h2 className="text-2xl font-bold text-slate-100 mb-2">{title}</h2>
      <div className="text-slate-400">{children}</div>
    </div>
  </div>
);

const DeviceSelector = ({ devices, selectedDevice, onDeviceSelect }: {
  devices: Device[];
  selectedDevice: string | null;
  onDeviceSelect: (deviceId: string) => void;
}) => (
  <div className={`${cardStyle}`}>
    <label htmlFor="device-select" className="block text-sm font-medium text-slate-400 mb-2">
      Pilih Perangkat
    </label>
    <select
      id="device-select"
      value={selectedDevice || ''}
      onChange={(e) => onDeviceSelect(e.target.value)}
      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm text-slate-200 px-3 py-2"
    >
      <option value="" disabled>-- Pilih perangkat --</option>
      {devices.map((d) => (
        <option key={d.id} value={d.id}>{d.name}</option>
      ))}
    </select>
  </div>
);

// ============================================================================
// KOMPONEN KONTEN DASHBOARD
// ============================================================================

interface DashboardContentProps {
  selectedDeviceData: Device | null;
  selectedMonitoringData: MonitoringData | null;
  logs: LogEntry[];
  blockedIpsCount: number;
}

const DashboardContent: React.FC<DashboardContentProps> = ({
  selectedDeviceData,
  selectedMonitoringData,
  logs,
  blockedIpsCount,
}) => {
  if (selectedMonitoringData?.error) {
    return (
      <CenteredMessage icon={ServerCrash} title="Koneksi Gagal">
        <p className="text-red-400 bg-red-900/50 px-4 py-2 rounded-md mb-4">
          {selectedMonitoringData.error}
        </p>
        <p className="text-sm text-slate-500">Periksa kembali koneksi dan kredensial perangkat Anda.</p>
      </CenteredMessage>
    );
  }

  if (!selectedDeviceData || !selectedMonitoringData) {
    return (
      <CenteredMessage icon={WifiOff} title="Tidak Ada Data">
        <p>
          {selectedDeviceData
            ? 'Perangkat tidak terhubung atau data sedang dimuat...'
            : 'Pilih perangkat untuk melihat data pemantauan.'}
        </p>
      </CenteredMessage>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {selectedMonitoringData.system && (
          <SystemCard
            system={selectedMonitoringData.system}
            deviceName={selectedDeviceData.name}
          />
        )}
        {selectedMonitoringData.interfaces && (
          <InterfacesCard interfaces={selectedMonitoringData.interfaces} />
        )}
      </div>

      <div className="lg:col-span-1 space-y-6">
        {selectedMonitoringData.security && (
          <SecurityCard
            security={selectedMonitoringData.security}
            logs={logs}
            blockedIpsCount={blockedIpsCount}
          />
        )}
      </div>
    </div>
  );
};


// ============================================================================
// KOMPONEN UTAMA (MAIN COMPONENT)
// ============================================================================

interface DashboardProps {
  devices: Device[];
  monitoringData: Record<string, MonitoringData>;
  selectedDevice: string | null;
  onDeviceSelect: (deviceId: string) => void;
  logs: LogEntry[];
  blockedIpsCount: number;
}

export const Dashboard: React.FC<DashboardProps> = ({
  devices,
  monitoringData,
  selectedDevice,
  onDeviceSelect,
  logs,
  blockedIpsCount,
}) => {
  const navigate = useNavigate();

  const selectedDeviceData = selectedDevice ? devices.find(d => d.id === selectedDevice) || null : null;
  const selectedMonitoringData = selectedDevice ? monitoringData[selectedDevice] : null;

  if (devices.length === 0) {
    return (
      <CenteredMessage icon={Server} title="Dashboard Siap Beraksi!">
        <p className="mb-6">Semua sistem telah siap. Tambahkan perangkat MikroTik Anda untuk mendapatkan wawasan real-time tentang kesehatan dan keamanan jaringan.</p>
        <button
          onClick={() => navigate('/devices')}
          className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold px-6 py-2 rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all duration-300 shadow-md hover:shadow-cyan-500/50"
        >
          Tambah Perangkat
        </button>
      </CenteredMessage>
    );
  }

  return (
    <div className="space-y-6">
      <DeviceSelector
        devices={devices}
        selectedDevice={selectedDevice}
        onDeviceSelect={onDeviceSelect}
      />
      <DashboardContent
        selectedDeviceData={selectedDeviceData}
        selectedMonitoringData={selectedMonitoringData}
        logs={logs}
        blockedIpsCount={blockedIpsCount}
      />
    </div>
  );
};

export default Dashboard;
