import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Download,
  TrendingUp,
  Activity,
  Network,
  Server,
  Clock,
  BarChart3,
  LineChart,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuthFetch } from '../hooks/useAuthFetch';
import { Device, MonitoringData, LogEntry } from '../types';

interface HistoricalDataPoint {
  timestamp: string;
  deviceId: string;
  deviceName: string;
  cpuLoad: number;
  memoryUsage: number;
  diskUsage: number;
  temperature: number | null;
  activeConnections: number;
  firewallRules: number;
  uptime: string;
  interfaces: {
    name: string;
    rxBps: number;
    txBps: number;
    running: boolean;
  }[];
}

interface HistoricalReportsManagerProps {
  devices: Device[];
  selectedDeviceId: string | null;
  onDeviceSelect: (deviceId: string) => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export const HistoricalReportsManager: React.FC<HistoricalReportsManagerProps> = ({
  devices,
  selectedDeviceId,
  onDeviceSelect
}) => {
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isCollecting, setIsCollecting] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h');
  const [selectedMetric, setSelectedMetric] = useState<'cpu' | 'memory' | 'disk' | 'network' | 'connections'>('cpu');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const authFetch = useAuthFetch();

  const tooltipContentStyle: React.CSSProperties = {
    backgroundColor: '#1F2937',
    border: '1px solid #374151',
    borderRadius: '8px',
    color: '#F3F4F6'
  };

  // Collect data from devices
  const collectData = useCallback(async () => {
    if (!devices.length) return;

    setIsCollecting(true);
    const timestamp = new Date().toISOString();

    try {
      for (const device of devices) {
        if (device.connected) {
          try {
            const response = await authFetch(`/api/monitoring/device/${device.id}`);

            if (response.ok) {
              const monitoringData: MonitoringData = await response.json();
              
              const dataPoint: HistoricalDataPoint = {
                timestamp,
                deviceId: device.id,
                deviceName: device.name,
                cpuLoad: monitoringData.system?.cpuLoad || 0,
                memoryUsage: monitoringData.system ? 
                  ((monitoringData.system.totalMemory - monitoringData.system.freeMemory) / monitoringData.system.totalMemory) * 100 : 0,
                diskUsage: monitoringData.system ? 
                  ((monitoringData.system.totalDisk - monitoringData.system.freeDisk) / monitoringData.system.totalDisk) * 100 : 0,
                temperature: monitoringData.system?.temperature || null,
                activeConnections: monitoringData.security?.activeConnections || 0,
                firewallRules: Array.isArray(monitoringData.security?.firewallRules) ? 
                  monitoringData.security.firewallRules.length : (monitoringData.security?.firewallRules || 0),
                uptime: monitoringData.system?.uptime || '0s',
                interfaces: monitoringData.interfaces?.map(iface => ({
                  name: iface.name,
                  rxBps: parseInt(iface['rx-bits-per-second'] || '0'),
                  txBps: parseInt(iface['tx-bits-per-second'] || '0'),
                  running: iface.running
                })) || []
              };

              setHistoricalData(prev => {
                const newData = [...prev, dataPoint];
                // Keep only last 1000 data points to prevent memory issues
                return newData.slice(-1000);
              });
            }
          } catch (error) {
            console.error(`Error collecting data for device ${device.name}:`, error);
          }
        }
      }

      // Collect logs
      try {
        const logsResponse = await authFetch('/api/monitoring/all-logs');

        if (logsResponse.ok) {
          const allLogs: LogEntry[] = await logsResponse.json();
          setLogs(prev => {
            const newLogs = [...prev, ...allLogs];
            // Keep only last 500 log entries
            return newLogs.slice(-500);
          });
        }
      } catch (error) {
        console.error('Error collecting logs:', error);
      }
    } finally {
      setIsCollecting(false);
    }
  }, [devices, authFetch]);

  // Auto-collect data every 30 seconds
  useEffect(() => {
    // Lakukan pengambilan data awal saat komponen dimuat
    collectData();

    if (autoRefresh) {
      const interval = setInterval(collectData, 30000);
      return () => clearInterval(interval);
    }
  }, [devices, autoRefresh, collectData]);

