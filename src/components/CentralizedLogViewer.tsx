import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FileText, Search, AlertCircle, Info, AlertTriangle, ChevronsRight, RefreshCw, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ============================================================================
// DEFINISI TIPE DATA (TYPES DEFINITION)
// ============================================================================

// Asumsi tipe data ini ada di proyek Anda
interface DeviceLogEntry {
  id: string; // Menambahkan ID unik untuk key yang lebih stabil
  deviceName?: string;
  time: string;
  topics: string;
  message: string;
}

// ============================================================================
// KOMPONEN PEMBANTU (HELPER COMPONENTS)
// ============================================================================

const cardStyle = "bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-lg";

// Komponen untuk setiap baris log dengan pewarnaan
const LogEntryRow = ({ log }: { log: DeviceLogEntry }) => {
  const { icon, colorClass, bgColorClass } = useMemo(() => {
    const topics = log.topics.toLowerCase();
    if (topics.includes('error') || topics.includes('critical')) {
      return { icon: <AlertCircle className="w-4 h-4 text-red-400" />, colorClass: 'text-red-400', bgColorClass: 'bg-red-500/10 hover:bg-red-500/20' };
    }
    if (topics.includes('warning')) {
      return { icon: <AlertTriangle className="w-4 h-4 text-yellow-400" />, colorClass: 'text-yellow-400', bgColorClass: 'bg-yellow-500/10 hover:bg-yellow-500/20' };
    }
    if (topics.includes('info')) {
      return { icon: <Info className="w-4 h-4 text-blue-400" />, colorClass: 'text-blue-400', bgColorClass: 'bg-blue-500/10 hover:bg-blue-500/20' };
    }
    return { icon: <ChevronsRight className="w-4 h-4 text-slate-500" />, colorClass: 'text-slate-400', bgColorClass: 'bg-slate-800/0 hover:bg-slate-700/40' };
  }, [log.topics]);

  return (
    <div className={`flex items-start p-2.5 rounded-md transition-colors duration-200 font-mono text-sm ${bgColorClass}`}>
      <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center mr-3 mt-0.5">{icon}</div>
      <div className="flex-grow">
        <div className="flex items-baseline space-x-3">
          <span className="text-slate-500 w-20 flex-shrink-0">{log.time.split(' ')[1] || log.time}</span>
          <span className={`font-semibold w-28 flex-shrink-0 ${colorClass}`}>[{log.deviceName || 'Unknown'}]</span>
          <span className="text-slate-300">{log.message}</span>
        </div>
      </div>
    </div>
  );
};


// ============================================================================
// KOMPONEN UTAMA (MAIN COMPONENT)
// ============================================================================

export const CentralizedLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<DeviceLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [logError, setLogError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState<string>('');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterDevice, setFilterDevice] = useState<string>('all');
  const { token } = useAuth();
  
  // Get unique device names for the device filter
  const deviceNames = useMemo(() => {
    const names = logs.map(log => log.deviceName).filter((name): name is string => name !== undefined);
    return [...new Set(names)];
  }, [logs]);

  // Mengambil data log dari API
  const fetchAllLogs = useCallback(async () => {
    // Hanya tampilkan loader utama saat pertama kali memuat
    if (logs.length === 0) {
      setLoadingLogs(true);
    }
    setLogError(null);
    try {
      const response = await fetch('/api/monitoring/all-logs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: DeviceLogEntry[] = await response.json();
      // Asumsi API mengembalikan log dengan ID unik dan diurutkan dari yang terbaru
      setLogs(data);
    } catch (err: unknown) {
      setLogError(`Gagal memuat log: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoadingLogs(false);
    }
  }, [logs.length, token]);

  useEffect(() => {
    fetchAllLogs();
    const interval = setInterval(fetchAllLogs, 5000); // Refresh logs setiap 5 detik
    return () => clearInterval(interval);
  }, [fetchAllLogs]);

  const filteredLogs = useMemo(() => {
    // First filter by text search
    let result = logs.filter(log =>
      log.message.toLowerCase().includes(filterText.toLowerCase()) ||
      log.topics.toLowerCase().includes(filterText.toLowerCase()) ||
      (log.deviceName && log.deviceName.toLowerCase().includes(filterText.toLowerCase()))
    );
    
    // Then filter by log level
    if (filterLevel !== 'all') {
      result = result.filter(log => {
        const topics = log.topics.toLowerCase();
        switch (filterLevel) {
          case 'error':
            return topics.includes('error') || topics.includes('critical');
          case 'warning':
            return topics.includes('warning');
          case 'info':
            return topics.includes('info');
          default:
            return true;
        }
      });
    }
    
    // Then filter by device
    if (filterDevice !== 'all') {
      result = result.filter(log => log.deviceName === filterDevice);
    }
    
    // Reverse the order to show newest logs first
    return result.reverse();
  }, [logs, filterText, filterLevel, filterDevice]);

  return (
    <div className="p-4 sm:p-6 text-slate-200 min-h-screen bg-slate-900">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-slate-50 flex items-center">
          <FileText className="w-7 h-7 mr-3 text-cyan-400"/>
          Centralized Log Viewer
        </h1>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Cari log..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full sm:w-64 bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 focus:border-cyan-500 focus:ring-cyan-500 transition"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 focus:border-cyan-500 focus:ring-cyan-500 transition text-slate-200"
            >
              <option value="all">Semua Level</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
            <select
              value={filterDevice}
              onChange={(e) => setFilterDevice(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 focus:border-cyan-500 focus:ring-cyan-500 transition text-slate-200"
              disabled={deviceNames.length === 0}
            >
              <option value="all">Semua Perangkat</option>
              {deviceNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className={`${cardStyle} overflow-hidden`}>
        <div className="p-4 flex justify-between items-center border-b border-slate-700">
          <h2 className="text-lg font-semibold text-slate-100">Semua Log</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">{filteredLogs.length} entri ditampilkan</span>
            <button onClick={fetchAllLogs} disabled={loadingLogs && logs.length > 0} className="text-slate-400 hover:text-cyan-400 disabled:text-slate-600 transition">
              {loadingLogs && logs.length > 0 ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="h-[65vh] overflow-y-auto p-4 space-y-1">
          {loadingLogs && logs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <Loader2 className="w-10 h-10 animate-spin mb-4" />
              <p className="text-lg">Memuat Log...</p>
            </div>
          )}
          {logError && (
             <div className="flex flex-col items-center justify-center h-full text-red-400">
              <AlertCircle className="w-10 h-10 mb-4" />
              <p className="text-lg font-semibold">Terjadi Kesalahan</p>
              <p className="text-sm">{logError}</p>
            </div>
          )}
          {filteredLogs.length === 0 && !loadingLogs && !logError && (
             <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <Search className="w-10 h-10 mb-4" />
              <p className="text-lg font-semibold">Tidak Ada Log</p>
              <p className="text-sm">Tidak ada log yang cocok dengan filter Anda.</p>
            </div>
          )}
          {filteredLogs.map((log) => (
            <LogEntryRow key={log.id} log={log} />
          ))}
        </div>
      </div>
    </div>
  );
};
