import React, { useState, useEffect, useCallback } from 'react';
import { Device as DeviceType } from '../types';

type NewDevice = {
  name: string;
  host: string;
  username: string;
  password: string;
  port: number | '';
};
import { useAuthFetch } from '../hooks/useAuthFetch';
import { PlusCircle, Trash2, Wifi, WifiOff, Loader, X, AlertCircle, Server, RefreshCw } from 'lucide-react';

// --- Gaya Umum ---
const cardStyle = "bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-lg p-4 sm:p-6";
const inputStyle = "mt-1 block w-full bg-slate-700/50 border border-slate-600 rounded-lg shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm text-slate-200 px-3 py-2 transition-colors";
const buttonStyle = "w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-semibold rounded-lg shadow-sm text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-slate-800 disabled:opacity-50 transition-all";

// --- Komponen Anak ---

const Notification = ({ message, type, onDismiss }: { message: string; type: 'error' | 'success'; onDismiss: () => void }) => {
  const isError = type === 'error';
  const baseClasses = "px-4 py-3 rounded-lg relative mb-6 flex items-center";
  const typeClasses = isError
    ? "bg-red-500/20 border border-red-500/30 text-red-400"
    : "bg-green-500/20 border border-green-500/30 text-green-400";

  return (
    <div className={`${baseClasses} ${typeClasses}`}>
      {isError && <AlertCircle className="w-5 h-5 mr-3"/>}
      <span>{message}</span>
      <button onClick={onDismiss} className="absolute top-0 bottom-0 right-0 px-4 py-3">
        <X className="h-5 w-5"/>
      </button>
    </div>
  );
};

const DeleteConfirmationModal = ({ device, onConfirm, onCancel, isLoading }: { device: DeviceType | null; onConfirm: (deviceId: string) => void; onCancel: () => void; isLoading: boolean }) => {
  if (!device) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`${cardStyle} max-w-sm w-full`}>
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-500/20">
            <Trash2 className="h-6 w-6 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-100 mt-4">Hapus Perangkat?</h3>
          <p className="text-sm text-slate-400 mt-2">
            Yakin ingin menghapus <span className="font-bold text-slate-200">{device.name}</span>? Tindakan ini tidak dapat dibatalkan.
          </p>
        </div>
        <div className="mt-6 flex justify-center space-x-4">
          <button onClick={onCancel} disabled={isLoading} className="px-4 py-2 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors disabled:opacity-50">Batal</button>
          <button onClick={() => onConfirm(device.id)} disabled={isLoading} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center disabled:opacity-50">
            {isLoading && <Loader className="animate-spin mr-2 h-4 w-4" />} Hapus
          </button>
        </div>
      </div>
    </div>
  );
};

const AddDeviceForm = ({ newDevice, onInputChange, onAddDevice, isLoading }: { newDevice: NewDevice; onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void; onAddDevice: (e: React.FormEvent) => void; isLoading: boolean }) => (
  <div className={`${cardStyle} h-fit`}>
    <h2 className="text-xl font-semibold text-white mb-4">Tambah Perangkat Baru</h2>
    <form onSubmit={onAddDevice} className="space-y-4">
      {/* Mapping untuk membuat input fields */}
      {[
        { name: 'name', label: 'Nama', type: 'text' },
        { name: 'host', label: 'Host / IP Address', type: 'text' },
        { name: 'username', label: 'Username', type: 'text' },
        { name: 'password', label: 'Password', type: 'password' },
        { name: 'port', label: 'Port (default: 8728)', type: 'number' },
      ].map(field => (
        <div key={field.name}>
          <label htmlFor={field.name} className="block text-sm font-medium text-slate-400">{field.label}</label>
          <input type={field.type} id={field.name} name={field.name} value={newDevice[field.name as keyof NewDevice]} onChange={onInputChange} className={inputStyle} required={field.type !== 'number'} />
        </div>
      ))}
      <div className="pt-2">
        <button type="submit" className={buttonStyle} disabled={isLoading}>
          {isLoading ? <Loader className="animate-spin mr-2 h-5 w-5" /> : <PlusCircle className="-ml-1 mr-2 h-5 w-5" />}
          Tambah Perangkat
        </button>
      </div>
    </form>
  </div>
);

const DeviceListItem = ({ device, onSetDeviceToDelete, onReloadDevice, isLoading, reloadingDeviceId }: { device: DeviceType; onSetDeviceToDelete: (device: DeviceType) => void; onReloadDevice: (deviceId: string) => void; isLoading: boolean; reloadingDeviceId: string | null; }) => (
  <li className={`${cardStyle} flex items-center justify-between`}>
    <div>
      <p className="text-lg font-medium text-slate-100">{device.name}</p>
      <p className="text-sm text-slate-400">{device.host}<span className="sm:inline hidden">:{device.port}</span></p>
      <div className="mt-2 flex items-center space-x-2">
        {device.connected ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400"><Wifi className="-ml-0.5 mr-1 h-3 w-3" /> Terhubung</span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400"><WifiOff className="-ml-0.5 mr-1 h-3 w-3" /> Terputus</span>
        )}
        {device.error && <p className="text-xs text-red-400 truncate" title={device.error}>Error: {device.error}</p>}
      </div>
    </div>
    <div className="flex space-x-2">
      <button
        onClick={() => onReloadDevice(device.id)}
        className="p-2 rounded-full text-slate-500 hover:bg-cyan-500/20 hover:text-cyan-500 transition-colors"
        disabled={isLoading || reloadingDeviceId === device.id}
      >
        {reloadingDeviceId === device.id ? (
          <Loader className="h-5 w-5 animate-spin" />
        ) : (
          <RefreshCw className="h-5 w-5" />
        )}
      </button>
      <button onClick={() => onSetDeviceToDelete(device)} className="p-2 rounded-full text-slate-500 hover:bg-red-500/20 hover:text-red-500 transition-colors" disabled={isLoading}>
        <Trash2 className="h-5 w-5" />
      </button>
    </div>
  </li>
);

