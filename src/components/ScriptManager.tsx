import React, { useState, useEffect, useCallback } from 'react';
import { PlusCircle, Trash2, Play, Terminal, AlertTriangle, X, Loader2 } from 'lucide-react';
import { useAuthFetch } from '../hooks/useAuthFetch';
import { Device } from '../types';

// ============================================================================
// DEFINISI TIPE DATA (TYPES DEFINITION)
// ============================================================================

interface ScriptEntry {
  '.id': string;
  name: string;
  source: string;
}

// ============================================================================
// GAYA VISUAL BERSAMA (SHARED STYLES)
// ============================================================================

const cardStyle = "bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-lg";

// ============================================================================
// KOMPONEN PEMBANTU (HELPER COMPONENTS)
// ============================================================================

// Modal Konfirmasi
const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  isLoading = false
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  isLoading?: boolean;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className={`${cardStyle} w-full max-w-md p-6`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-100 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-3 text-yellow-400" />
            {title}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-slate-400 mb-6 text-sm">{message}</p>
        <div className="flex justify-end gap-4">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md text-slate-300 bg-slate-700 hover:bg-slate-600 transition">
            Batal
          </button>
          <button onClick={onConfirm} disabled={isLoading} className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-600 transition">
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};


// ============================================================================
// KOMPONEN UTAMA: ScriptManager
// ============================================================================



interface ScriptManagerProps {
  selectedDevice: string | null;
  devices?: Device[];
  onDeviceSelect?: (deviceId: string) => void;
}

