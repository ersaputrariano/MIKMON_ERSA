import React, { useMemo, useState } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Network,
  Users,
  Ban,
  Signal,
  Zap,
  ArrowRight
} from 'lucide-react';
import { LogEntry, SecurityInfo, NetworkInfo } from '../types';

const cardStyle = "bg-gradient-to-br from-slate-800/80 to-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 h-full p-6";

interface SecurityClientsNetworkCardProps {
  security: SecurityInfo;
  logs: LogEntry[];
  blockedIpsCount: number;
  network: NetworkInfo;
}

export const SecurityClientsNetworkCard: React.FC<SecurityClientsNetworkCardProps> = ({
  security,
  logs,
  blockedIpsCount,
  network
}) => {
  const [activeTab, setActiveTab] = useState<'security' | 'clients' | 'network' | 'connections'>('security');
  const [showAllConnections, setShowAllConnections] = useState(false);
  
  // Konten koneksi aktif (diekstrak dari NetworkCard)
  const networkActiveConnections = network?.activeConnections || [];
  const displayedConnections = networkActiveConnections
    ? (showAllConnections
      ? networkActiveConnections
      : networkActiveConnections.slice(0, 5))
    : [];
  
  // Konten komponen keamanan (diekstrak dari SecurityCard)
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
        bgColor: 'bg-red-500/10',
        barColor: 'bg-red-500',
      };
    }
    if (intrusionAnalysis.hasIntrusion) {
      return {
        level: 'warning',
        Icon: ShieldAlert,
        message: 'Potensi Ancaman',
        colorClass: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10',
        barColor: 'bg-yellow-500',
      };
    }
    return {
      level: 'good',
      Icon: ShieldCheck,
      message: 'Aman',
      colorClass: 'text-green-400',
      bgColor: 'bg-green-500/10',
      barColor: 'bg-green-500',
    };
  };

  const health = getSecurityHealth();

  const securityScore = firewallRulesCount > 0 ?
    (intrusionAnalysis.hasIntrusion ? 50 : 80) + Math.min(20, blockedIpsCount / 10) :
    20;

  const securityMetrics = [
    { icon: AlertTriangle, value: firewallRulesCount, label: "Aturan Firewall", color: "text-orange-400" },
    { icon: Ban, value: blockedIpsCount, label: "IP Diblokir", color: "text-red-400" },
    { icon: Network, value: security.activeConnections, label: "Koneksi Aktif", color: "text-blue-400" },
    { icon: Users, value: security.dhcpLeases, label: "DHCP Leases", color: "text-green-400" },
  ];
  
  // Konten komponen klien (diekstrak dari ConnectedClientsCard)
  const uniqueClients = useMemo(() => {
    const dhcpLeases = network.dhcpLeases || [];
    const activeConnections = network.activeConnections || [];
    
    const clients = new Map<string, { address: string; hostName?: string; macAddress?: string }>();
    dhcpLeases.forEach(lease => {
      clients.set(lease.address, {
        address: lease.address,
        hostName: lease.hostName,
        macAddress: lease.macAddress
      });
    });
    activeConnections.forEach(conn => {
      const srcAddress = conn.srcAddress.split(':')[0];
      if (!clients.has(srcAddress)) {
        clients.set(srcAddress, {
          address: srcAddress,
          hostName: 'Unknown Device'
        });
      }
    });
    return Array.from(clients.values());
  }, [network.dhcpLeases, network.activeConnections]);
  
  // Konten status jaringan (diekstrak dari NetworkCard)
  const flattenNetworkData = (data: NetworkInfo, prefix = ''): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const key in data) {
      if (typeof data[key] === 'object' && data[key] !== null && !Array.isArray(data[key])) {
        Object.assign(result, flattenNetworkData(data[key] as unknown as NetworkInfo, `${prefix}${key}.`));
      } else {
        result[`${prefix}${key}`] = data[key];
      }
    }
    return result;
  };

  const flattenedNetwork = flattenNetworkData(network);

  const metrics = [
    { label: 'Gateway', value: flattenedNetwork.gateway || flattenedNetwork['gateway'] || flattenedNetwork.defaultGateway || '-' },
    { label: 'DNS', value: flattenedNetwork.dns || flattenedNetwork['dns-server'] || flattenedNetwork['dns1'] || '-' },
    { label: 'IP Address', value: flattenedNetwork.address || flattenedNetwork['ip-address'] || flattenedNetwork.ip || flattenedNetwork['ip.address'] || '-' },
    { label: 'Subnet Mask', value: flattenedNetwork.subnet || flattenedNetwork['subnet-mask'] || flattenedNetwork.netmask || '-' },
    { label: 'Interface', value: flattenedNetwork.interface || flattenedNetwork['interface-name'] || flattenedNetwork['interface.name'] || '-' },
    { label: 'Status', value: flattenedNetwork.status || flattenedNetwork.state || (flattenedNetwork.running ? 'Connected' : 'Disconnected') || '-' },
  ];

  const networkHealth = metrics.some(metric => metric.value === '-' || !metric.value) ? 'warning' : 'good';
  
  return (
    <div className={cardStyle}>
      {/* --- Navigasi Tab yang Didesain Ulang --- */}
      <div className="flex border-b border-slate-700 mb-4">
        {['security', 'clients', 'network', 'connections'].map((tab) => {
          const icons = {
            security: Shield,
            clients: Users,
            network: Network,
            connections: Signal
          } as const;
          const labels = {
            security: 'Keamanan',
            clients: 'Perangkat',
            network: 'Jaringan',
            connections: 'Koneksi'
          } as const;
          const Icon = icons[tab as keyof typeof icons];
          return (
            <button
              key={tab}
              className={`flex items-center justify-center -mb-px py-2 px-3 sm:px-4 font-medium text-sm transition-colors duration-200 ${
                activeTab === tab
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-slate-400 hover:text-slate-200 border-b-2 border-transparent'
              }`}
              onClick={() => setActiveTab(tab as 'security' | 'clients' | 'network' | 'connections')}
            >
              <Icon className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{labels[tab as keyof typeof labels]}</span>
            </button>
          );
        })}
      </div>
      
      {/* --- Konten Tab --- */}
      <div className="min-h-[250px]">
        {activeTab === 'security' ? (
          // Konten Keamanan
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-100">Tinjauan Keamanan</h3>
              <div className={`flex items-center text-xs font-semibold px-3 py-1 rounded-full ${health.bgColor} ${health.colorClass}`}>
                <health.Icon className="w-4 h-4 mr-2" />
                {health.message}
              </div>
            </div>

            <div className="mb-6">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-400">Skor Keamanan</span>
                <span className="font-bold text-slate-100">{Math.round(securityScore)}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${health.barColor} transition-all duration-500 ease-out`}
                  style={{ width: `${securityScore}%` }}
                />
              </div>
            </div>

            {/* --- Metrik Keamanan dalam Grid --- */}
            <div className="grid grid-cols-2 gap-4">
              {securityMetrics.map((metric) => (
                <div key={metric.label} className="bg-slate-900/50 p-3 rounded-lg flex items-start space-x-3">
                  <metric.icon className={`w-5 h-5 mt-1 ${metric.color} shrink-0`} />
                  <div>
                    <p className="text-lg font-bold text-slate-100">{metric.value}</p>
                    <p className="text-xs text-slate-400">{metric.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {intrusionAnalysis.hasIntrusion && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <div className="flex items-center text-sm font-semibold text-yellow-400 mb-2">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Deteksi Intrusi
                </div>
                <div className="space-y-2 text-sm">
                  {intrusionAnalysis.portScanAttempts > 0 && (
                    <div className="flex justify-between bg-yellow-900/30 p-2 rounded-md">
                      <span className="text-slate-300">Port Scan</span>
                      <span className="font-bold text-yellow-400">{intrusionAnalysis.portScanAttempts}</span>
                    </div>
                  )}
                  {intrusionAnalysis.bruteForceAttempts > 0 && (
                    <div className="flex justify-between bg-yellow-900/30 p-2 rounded-md">
                      <span className="text-slate-300">Brute Force</span>
                      <span className="font-bold text-yellow-400">{intrusionAnalysis.bruteForceAttempts}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'clients' ? (
          // Konten Klien
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-100">Perangkat Terhubung</h3>
              <div className="text-sm font-semibold text-slate-400">
                {uniqueClients.length} perangkat
              </div>
            </div>
            
            {uniqueClients.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Tidak ada perangkat terhubung</p>
              </div>
            ) : (
              // --- Daftar Klien yang Didesain Ulang ---
              <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                {uniqueClients.map((client, index) => (
                  <div key={index} className="bg-slate-900/50 p-3 rounded-lg flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-slate-200">{client.hostName || 'Unknown Device'}</p>
                      <p className="text-xs text-slate-400">{client.address}</p>
                    </div>
                    <p className="text-xs text-slate-500 font-mono">{client.macAddress || '-'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'connections' ? (
          // Konten Koneksi Aktif
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-100">Koneksi Aktif</h3>
              <div className="text-sm font-semibold text-slate-400">
                {networkActiveConnections.length} koneksi
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              {displayedConnections.length > 0 ? (
                displayedConnections.map((conn, index) => (
                  <div
                    key={index}
                    className="bg-slate-900/50 rounded-lg p-3 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-3">
                      <Zap className="w-4 h-4 text-yellow-400 shrink-0" />
                      <div className="font-mono">
                        <p className="text-slate-200">{conn.srcAddress}</p>
                        <p className="text-slate-400 flex items-center"><ArrowRight className="w-3 h-3 mx-1" />{conn.dstAddress}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded-full text-white text-[10px] ${
                        conn.state === 'established' ? 'bg-green-500/80' : 'bg-slate-600'
                      }`}>
                        {conn.state}
                      </span>
                      <p className="text-slate-500 mt-1">{conn.protocol}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Signal className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Tidak ada koneksi aktif</p>
                </div>
              )}

              {networkActiveConnections.length > 5 && (
                <button
                  onClick={() => setShowAllConnections(!showAllConnections)}
                  className="w-full text-cyan-400 hover:text-cyan-300 text-sm py-2 transition-colors"
                >
                  {showAllConnections
                    ? 'Tampilkan Lebih Sedikit'
                    : `Tampilkan ${networkActiveConnections.length - 5} Lainnya`}
                </button>
              )}
            </div>
          </div>
        ) : (
          // Konten Status Jaringan
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-100">Status Jaringan</h3>
              <div className={`text-sm font-semibold ${networkHealth === 'good' ? 'text-green-400' : 'text-yellow-400'}`}>
                {networkHealth === 'good' ? 'Stabil' : 'Perlu Perhatian'}
              </div>
            </div>
            
            {/* --- Metrik Jaringan dalam Grid --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {metrics.map((metric, index) => (
                <div key={index} className="flex justify-between items-center text-sm py-1 border-b border-slate-700/50">
                  <span className="text-slate-400">{metric.label}</span>
                  <span className="text-slate-200 font-medium text-right break-all">{String(metric.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};