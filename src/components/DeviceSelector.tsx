import { Device } from '../types';
import { Server, Wifi, WifiOff, Clock } from 'lucide-react';

interface DeviceSelectorProps {
  devices: Device[];
  selectedDevice: string | null;
  onDeviceSelect: (deviceId: string) => void;
}

export function DeviceSelector({
  devices,
  selectedDevice,
  onDeviceSelect
}: DeviceSelectorProps) {
  const formatLastUpdate = (lastUpdate: string | null) => {
    if (!lastUpdate) return 'Never';
    const date = new Date(lastUpdate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);

    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    return date.toLocaleTimeString();
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
        <Server className="w-5 h-5 mr-2 text-blue-400" />
        Device Selection
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {devices.map((device) => (
          <button
            key={device.id}
            onClick={() => onDeviceSelect(device.id)}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              selectedDevice === device.id
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center">
                {device.connected ? (
                  <Wifi className="w-4 h-4 text-green-400 mr-2" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-400 mr-2" />
                )}
                <h3 className="font-medium text-white truncate">{device.name}</h3>
              </div>
            </div>
            
            <p className="text-sm text-gray-400 mb-2">{device.host}:{device.port}</p>
            
            <div className="flex items-center text-xs text-gray-500">
              <Clock className="w-3 h-3 mr-1" />
              <span>{formatLastUpdate(device.lastUpdate)}</span>
            </div>
            
            {device.error && (
              <p className="text-xs text-red-400 mt-2 truncate" title={device.error}>
                {device.error}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}