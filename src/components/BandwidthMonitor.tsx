import React, { useState, useEffect } from 'react';
import { Device, MonitoringData, Queue } from '../types';
import { InterfacesCard } from './InterfacesCard';
import QueueMonitorCard from './QueueMonitorCard';
import QueueTrafficChart from './charts/QueueTrafficChart';
import InterfaceTrafficChart from './charts/InterfaceTrafficChart';
import QueueTreeMonitorCard from './QueueTreeMonitorCard';
import { Activity, Network } from 'lucide-react';

interface BandwidthMonitorProps {
  devices: Device[];
  selectedDeviceId: string | null;
  onDeviceSelect: (deviceId: string) => void;
  monitoringData: Record<string, MonitoringData | { error: string }>;
}

const BandwidthMonitor: React.FC<BandwidthMonitorProps> = ({
  devices,
  selectedDeviceId,
  onDeviceSelect,
  monitoringData,
}) => {
  const selectedMonitoringData = selectedDeviceId ? monitoringData[selectedDeviceId] : null;

  return (
    <div className="p-6 space-y-6 bg-slate-900 min-h-screen">
      <h1 className="text-3xl font-bold text-slate-100 flex items-center">
        <Activity className="w-8 h-8 mr-3 text-cyan-400" />
        Bandwidth Monitor
      </h1>

      {/* Device Selector */}
      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
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

      {selectedMonitoringData && !('error' in selectedMonitoringData) ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Interfaces */}
          <div className="space-y-6">
            {selectedMonitoringData.interfaces && (
              <>
                <InterfaceTrafficChart interfaces={selectedMonitoringData.interfaces} />
                <InterfacesCard interfaces={selectedMonitoringData.interfaces} />
              </>
            )}
          </div>

          {/* Right Column: Queues */}
          <div className="space-y-6">
            {selectedMonitoringData.queues && (
              <>
                <QueueTrafficChart queues={selectedMonitoringData.queues} />
                <QueueMonitorCard queues={selectedMonitoringData.queues} />
              </>
            )}
            {selectedMonitoringData.queueTree && (
              <QueueTreeMonitorCard queueTree={selectedMonitoringData.queueTree} />
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-slate-700">
          <p className="text-slate-400">Please select a device to monitor bandwidth.</p>
        </div>
      )}
    </div>
  );
};

export default BandwidthMonitor;