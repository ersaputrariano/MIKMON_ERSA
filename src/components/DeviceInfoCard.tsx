import React, { useState } from 'react';
import { Server, Wifi, WifiOff, RefreshCw, Loader, AlertTriangle } from 'lucide-react';
import { Device } from '../types';

const cardStyle = "bg-gradient-to-br from-slate-800/80 to-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 h-full p-6";

interface DeviceInfoCardProps {
  device: Device | null;
  onReloadDevice?: (deviceId: string) => Promise<void>;
}

export const DeviceInfoCard: React.FC<DeviceInfoCardProps> = ({
  device,
  onReloadDevice
}) => {
  const [isReloading, setIsReloading] = useState(false);
  
  const handleReload = async () => {
    if (!device || !onReloadDevice) return;
    setIsReloading(true);
    try {
      await onReloadDevice(device.id);
    } catch (error) {
      console.error('Failed to reload device:', error);
      alert('Failed to reload device: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsReloading(false);
    }
  };

  if (!device) return null;
  
  return (
    <div className={cardStyle}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 p-4 rounded-xl border border-cyan-500/30">
            <Server className="w-7 h-7 text-cyan-400"/>
          </div>
          <div>
            <h4 className="font-bold text-slate-100 text-xl">{device.name}</h4>
            <p className="text-sm text-slate-400 font-mono mt-1">ID: {device.id}</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {device.connected ? (
            <div className="flex items-center space-x-2 bg-green-500/10 px-3 py-2 rounded-lg border border-green-500/30">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <Wifi className="w-5 h-5 text-green-400"/>
              <span className="text-sm font-medium text-green-400">Terhubung</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/30">
              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              <WifiOff className="w-5 h-5 text-red-400"/>
              <span className="text-sm font-medium text-red-400">Terputus</span>
            </div>
          )}
          {onReloadDevice && (
            <button
              onClick={handleReload}
              disabled={isReloading}
              className="p-3 rounded-xl text-slate-400 hover:bg-cyan-500/20 hover:text-cyan-400 transition-all duration-200 border border-slate-600 hover:border-cyan-500/50"
              title="Refresh Data"
            >
              {isReloading ? (
                <Loader className="h-5 w-5 animate-spin" />
              ) : (
                <RefreshCw className="h-5 w-5" />
              )}
            </button>
          )}
        </div>
      </div>
      {device.error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <p className="text-sm font-medium text-red-400">Error: {device.error}</p>
          </div>
        </div>
      )}
    </div>
  );
};