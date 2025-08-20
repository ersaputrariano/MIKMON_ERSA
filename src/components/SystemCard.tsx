import React from 'react';
import { Cpu, HardDrive, MemoryStick, Thermometer, Clock, Monitor, Fingerprint, Box } from 'lucide-react';
import { SystemInfo } from '../types';

interface SystemCardProps {
  system: SystemInfo;
  deviceName: string;
}

// Komponen helper untuk progress bar yang lebih menarik
const StatBar: React.FC<{ value: number; label: string; icon: React.ReactNode; unit?: string; details?: string }> = ({ value, label, icon, unit = '%', details }) => {
  const getBarColor = () => {
    if (value > 85) return 'bg-red-500';
    if (value > 65) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getGlowColor = () => {
    if (value > 85) return 'shadow-[0_0_10px_rgba(239,68,68,0.5)]';
    if (value > 65) return 'shadow-[0_0_10px_rgba(234,179,8,0.5)]';
    return 'shadow-[0_0_10px_rgba(34,197,94,0.5)]';
  }

  return (
    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 mb-2">
        <div className="flex items-center text-slate-300 text-sm">
          {icon}
          {label}
        </div>
        <span className="font-mono font-semibold text-white text-base sm:text-lg">{value.toFixed(1)}{unit}</span>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ease-out ${getBarColor()} ${getGlowColor()}`}
          style={{ width: `${value}%` }}
        />
      </div>
      {details && <p className="text-xs text-slate-400 mt-1.5 text-right font-mono">{details}</p>}
    </div>
  );
};


export function SystemCard({ system, deviceName }: SystemCardProps) {
  // --- Helper Functions ---
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatUptime = (uptime: string): string => {
    const match = uptime.match(/(?:(\d+)w)?(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?/);
    if (!match) return uptime;
    const [, weeks, days, hours, minutes] = match.map(Number);
    const parts = [];
    if (weeks > 0) parts.push(`${weeks}w`);
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    return parts.slice(0, 2).join(' ') || 'Just now';
  };

  // --- Calculated Values ---
  const memoryUsed = system.totalMemory - system.freeMemory;
  const memoryUsagePercent = (memoryUsed / system.totalMemory) * 100;
  const diskUsed = system.totalDisk - system.freeDisk;
  const diskUsagePercent = (diskUsed / system.totalDisk) * 100;

  const getTempColor = (temp: number | null) => {
    if (temp === null || temp === undefined) return 'text-slate-400';
    if (temp > 75) return 'text-red-400';
    if (temp > 60) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className="col-span-full sm:col-span-6 xl:col-span-4 bg-slate-900/70 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
      {/* --- Header --- */}
      <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-100 flex items-center">
              <Monitor className="w-5 h-5 mr-3 text-cyan-400" />
              {deviceName}
            </h2>
            <div className="flex items-center space-x-2">
                <span className="text-xs text-green-400 font-medium">Online</span>
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.7)]"></div>
            </div>
        </div>
      </div>
      
      <div className="p-3">
        {/* --- Main Stats --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <StatBar 
            value={system.cpuLoad} 
            label="CPU Load" 
            icon={<Cpu className="w-4 h-4 mr-2 text-cyan-400" />}
          />
          <StatBar 
            value={memoryUsagePercent} 
            label="Memory" 
            icon={<MemoryStick className="w-4 h-4 mr-2 text-cyan-400" />}
            details={`${formatBytes(memoryUsed)} / ${formatBytes(system.totalMemory)}`}
          />
          <StatBar 
            value={diskUsagePercent} 
            label="Disk" 
            icon={<HardDrive className="w-4 h-4 mr-2 text-cyan-400" />}
            details={`${formatBytes(diskUsed)} / ${formatBytes(system.totalDisk)}`}
          />
          <div className="bg-slate-800/50 p-3 rounded-lg flex items-center justify-between border border-slate-700/50">
            <div className="flex items-center text-slate-300 text-sm">
                <Clock className="w-4 h-4 mr-2 text-cyan-400" /> Uptime
            </div>
            <span className="font-mono font-semibold text-white text-lg">{formatUptime(system.uptime)}</span>
          </div>
        </div>

        {/* --- Detailed Info --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <DetailItem icon={<Box className="w-4 h-4 text-slate-500"/>} label="Model" value={system.boardName} />
          <DetailItem icon={<Cpu className="w-4 h-4 text-slate-500"/>} label="Architecture" value={system.architectureName} />
          <DetailItem icon={<Fingerprint className="w-4 h-4 text-slate-500"/>} label="Serial Number" value={system.serialNumber} />
          <DetailItem
            icon={<Thermometer className="w-4 h-4 text-slate-500"/>}
            label="Temperature"
            value={system.temperature ? `${system.temperature}°C` : 'N/A'}
            valueClassName={getTempColor(system.temperature)}
          />
          <DetailItem label="OS Version" value={system.version} />
          <DetailItem label="Brand/Platform" value={system.platform} />
          <DetailItem icon={<Monitor className="w-4 h-4 text-slate-500"/>} label="Identity" value={system.identity} />
          <DetailItem icon={<Cpu className="w-4 h-4 text-slate-500"/>} label="CPU Frequency" value={system.cpuFrequency ? `${system.cpuFrequency} MHz` : 'N/A'} />
          <DetailItem icon={<Cpu className="w-4 h-4 text-slate-500"/>} label="CPU Cores" value={system.cpuCount ? `${system.cpuCount} cores` : 'N/A'} />
        </div>
      </div>
    </div>
  );
}

// Komponen kecil untuk daftar detail agar lebih rapi
const DetailItem: React.FC<{label: string; value?: string; icon?: React.ReactNode; valueClassName?: string}> = ({ label, value, icon, valueClassName }) => {
    if (!value) return null;
    return (
        <div className="flex items-start justify-between gap-4 border-b border-dashed border-slate-700/50 py-1.5">
            <div className="flex items-center text-slate-400 shrink-0">
                {icon && <span className="mr-2">{icon}</span>}
                {label}
            </div>
            <span className={`font-mono font-medium text-slate-200 text-right break-all ${valueClassName || ''}`}>{value}</span>
        </div>
    )
}