const DeviceListSkeleton = () => (
    <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
            <div key={i} className={`${cardStyle} animate-pulse flex items-center justify-between`}>
                <div>
                    <div className="h-5 w-32 bg-slate-700 rounded"></div>
                    <div className="h-4 w-40 bg-slate-700 rounded mt-2"></div>
                </div>
                <div className="h-8 w-8 bg-slate-700 rounded-full"></div>
            </div>
        ))}
    </div>
);

// --- Komponen Utama ---
export const DeviceManager: React.FC = () => {
  const [devices, setDevices] = useState<DeviceType[]>([]);
  const [newDevice, setNewDevice] = useState<NewDevice>({ name: '', host: '', username: '', password: '', port: 8728 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deviceToDelete, setDeviceToDelete] = useState<DeviceType | null>(null);
  const [reloadingDeviceId, setReloadingDeviceId] = useState<string | null>(null);

  const authFetch = useAuthFetch();

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch('/api/devices');
      const data = await response.json();
      setDevices(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to fetch devices: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => { fetchDevices(); }, [fetchDevices]);
  
  useEffect(() => {
    if (successMessage || error) {
      const timer = setTimeout(() => { setSuccessMessage(null); setError(null); }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, error]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewDevice(prev => ({ ...prev, [name]: name === 'port' ? (value === '' ? '' : parseInt(value, 10)) : value }));
  };

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      // Ensure port is a number, default to 8728 if empty
      const deviceData = {
        name: newDevice.name.trim(),
        host: newDevice.host.trim(),
        username: newDevice.username.trim(),
        password: newDevice.password.trim(),
        port: newDevice.port === '' ? 8728 : Number(newDevice.port)
      };
      
      const response = await authFetch('/api/devices', {
        method: 'POST',
        body: JSON.stringify(deviceData),
      });
      
      const result = await response.json();
      
      setSuccessMessage(`Device '${result.device.name}' added successfully!`);
      setNewDevice({ name: '', host: '', username: '', password: '', port: 8728 });
      fetchDevices(); // Refresh the list
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to add device: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await authFetch(`/api/devices/${deviceId}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      setSuccessMessage(result.message || 'Device deleted successfully!');
      fetchDevices(); // Refresh the list
      setDeviceToDelete(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to delete device: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const reloadDevice = async (deviceId: string) => {
    setReloadingDeviceId(deviceId);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await authFetch(`/api/devices/${deviceId}/reload`, {
        method: 'POST',
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSuccessMessage(result.message || 'Device reloaded successfully!');
        // Refresh the device list to show updated status
        fetchDevices();
      } else {
        setError(result.message || 'Failed to reload device');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to reload device: ${message}`);
    } finally {
      setReloadingDeviceId(null);
    }
  };

  return (
    <>
      <DeleteConfirmationModal device={deviceToDelete} onConfirm={handleDeleteDevice} onCancel={() => setDeviceToDelete(null)} isLoading={loading} />
      <main className="grow p-4 sm:p-6 lg:p-8 text-slate-200">
        <h1 className="text-3xl font-bold text-white mb-8">Device Manager</h1>
        {error && <Notification message={error} type="error" onDismiss={() => setError(null)} />}
        {successMessage && <Notification message={successMessage} type="success" onDismiss={() => setSuccessMessage(null)} />}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <AddDeviceForm newDevice={newDevice} onInputChange={handleInputChange} onAddDevice={handleAddDevice} isLoading={loading} />
          
          <div className="xl:col-span-2">
            <h2 className="text-xl font-semibold text-white mb-4">Perangkat Terkonfigurasi</h2>
            {loading ? (
              <DeviceListSkeleton />
            ) : devices.length === 0 ? (
              <div className={`${cardStyle} text-center py-12`}>
                <Server className="mx-auto h-12 w-12 text-slate-500" />
                <p className="mt-4 text-slate-400">Belum ada perangkat yang dikonfigurasi.</p>
                <p className="text-sm text-slate-500">Gunakan formulir di samping untuk menambahkan.</p>
              </div>
            ) : (
              <ul className="space-y-4">
                {devices.map(device => <DeviceListItem key={device.id} device={device} onSetDeviceToDelete={setDeviceToDelete} onReloadDevice={reloadDevice} isLoading={loading} reloadingDeviceId={reloadingDeviceId} />)}
              </ul>
            )}
          </div>
        </div>
      </main>
    </>
  );
};

export default DeviceManager;
