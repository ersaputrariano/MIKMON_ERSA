import React, { useState } from 'react';
import { 
    Save,
    Download,
    AlertTriangle,
    Loader2,
    DatabaseBackup
} from 'lucide-react';

// ============================================================================
// GAYA VISUAL BERSAMA (SHARED STYLES)
// ============================================================================

const cardStyle = "bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-lg";

// ============================================================================
// KOMPONEN UTAMA: BackupManager
// ============================================================================

export const BackupManager: React.FC<{ selectedDevice: string | null }> = ({ selectedDevice }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleApiCall = async (actionName: string, apiEndpoint: string, deviceId: string) => {
    setLoading(actionName);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await fetch(`/api/monitoring/device/${deviceId}/${apiEndpoint}`, { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `HTTP error! status: ${response.status}`);
      setSuccessMessage(result.message || `Proses ${actionName} berhasil!`);
    } catch (err: unknown) {
      setError(`Gagal melakukan ${actionName}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 text-slate-200 min-h-screen bg-slate-900">
        <h1 className="text-2xl font-bold text-slate-50 flex items-center mb-6">
          <DatabaseBackup className="w-7 h-7 mr-3 text-cyan-400"/>
          Backup & Export Manager
        </h1>

        {!selectedDevice ? (
            <div className={`${cardStyle} p-6 flex flex-col items-center justify-center text-center h-full`}>
                <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4"/>
                <h3 className="text-xl font-semibold text-slate-100">Perangkat Belum Dipilih</h3>
                <p className="text-slate-400 mt-2">Silakan pilih perangkat dari dashboard untuk mengelola backup.</p>
            </div>
        ) : (
            <div className="space-y-6">
                {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm">{error}</div>}
                {successMessage && <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-3 rounded-lg text-sm">{successMessage}</div>}
                
                <div className={`${cardStyle} p-6`}>
                    <h2 className="text-xl font-semibold text-slate-100 mb-2">Buat Backup</h2>
                    <p className="text-slate-400 mb-4 text-sm">Membuat file backup biner pada perangkat MikroTik.</p>
                    <button onClick={() => handleApiCall('backup', 'backup', selectedDevice)} disabled={!!loading} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:bg-slate-600">
                    {loading === 'backup' ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Save className="mr-2 h-5 w-5"/>}
                    Buat Backup
                    </button>
                </div>

                <div className={`${cardStyle} p-6`}>
                    <h2 className="text-xl font-semibold text-slate-100 mb-2">Ekspor Konfigurasi</h2>
                    <p className="text-slate-400 mb-4 text-sm">Mengekspor konfigurasi saat ini sebagai file skrip .rsc.</p>
                    <button onClick={() => handleApiCall('export', 'export-config', selectedDevice)} disabled={!!loading} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-600">
                    {loading === 'export' ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Download className="mr-2 h-5 w-5"/>}
                    Ekspor Konfigurasi
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};

export default BackupManager;