  // Filter data based on time range and selected device
  const filteredData = useMemo(() => {
    const now = new Date();
    const timeRanges = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };

    const cutoff = new Date(now.getTime() - timeRanges[selectedTimeRange]);
    
    return historicalData.filter(point => {
      const pointTime = new Date(point.timestamp);
      const timeMatch = pointTime >= cutoff;
      const deviceMatch = !selectedDeviceId || point.deviceId === selectedDeviceId;
      return timeMatch && deviceMatch;
    });
  }, [historicalData, selectedTimeRange, selectedDeviceId]);

  // Prepare chart data
  const chartData = useMemo(() => {
    interface ChartDataPoint {
      time: string;
      timestamp: string;
      [key: string]: number | string; // Allow dynamic keys with number or string values
    }
    const groupedData = new Map<string, ChartDataPoint>();

    filteredData.forEach(point => {
      const timeKey = new Date(point.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      let existing = groupedData.get(timeKey);
      if (!existing) {
        existing = {
          time: timeKey,
          timestamp: point.timestamp
        };
        groupedData.set(timeKey, existing);
      }

      const deviceKey = point.deviceName;

      switch (selectedMetric) {
        case 'cpu':
          existing[deviceKey] = point.cpuLoad;
          break;
        case 'memory':
          existing[deviceKey] = point.memoryUsage;
          break;
        case 'disk':
          existing[deviceKey] = point.diskUsage;
          break;
        case 'network':
          existing[`${deviceKey}_RX`] = point.interfaces.reduce((sum, iface) => sum + iface.rxBps, 0) / 1000000; // Convert to Mbps
          existing[`${deviceKey}_TX`] = point.interfaces.reduce((sum, iface) => sum + iface.txBps, 0) / 1000000; // Convert to Mbps
          break;
        case 'connections':
          existing[deviceKey] = point.activeConnections;
          break;
      }
    });

    return Array.from(groupedData.values()).sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [filteredData, selectedMetric]);

  // Calculate statistics
  const statistics = useMemo(() => {
    if (!filteredData.length) return null;

    const latest = filteredData[filteredData.length - 1];
    const previous = filteredData[filteredData.length - 2];

    const avgCpu = filteredData.reduce((sum, point) => sum + point.cpuLoad, 0) / filteredData.length;
    const avgMemory = filteredData.reduce((sum, point) => sum + point.memoryUsage, 0) / filteredData.length;
    const maxConnections = Math.max(...filteredData.map(point => point.activeConnections));
    const totalDataPoints = filteredData.length;

    return {
      current: latest,
      previous,
      averages: {
        cpu: avgCpu,
        memory: avgMemory
      },
      maxConnections,
      totalDataPoints,
      timeRange: selectedTimeRange
    };
  }, [filteredData, selectedTimeRange]);

  const exportData = () => {
    const csvContent = [
      ['Timestamp', 'Device', 'CPU Load (%)', 'Memory Usage (%)', 'Disk Usage (%)', 'Temperature (°C)', 'Active Connections', 'Firewall Rules'],
      ...filteredData.map(point => [
        point.timestamp,
        point.deviceName,
        point.cpuLoad.toFixed(2),
        point.memoryUsage.toFixed(2),
        point.diskUsage.toFixed(2),
        point.temperature?.toFixed(1) || 'N/A',
        point.activeConnections,
        point.firewallRules
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mikrotik-historical-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6 bg-slate-900 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-100 flex items-center">
          <BarChart3 className="w-8 h-8 mr-3 text-cyan-400" />
          Historical Reports
        </h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              autoRefresh 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-slate-700 text-slate-300 border border-slate-600'
            }`}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh
          </button>
          <button
            onClick={collectData}
            disabled={isCollecting}
            className="flex items-center px-4 py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/30 transition-colors disabled:opacity-50"
          >
            <Activity className={`w-4 h-4 mr-2 ${isCollecting ? 'animate-pulse' : ''}`} />
            {isCollecting ? 'Collecting...' : 'Collect Now'}
          </button>
          <button
            onClick={exportData}
            className="flex items-center px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
          <label className="block text-sm font-medium text-slate-300 mb-2">Device</label>
          <select
            value={selectedDeviceId || ''}
            onChange={(e) => onDeviceSelect(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="">All Devices</option>
            {devices.map(device => (
              <option key={device.id} value={device.id}>{device.name}</option>
            ))}
          </select>
        </div>

        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
          <label className="block text-sm font-medium text-slate-300 mb-2">Time Range</label>
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as any)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
        </div>

        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
          <label className="block text-sm font-medium text-slate-300 mb-2">Metric</label>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as any)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="cpu">CPU Usage</option>
            <option value="memory">Memory Usage</option>
            <option value="disk">Disk Usage</option>
            <option value="network">Network Traffic</option>
            <option value="connections">Active Connections</option>
          </select>
        </div>

        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
          <label className="block text-sm font-medium text-slate-300 mb-2">Data Points</label>
          <div className="text-2xl font-bold text-cyan-400">{filteredData.length}</div>
          <div className="text-xs text-slate-400">collected</div>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Avg CPU Usage</p>
                <p className="text-2xl font-bold text-slate-100">{statistics.averages.cpu.toFixed(1)}%</p>
              </div>
              <Activity className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Avg Memory Usage</p>
                <p className="text-2xl font-bold text-slate-100">{statistics.averages.memory.toFixed(1)}%</p>
              </div>
              <Server className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Max Connections</p>
                <p className="text-2xl font-bold text-slate-100">{statistics.maxConnections}</p>
              </div>
              <Network className="w-8 h-8 text-yellow-400" />
            </div>
          </div>

          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Current Temperature</p>
                <p className="text-2xl font-bold text-slate-100">
                  {statistics.current.temperature ? `${statistics.current.temperature.toFixed(1)}°C` : 'N/A'}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-red-400" />
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
        <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center">
          <LineChart className="w-5 h-5 mr-2 text-cyan-400" />
          {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Trends
        </h2>
        
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <RechartsLineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="time" 
                stroke="#9CA3AF"
                fontSize={12}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
              />
              { }
              <Tooltip 
                contentStyle={tooltipContentStyle}
              />
              <Legend />
              {devices.map((device, index) => {
                if (selectedDeviceId && device.id !== selectedDeviceId) return null;
                
                if (selectedMetric === 'network') {
                  return (
                    <React.Fragment key={device.id}>
                      { }
                      <Line
                        type="monotone"
                        dataKey={`${device.name}_RX`}
                        stroke={COLORS[index * 2 % COLORS.length]}
                        strokeWidth={2}
                        name={`${device.name} RX (Mbps)`}
                      />
                      <Line
                        type="monotone"
                        dataKey={`${device.name}_TX`}
                        stroke={COLORS[(index * 2 + 1) % COLORS.length]}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name={`${device.name} TX (Mbps)`}
                      />
                    </React.Fragment>
                  );
                }
                
                return (
                  <Line
                    key={device.id}
                    type="monotone"
                    dataKey={device.name}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={2}
                    name={device.name}
                  />
                );
              })}
            </RechartsLineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-slate-400">
            <div className="text-center">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No data available for the selected time range</p>
              <p className="text-sm mt-2">Data collection will begin automatically</p>
            </div>
          </div>
        )}
      </div>

      {/* Recent Logs */}
      <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
        <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center">
          <Clock className="w-5 h-5 mr-2 text-cyan-400" />
          Recent System Logs
        </h2>
        
        <div className="max-h-64 overflow-y-auto space-y-2">
          {logs.slice(-20).reverse().map((log, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 bg-slate-900/50 rounded-lg">
              <div className="flex-shrink-0 mt-1">
                {log.topics.includes('error') || log.topics.includes('critical') ? (
                  <XCircle className="w-4 h-4 text-red-400" />
                ) : log.topics.includes('warning') ? (
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-200">{log.topics}</p>
                  <p className="text-xs text-slate-400">{log.time}</p>
                </div>
                <p className="text-sm text-slate-300 mt-1">{log.message}</p>
              </div>
            </div>
          ))}
          
          {logs.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No logs available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
