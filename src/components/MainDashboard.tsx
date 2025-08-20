import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity,
  RefreshCw,
  Server,
  ServerCrash,
  Network,
  Shield,
  Clock,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Gauge,
  Cpu,
  Thermometer,
  Minus
} from 'lucide-react';
import { Device, MonitoringData, LogEntry } from '../types';
import { SecurityClientsNetworkCard } from './SecurityClientsNetworkCard';
import { InterfacesCard } from './InterfacesCard';

interface MainDashboardProps {
  devices: Device[];
  selectedDeviceId: string | null;
  onDeviceSelect: (deviceId: string) => void;
  monitoringData: Record<string, MonitoringData | { error: string }>;
  logs: LogEntry[];
  blockedIpsCount: number;
  reloadDevice: (deviceId: string) => Promise<void>;
}

const cardStyle = "bg-gradient-to-br from-slate-800/80 to-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 h-full p-6";

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

export const MainDashboard: React.FC<MainDashboardProps> = ({
  devices,
  selectedDeviceId,
  onDeviceSelect,
  monitoringData,
  logs,
  blockedIpsCount,
  reloadDevice
}) => {
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const selectedDevice = selectedDeviceId ? devices.find(d => d.id === selectedDeviceId) : null;
  const selectedMonitoringData = selectedDeviceId ? monitoringData[selectedDeviceId] : null;

  // Refresh data manually
  const refreshData = useCallback(async () => {
    if (!selectedDeviceId) return;
    
    setIsRefreshing(true);
    try {
      await reloadDevice(selectedDeviceId);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedDeviceId, reloadDevice]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (selectedDeviceId) {
      const interval = setInterval(() => {
        refreshData();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [selectedDeviceId, refreshData]);

  // Initial data load
  useEffect(() => {
    if (selectedDeviceId) {
      refreshData();
    }
  }, [selectedDeviceId, refreshData]);

  // Calculate overall system health
  const systemHealth = useMemo(() => {
    if (selectedMonitoringData && 'error' in selectedMonitoringData) {
      return 'critical'; // Or some other appropriate health status for an error
    }
    if (!selectedMonitoringData?.system) return 'unknown';
    
    const { cpuLoad, totalMemory, freeMemory } = selectedMonitoringData.system;
    const memoryUsage = totalMemory && freeMemory ? ((totalMemory - freeMemory) / totalMemory) * 100 : 0;
    
    if (cpuLoad > 90 || memoryUsage > 90) return 'critical';
    if (cpuLoad > 70 || memoryUsage > 70) return 'warning';
    if (cpuLoad > 50 || memoryUsage > 50) return 'moderate';
    return 'good';
  }, [selectedMonitoringData]);

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'good': return 'text-green-400';
      case 'moderate': return 'text-yellow-400';
      case 'warning': return 'text-orange-400';
      case 'critical': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'good': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'moderate': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-orange-400" />;
      case 'critical': return <XCircle className="w-5 h-5 text-red-400" />;
      default: return <Minus className="w-5 h-5 text-slate-400" />;
    }
  };

  // Type guard to check if data is MonitoringData and not an error object
  const isMonitoringData = (data: MonitoringData | { error: string } | null): data is MonitoringData => {
    return data != null && !('error' in data);
  };

  // Main dashboard content
  if (!selectedDevice) {
    return (
      <div className="space-y-6">
        {/* Device Selector */}
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
          <h2 className="text-xl font-bold text-slate-100 mb-4">Pilih Perangkat untuk Monitoring</h2>
          <select
            value={selectedDeviceId || ''}
            onChange={(e) => onDeviceSelect(e.target.value)}
            className="w-full max-w-md bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-lg"
          >
            <option value="">-- Pilih Perangkat --</option>
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name} ({device.host}:{device.port}) - {device.connected ? '🟢 Terhubung' : '🔴 Terputus'}
              </option>
            ))}
          </select>
        </div>
        
        <CenteredMessage icon={Server} title="Dashboard Utama">
          Pilih perangkat dari dropdown di atas untuk melihat overview sistem
        </CenteredMessage>
      </div>
    );
  }

  if (!isMonitoringData(selectedMonitoringData)) {
    // If selectedMonitoringData is null or an error object
    if (selectedMonitoringData && 'error' in selectedMonitoringData) {
      return (
        <div className="space-y-6">
          {/* Device Selector */}
          <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
            <h2 className="text-xl font-bold text-slate-100 mb-4">Perangkat: {selectedDevice.name}</h2>
            <select
              value={selectedDeviceId || ''}
              onChange={(e) => onDeviceSelect(e.target.value)}
              className="w-full max-w-md bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-lg"
            >
              <option value="">-- Pilih Perangkat --</option>
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name} ({device.host}:{device.port}) - {device.connected ? '🟢 Terhubung' : '🔴 Terputus'}
                </option>
              ))}
            </select>
          </div>
          
          <CenteredMessage icon={ServerCrash} title="Koneksi Gagal">
            <p className="text-red-400 bg-red-900/50 px-4 py-2 rounded-md mb-4">
              {selectedMonitoringData.error}
            </p>
            <p className="text-sm text-slate-500">Periksa kembali koneksi dan kredensial perangkat Anda.</p>
          </CenteredMessage>
        </div>
      );
    } else {
      return (
        <div className="space-y-6">
          {/* Device Selector */}
          <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
            <h2 className="text-xl font-bold text-slate-100 mb-4">Perangkat: {selectedDevice.name}</h2>
            <select
              value={selectedDeviceId || ''}
              onChange={(e) => onDeviceSelect(e.target.value)}
              className="w-full max-w-md bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-lg"
            >
              <option value="">-- Pilih Perangkat --</option>
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name} ({device.host}:{device.port}) - {device.connected ? '🟢 Terhubung' : '🔴 Terputus'}
                </option>
              ))}
            </select>
          </div>
          
          <CenteredMessage icon={RefreshCw} title="Memuat Data">
            Data sedang dimuat... Pastikan perangkat terhubung dan dapat diakses.
          </CenteredMessage>
        </div>
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          {/* Device Info */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-100 mb-2">
              {selectedDevice.name}
            </h1>
            <p className="text-slate-400 mb-4">
              {selectedDevice.host}:{selectedDevice.port} • 
              <span className={`ml-2 ${selectedDevice.connected ? 'text-green-400' : 'text-red-400'}`}>
                {selectedDevice.connected ? '🟢 Terhubung' : '🔴 Terputus'}
              </span>
            </p>
            
            {/* Device Selector */}
            <select
              value={selectedDeviceId || ''}
              onChange={(e) => onDeviceSelect(e.target.value)}
              className="w-full max-w-md bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">-- Pilih Perangkat --</option>
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name} ({device.host}:{device.port}) - {device.connected ? '🟢 Terhubung' : '🔴 Terputus'}
                </option>
              ))}
            </select>
          </div>

          {/* System Health & Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center space-x-2">
              {getHealthIcon(systemHealth)}
              <span className={`text-sm font-medium ${getHealthColor(systemHealth)}`}>
                {systemHealth === 'good' ? 'Baik' : systemHealth === 'moderate' ? 'Sedang' : systemHealth === 'warning' ? 'Perlu Perhatian' : 'Kritis'}
              </span>
            </div>
            <button
              onClick={refreshData}
              disabled={isRefreshing}
              className="flex items-center space-x-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Memuat...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Last update info */}
        {lastUpdate && (
          <div className="text-sm text-slate-400 mt-4 pt-4 border-t border-slate-700">
            Terakhir diperbarui: {lastUpdate.toLocaleString('id-ID')}
          </div>
        )}
      </div>

      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* CPU Usage */}
        <div className={cardStyle}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-100">CPU</h3>
            <Cpu className="w-6 h-6 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold text-slate-100 mb-2">
            {selectedMonitoringData.system?.cpuLoad?.toFixed(1) || 0}%
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                (selectedMonitoringData.system?.cpuLoad || 0) > 80 ? 'bg-red-500' :
                (selectedMonitoringData.system?.cpuLoad || 0) > 60 ? 'bg-yellow-500' : 'bg-cyan-500'
              }`}
              style={{ width: `${Math.min(selectedMonitoringData.system?.cpuLoad || 0, 100)}%` }}
            />
          </div>
        </div>

        {/* Memory Usage */}
        <div className={cardStyle}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-100">Memory</h3>
            <Gauge className="w-6 h-6 text-green-400" />
          </div>
          <div className="text-3xl font-bold text-slate-100 mb-2">
            {selectedMonitoringData.system?.totalMemory && selectedMonitoringData.system?.freeMemory ? 
              Math.round(((selectedMonitoringData.system.totalMemory - selectedMonitoringData.system.freeMemory) / selectedMonitoringData.system.totalMemory) * 100) : 0}%
          </div>
          <div className="text-sm text-slate-400">
            {selectedMonitoringData.system?.totalMemory ? 
              `${Math.round((selectedMonitoringData.system.totalMemory - (selectedMonitoringData.system.freeMemory || 0)) / 1024 / 1024)} MB / ${Math.round(selectedMonitoringData.system.totalMemory / 1024 / 1024)} MB` : 'N/A'}
          </div>
        </div>

        {/* Active Connections */}
        <div className={cardStyle}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-100">Connections</h3>
            <Network className="w-6 h-6 text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-slate-100 mb-2">
            {selectedMonitoringData.security?.activeConnections || 0}
          </div>
          <div className="text-sm text-slate-400">Koneksi Aktif</div>
        </div>

        {/* Firewall Rules */}
        <div className={cardStyle}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-100">Firewall</h3>
            <Shield className="w-6 h-6 text-purple-400" />
          </div>
          <div className="text-3xl font-bold text-slate-100 mb-2">
            {Array.isArray(selectedMonitoringData.security?.firewallRules) ? 
              selectedMonitoringData.security.firewallRules.length : 
              selectedMonitoringData.security?.firewallRules || 0}
          </div>
          <div className="text-sm text-slate-400">Aturan Aktif</div>
        </div>
      </div>

      {/* System Details */}
      {selectedMonitoringData.system && (
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
          <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center">
            <Server className="w-6 h-6 mr-2 text-cyan-400" />
            Informasi Sistem
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
              <span className="text-slate-300">Uptime</span>
              <span className="text-slate-100 font-medium">{selectedMonitoringData.system.uptime || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
              <span className="text-slate-300">CPU Load</span>
              <span className="text-slate-100 font-medium">{selectedMonitoringData.system.cpuLoad?.toFixed(1) || 0}%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
              <span className="text-slate-300">Memory Used</span>
              <span className="text-slate-100 font-medium">
                {selectedMonitoringData.system.totalMemory && selectedMonitoringData.system.freeMemory ? 
                  `${Math.round((selectedMonitoringData.system.totalMemory - selectedMonitoringData.system.freeMemory) / 1024 / 1024)} MB` : 'N/A'}
              </span>
            </div>
            {selectedMonitoringData.system.temperature && (
              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                <span className="text-slate-300">Temperature</span>
                <span className="text-slate-100 font-medium flex items-center">
                  <Thermometer className="w-4 h-4 mr-1" />
                  {selectedMonitoringData.system.temperature.toFixed(1)}°C
                </span>
              </div>
            )}
            <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
              <span className="text-slate-300">Disk Usage</span>
              <span className="text-slate-100 font-medium">
                {selectedMonitoringData.system.totalDisk && selectedMonitoringData.system.freeDisk ? 
                  `${Math.round(((selectedMonitoringData.system.totalDisk - selectedMonitoringData.system.freeDisk) / selectedMonitoringData.system.totalDisk) * 100)}%` : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
              <span className="text-slate-300">Version</span>
              <span className="text-slate-100 font-medium">{selectedMonitoringData.system.version || 'N/A'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Security, Clients, Network & Connections */}
      {selectedMonitoringData.security && selectedMonitoringData.network && (
        <div className="w-full">
          <SecurityClientsNetworkCard
            security={selectedMonitoringData.security}
            logs={logs}
            blockedIpsCount={blockedIpsCount}
            network={selectedMonitoringData.network}
          />
        </div>
      )}

      {/* Network Interfaces */}
      {selectedMonitoringData.interfaces && (
        <div className="w-full">
          <InterfacesCard interfaces={selectedMonitoringData.interfaces} />
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
        <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center">
          <Zap className="w-6 h-6 mr-2 text-yellow-400" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => window.location.href = '/firewall'}
            className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition-colors"
          >
            <Shield className="w-5 h-5" />
            <span>Firewall</span>
          </button>
          <button
            onClick={() => window.location.href = '/script-manager'}
            className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg transition-colors"
          >
            <BarChart3 className="w-5 h-5" />
            <span>Scripts</span>
          </button>
          <button
            onClick={() => window.location.href = '/logs'}
            className="flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg transition-colors"
          >
            <Clock className="w-5 h-5" />
            <span>Logs</span>
          </button>
          <button
            onClick={() => window.location.href = '/realtime-dashboard'}
            className="flex items-center justify-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-lg transition-colors"
          >
            <Activity className="w-5 h-5" />
            <span>Real-time</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MainDashboard;
