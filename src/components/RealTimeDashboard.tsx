
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity,
  Wifi,
  WifiOff,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Server,
  ServerCrash,
  Network,
  Shield,
  Clock,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Device, MonitoringData } from '../types';

interface RealTimeDataPoint {
  timestamp: string;
  cpuLoad: number;
  memoryUsage: number;
  networkRx: number;
  networkTx: number;
  activeConnections: number;
  temperature?: number;
}

interface RealTimeDashboardProps {
  devices: Device[];
  selectedDeviceId: string | null;
  onDeviceSelect: (deviceId: string) => void;
  monitoringData: Record<string, MonitoringData | { error: string }>;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
}

const REFRESH_INTERVALS = {
  '1s': 1000,
  '3s': 3000,
  '5s': 5000,
  '10s': 10000,
  '30s': 30000,
  '1m': 60000
};

const COLORS = {
  primary: '#06b6d4',
  secondary: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6'
};

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

export const RealTimeDashboard: React.FC<RealTimeDashboardProps> = ({
  devices,
  selectedDeviceId,
  onDeviceSelect,
  monitoringData,
  connectionStatus
}) => {
  const [historicalData, setHistoricalData] = useState<RealTimeDataPoint[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const selectedDevice = selectedDeviceId ? devices.find(d => d.id === selectedDeviceId) : null;
  const selectedMonitoringData = selectedDeviceId ? monitoringData[selectedDeviceId] : null;

  // Effect to reset historical data when the selected device changes
  useEffect(() => {
    setHistoricalData([]);
  }, [selectedDeviceId]);

  // Effect to update historical data when new monitoring data arrives
  useEffect(() => {
    if (selectedMonitoringData && !('error' in selectedMonitoringData)) {
      const timestamp = new Date().toISOString();
      
      const dataPoint: RealTimeDataPoint = {
        timestamp,
        cpuLoad: selectedMonitoringData.system?.cpuLoad || 0,
        memoryUsage: selectedMonitoringData.system ? 
          ((selectedMonitoringData.system.totalMemory - selectedMonitoringData.system.freeMemory) / selectedMonitoringData.system.totalMemory) * 100 : 0,
        networkRx: selectedMonitoringData.interfaces?.reduce((sum, iface) => 
          sum + parseInt(iface['rx-bits-per-second'] || '0'), 0) / 1000000 || 0,
        networkTx: selectedMonitoringData.interfaces?.reduce((sum, iface) => 
          sum + parseInt(iface['tx-bits-per-second'] || '0'), 0) / 1000000 || 0,
        activeConnections: selectedMonitoringData.security?.activeConnections || 0,
        temperature: selectedMonitoringData.system?.temperature || undefined
      };

      setHistoricalData(prev => {
        const newData = [...prev, dataPoint];
        // Keep only last 100 data points for real-time view
        return newData.slice(-100);
      });

      setLastUpdate(new Date());
    }
  }, [selectedMonitoringData]);

  // Calculate trends and statistics
  const statistics = useMemo(() => {
    if (historicalData.length < 2) return null;

    const latest = historicalData[historicalData.length - 1];
    const previous = historicalData[historicalData.length - 2];

    const calculateTrend = (current: number, prev: number) => {
      const diff = current - prev;
      if (Math.abs(diff) < 0.1) return 'stable';
      return diff > 0 ? 'up' : 'down';
    };

    return {
      current: latest,
      trends: {
        cpu: calculateTrend(latest.cpuLoad, previous.cpuLoad),
        memory: calculateTrend(latest.memoryUsage, previous.memoryUsage),
        networkRx: calculateTrend(latest.networkRx, previous.networkRx),
        networkTx: calculateTrend(latest.networkTx, previous.networkTx),
        connections: calculateTrend(latest.activeConnections, previous.activeConnections)
      },
      averages: {
        cpu: historicalData.reduce((sum, point) => sum + point.cpuLoad, 0) / historicalData.length,
        memory: historicalData.reduce((sum, point) => sum + point.memoryUsage, 0) / historicalData.length,
        networkRx: historicalData.reduce((sum, point) => sum + point.networkRx, 0) / historicalData.length,
        networkTx: historicalData.reduce((sum, point) => sum + point.networkTx, 0) / historicalData.length
      }
    };
  }, [historicalData]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-red-400" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-green-400" />;
      default: return <Minus className="w-4 h-4 text-slate-400" />;
    }
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'connecting': return <RefreshCw className="w-5 h-5 text-yellow-400 animate-spin" />;
      default: return <XCircle className="w-5 h-5 text-red-400" />;
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="p-6 space-y-6 bg-slate-900 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-100 flex items-center">
          <Activity className="w-8 h-8 mr-3 text-cyan-400" />
          Real-Time Monitoring Dashboard
        </h1>
        
        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex items-center space-x-2 px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700">
            {getConnectionStatusIcon()}
            <span className="text-sm text-slate-300 capitalize">{connectionStatus}</span>
          </div>

          {/* Last Update */}
          {lastUpdate && (
            <div className="flex items-center space-x-2 px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-300">
                {lastUpdate.toLocaleTimeString('id-ID')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Device Selector & Status */}
      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-300 mb-2">Pilih Perangkat</label>
            <select
              value={selectedDeviceId || ''}
              onChange={(e) => onDeviceSelect(e.target.value)}
              className="w-full max-w-md bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">Pilih perangkat...</option>
              {devices.map(device => (
                <option key={device.id} value={device.id}>
                  {device.name} ({device.host}:{device.port}) - {device.connected ? '🟢 Terhubung' : '🔴 Terputus'}
                </option>
              ))}
            </select>
          </div>
          
          {/* Status Indicators */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${selectedDevice?.connected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-sm text-slate-300">
                {selectedDevice?.connected ? 'Terhubung' : 'Terputus'}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${historicalData.length > 0 ? 'bg-blue-400' : 'bg-yellow-400'}`}></div>
              <span className="text-sm text-slate-300">
                Data: {historicalData.length > 0 ? `${historicalData.length} points` : 'Belum ada data'}
              </span>
            </div>
          </div>
        </div>

        {/* Error Message if no data */}
        {selectedDevice && !selectedMonitoringData && (
          <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="text-red-300">Data monitoring tidak tersedia. Pastikan perangkat terhubung dan dapat diakses.</span>
            </div>
          </div>
        )}
      </div>

      {!selectedDevice ? (
        <CenteredMessage icon={Server} title="Real-time Monitoring">
          Pilih perangkat dari dropdown di atas untuk memulai monitoring real-time
        </CenteredMessage>
      ) : selectedMonitoringData && 'error' in selectedMonitoringData ? (
        <CenteredMessage icon={ServerCrash} title="Gagal Memuat Data">
          <p className="text-red-400 bg-red-900/50 px-4 py-2 rounded-md mb-4">
            {selectedMonitoringData.error}
          </p>
          <p className="text-sm text-slate-500">Pastikan perangkat terhubung dan dapat diakses.</p>
        </CenteredMessage>
      ) : !selectedMonitoringData ? (
        <CenteredMessage icon={RefreshCw} title="Memuat Data">
          Data monitoring sedang dimuat... Pastikan perangkat terhubung dan dapat diakses.
        </CenteredMessage>
      ) : !statistics ? (
        <CenteredMessage icon={AlertTriangle} title="Data Tidak Cukup">
          Perlu minimal 2 data point untuk menampilkan grafik dan statistik. Tunggu beberapa saat...
        </CenteredMessage>
      ) : (
        <>
          {/* Real-time Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CPU Usage */}
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-blue-400" />
                  <span className="text-sm text-slate-400">CPU Usage</span>
                </div>
                {getTrendIcon(statistics.trends.cpu)}
              </div>
              <div className="text-2xl font-bold text-slate-100">
                {statistics.current.cpuLoad.toFixed(1)}%
              </div>
              <div className="text-xs text-slate-400">
                Avg: {statistics.averages.cpu.toFixed(1)}%
              </div>
            </div>

            {/* Memory Usage */}
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Server className="w-5 h-5 text-green-400" />
                  <span className="text-sm text-slate-400">Memory Usage</span>
                </div>
                {getTrendIcon(statistics.trends.memory)}
              </div>
              <div className="text-2xl font-bold text-slate-100">
                {statistics.current.memoryUsage.toFixed(1)}%
              </div>
              <div className="text-xs text-slate-400">
                Avg: {statistics.averages.memory.toFixed(1)}%
              </div>
            </div>

            {/* Network RX */}
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Network className="w-5 h-5 text-cyan-400" />
                  <span className="text-sm text-slate-400">Network RX</span>
                </div>
                {getTrendIcon(statistics.trends.networkRx)}
              </div>
              <div className="text-2xl font-bold text-slate-100">
                {statistics.current.networkRx.toFixed(2)} Mbps
              </div>
              <div className="text-xs text-slate-400">
                Avg: {statistics.averages.networkRx.toFixed(2)} Mbps
              </div>
            </div>

            {/* Active Connections */}
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-yellow-400" />
                  <span className="text-sm text-slate-400">Connections</span>
                </div>
                {getTrendIcon(statistics.trends.connections)}
              </div>
              <div className="text-2xl font-bold text-slate-100">
                {statistics.current.activeConnections}
              </div>
              <div className="text-xs text-slate-400">
                Active connections
              </div>
            </div>
          </div>

          {/* Real-time Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CPU & Memory Chart */}
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
              <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-cyan-400" />
                CPU & Memory Usage
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={historicalData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={formatTime}
                    stroke="#9CA3AF"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#9CA3AF"
                    fontSize={12}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    labelFormatter={(value) => formatTime(value as string)}
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cpuLoad"
                    stackId="1"
                    stroke={COLORS.primary}
                    fill={COLORS.primary}
                    fillOpacity={0.3}
                    name="CPU (%)"
                  />
                  <Area
                    type="monotone"
                    dataKey="memoryUsage"
                    stackId="2"
                    stroke={COLORS.secondary}
                    fill={COLORS.secondary}
                    fillOpacity={0.3}
                    name="Memory (%)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Network Traffic Chart */}
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
              <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center">
                <Network className="w-5 h-5 mr-2 text-cyan-400" />
                Network Traffic
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={historicalData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={formatTime}
                    stroke="#9CA3AF"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#9CA3AF"
                    fontSize={12}
                  />
                  <Tooltip 
                    labelFormatter={(value) => formatTime(value as string)}
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="networkRx"
                    stroke={COLORS.info}
                    strokeWidth={2}
                    name="RX (Mbps)"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="networkTx"
                    stroke={COLORS.warning}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="TX (Mbps)"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Device Status */}
          <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
            <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center">
              <Server className="w-5 h-5 mr-2 text-cyan-400" />
              Device Status - {selectedDevice.name}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                <span className="text-slate-300">Status</span>
                <div className="flex items-center space-x-2">
                  {selectedDevice.connected ? (
                    <>
                      <Wifi className="w-4 h-4 text-green-400" />
                      <span className="text-green-400">Terhubung</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-4 h-4 text-red-400" />
                      <span className="text-red-400">Terputus</span>
                    </>
                  )}
                </div>
              </div>
              
              {statistics.current.temperature && (
                <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                  <span className="text-slate-300">Temperature</span>
                  <span className="text-slate-100 font-semibold">
                    {statistics.current.temperature.toFixed(1)}°C
                  </span>
                </div>
              )}
              
              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                <span className="text-slate-300">Uptime</span>
                <span className="text-slate-100 font-semibold">
                  {selectedMonitoringData && !('error' in selectedMonitoringData) ? selectedMonitoringData.system?.uptime || 'N/A' : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          </>
      )}
    </div>
  );
};

export default RealTimeDashboard;