export const ScriptManager: React.FC<ScriptManagerProps> = ({ 
  selectedDevice, 
  devices = [], 
  onDeviceSelect 
}) => {
  const [scripts, setScripts] = useState<ScriptEntry[]>([]);
  const [newScript, setNewScript] = useState({ name: '', source: '' });
  const [loading, setLoading] = useState<string | boolean>(false); // Can be boolean or string for specific actions
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    action?: 'delete' | 'run';
    scriptId?: string;
    scriptName?: string;
  }>({ isOpen: false });  
  const authFetch = useAuthFetch();

  const fetchScripts = useCallback(async () => {
    if (!selectedDevice) {
      setScripts([]);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching scripts for device: ${selectedDevice}`);
      const response = await authFetch(`/api/monitoring/device/${selectedDevice}/scripts`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`Successfully fetched ${data.length} scripts for device: ${selectedDevice}`);
      setScripts(data || []);
    } catch (err: unknown) {
      console.error('Error fetching scripts:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Gagal memuat skrip: ${errorMessage}`);
      setScripts([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDevice, authFetch]);

  useEffect(() => {
    fetchScripts();
  }, [fetchScripts]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewScript(prev => ({ ...prev, [name]: value }));
  };

  const handleApiCall = async (action: 'add' | 'delete' | 'run', payload?: {
    scriptId?: string;
    scriptName?: string;
  }) => {
    if (!selectedDevice) return;
    setLoading(action);
    setError(null);
    setSuccessMessage(null);
    
    let url = `/api/monitoring/device/${selectedDevice}/scripts`;
    const options: RequestInit = { method: 'POST', headers: { 'Content-Type': 'application/json' }};

    if (action === 'add') {
        options.body = JSON.stringify(newScript);
    } else if (action === 'delete') {
        url += `/${payload.scriptId}`;
        options.method = 'DELETE';
    } else if (action === 'run') {
        url += `/${payload.scriptName}/run`;
    }

    try {
      const response = await authFetch(url, options);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `HTTP error! status: ${response.status}`);
      setSuccessMessage(result.message || `Aksi '${action}' berhasil!`);
      if (action === 'add' || action === 'delete') {
        fetchScripts(); // Refresh list
        if (action === 'add') setNewScript({ name: '', source: '' });
      }
    } catch (err: unknown) {
      setError(`Gagal melakukan aksi '${action}': ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
      setModalState({ isOpen: false });
    }
  };

  const openConfirmation = (action: 'delete' | 'run', scriptId: string, scriptName: string) => {
    setModalState({ isOpen: true, action, scriptId, scriptName });
  };
  
  return (
    <div className="p-4 sm:p-6 text-slate-200 min-h-screen bg-slate-900">
      <ConfirmationModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false })}
        onConfirm={() => {
          if (modalState.action === 'delete' && modalState.scriptId) {
            handleApiCall('delete', { scriptId: modalState.scriptId });
          } else if (modalState.action === 'run' && modalState.scriptName) {
            handleApiCall('run', { scriptName: modalState.scriptName });
          }
        }}
        title={modalState.action === 'delete' ? "Hapus Skrip?" : "Jalankan Skrip?"}
        message={`Anda yakin ingin ${modalState.action === 'delete' ? 'menghapus' : 'menjalankan'} skrip "${modalState.scriptName}"? Aksi ini tidak dapat dibatalkan.`}
        confirmText={modalState.action === 'delete' ? "Ya, Hapus" : "Ya, Jalankan"}
        isLoading={loading === modalState.action}
      />

      <h1 className="text-2xl font-bold text-slate-50 flex items-center mb-6">
        <Terminal className="w-7 h-7 mr-3 text-cyan-400"/>
        Script Manager
      </h1>

      {/* Device Selector */}
      {devices.length > 0 && onDeviceSelect && (
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 mb-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-300 mb-2">Pilih Perangkat</label>
              <select
                value={selectedDevice || ''}
                onChange={(e) => onDeviceSelect(e.target.value)}
                className="w-full max-w-md bg-slate-700 border border-slate-600 text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">-- Pilih Perangkat --</option>
                {devices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.name} ({device.host}:{device.port}) - {device.connected ? '🟢 Terhubung' : '🔴 Terputus'}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Status Device */}
            {selectedDevice && (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${devices.find(d => d.id === selectedDevice)?.connected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  <span className="text-sm text-slate-300">
                    {devices.find(d => d.id === selectedDevice)?.connected ? 'Terhubung' : 'Terputus'}
                  </span>
                </div>
                <div className="text-sm text-slate-400">
                  {devices.find(d => d.id === selectedDevice)?.name}
                </div>
              </div>
            )}
          </div>
          
          {/* Error message jika device tidak terhubung */}
          {selectedDevice && !devices.find(d => d.id === selectedDevice)?.connected && (
            <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <span className="text-red-300">Perangkat tidak terhubung. Script manager memerlukan koneksi aktif ke perangkat.</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pesan jika tidak ada device yang dipilih */}
      {!selectedDevice && (
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 mb-6 text-center">
          <Terminal className="w-16 h-16 mx-auto mb-4 text-slate-500" />
          <h2 className="text-xl font-bold text-slate-100 mb-2">Pilih Perangkat</h2>
          <p className="text-slate-400">Pilih perangkat MikroTik dari dropdown di atas untuk mengelola script.</p>
        </div>
      )}

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm mb-4">{error}</div>}
      {successMessage && <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-3 rounded-lg text-sm mb-4">{successMessage}</div>}

      {selectedDevice && devices.find(d => d.id === selectedDevice)?.connected && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Daftar Skrip */}
        <div className={`${cardStyle} lg:col-span-1 p-4`}>
          <h2 className="text-lg font-semibold text-slate-100 mb-4 px-2">Skrip Tersimpan</h2>
          <div className="max-h-[60vh] overflow-y-auto space-y-2">
            {loading === true && scripts.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                    <Loader2 className="w-8 h-8 mx-auto animate-spin"/>
                </div>
            ) : scripts.length === 0 ? (
              <p className="text-center py-10 text-slate-500 text-sm">Belum ada skrip.</p>
            ) : (
              scripts.map((script) => (
                <div key={script['.id']} className="flex items-center justify-between p-2 rounded-md hover:bg-slate-700/50">
                  <span className="text-sm font-medium text-slate-200">{script.name}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openConfirmation('run', script['.id'], script.name)} className="text-green-400 hover:text-green-300 p-1 rounded-full hover:bg-slate-600 transition" title="Jalankan Skrip">
                      <Play className="h-4 w-4" />
                    </button>
                    <button onClick={() => openConfirmation('delete', script['.id'], script.name)} className="text-red-400 hover:text-red-300 p-1 rounded-full hover:bg-slate-600 transition" title="Hapus Skrip">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Kolom Kanan: Tambah Skrip Baru */}
        <div className={`${cardStyle} lg:col-span-2 p-6`}>
          <h2 className="text-xl font-semibold text-slate-100 mb-4">Tambah Skrip Baru</h2>
          <form onSubmit={(e) => { e.preventDefault(); handleApiCall('add'); }} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-400 mb-1">Nama Skrip</label>
              <input
                type="text" id="name" name="name" value={newScript.name} onChange={handleInputChange}
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 focus:border-cyan-500 focus:ring-cyan-500 transition"
                required
              />
            </div>
            <div>
              <label htmlFor="source" className="block text-sm font-medium text-slate-400 mb-1">Kode Sumber (RouterOS Script)</label>
              <textarea
                id="source" name="source" value={newScript.source} onChange={handleInputChange} rows={12}
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 font-mono text-sm focus:border-cyan-500 focus:ring-cyan-500 transition"
                required
              ></textarea>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={!selectedDevice || loading === 'add'} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:bg-slate-600 transition">
                {loading === 'add' ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <PlusCircle className="mr-2 h-5 w-5"/>}
                Tambah Skrip
              </button>
            </div>
          </form>
        </div>
        </div>
      )}
    </div>
  );
};

export default ScriptManager;
