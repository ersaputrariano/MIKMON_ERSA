import React, { useState, useEffect, useRef } from 'react';
import {
  Network,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  ServerOff
} from 'lucide-react';
import { InterfaceInfo } from '../types';

const cardStyle = "bg-gradient-to-br from-slate-800/80 to-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 h-full p-6";

const StatusIndicator: React.FC<{ running: boolean; disabled: boolean }> = ({ running, disabled }) => {
  const color = disabled ? 'bg-slate-500' : running ? 'bg-green-500' : 'bg-red-500';
  const glow = disabled ? '' : running ? 'shadow-[0_0_6px_rgba(34,197,94,0.7)]' : 'shadow-[0_0_6px_rgba(239,68,68,0.7)]';
  const statusText = disabled ? 'Disabled' : running ? 'Running' : 'Stopped';
  
  return (
    <div className="flex items-center">
      <div className={`w-2.5 h-2.5 rounded-full transition-colors ${color} ${glow} mr-2`}></div>
      <span className="text-xs text-slate-400">{statusText}</span>
    </div>
  );
};

const InterfaceTypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const getTypeColor = (type: string) => {
    if (type.includes('ether')) return 'bg-blue-500/20 text-blue-400';
    if (type.includes('wlan')) return 'bg-green-500/20 text-green-400';
    if (type.includes('bridge')) return 'bg-purple-500/20 text-purple-400';
    return 'bg-slate-500/20 text-slate-400';
  };
  
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getTypeColor(type)}`}>
      {type}
    </span>
  );
};

interface InterfacesCardProps {
  interfaces: InterfaceInfo[];
}

export const InterfacesCard: React.FC<InterfacesCardProps> = ({ interfaces }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (interfaces && interfaces.length > 0 && !interfaces.find(i => i.id === selectedId)) {
      setSelectedId(interfaces[0].id);
    }
  }, [interfaces, selectedId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedInterface = interfaces.find(iface => iface.id === selectedId);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setDropdownOpen(false);
  };
  
  const formatBps = (bpsString?: string) => {
    const bps = parseInt(bpsString || '0', 10);
    if (bps === 0) return '0 bps';
    const k = 1000;
    const sizes = ['bps', 'Kbps', 'Mbps', 'Gbps'];
    const i = Math.floor(Math.log(bps) / Math.log(k));
    return `${parseFloat((bps / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const calculateBandwidthPercentage = (bpsString?: string) => {
    const bps = parseInt(bpsString || '0', 10);
    const maxBps = 1000000000; // 1 Gbps
    return Math.min(100, (bps / maxBps) * 100);
  };

  return (
    <div className={cardStyle}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-slate-100 flex items-center">
          <Network className="w-5 h-5 mr-3 text-cyan-400" />
          Antarmuka Jaringan
        </h3>
      </div>

      {interfaces && interfaces.length > 0 ? (
        <>
          <div className="relative w-full" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!isDropdownOpen)}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 flex items-center justify-between text-left hover:bg-slate-800 transition-colors"
            >
              {selectedInterface ? (
                <div className="flex items-center overflow-hidden">
                  <StatusIndicator running={selectedInterface.running} disabled={selectedInterface.disabled} />
                  <span className="ml-3 text-sm font-medium text-slate-200 truncate">{selectedInterface.name}</span>
                </div>
              ) : (
                <span className="text-sm text-slate-400">Pilih Antarmuka</span>
              )}
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform shrink-0 ml-2 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {isDropdownOpen && (
              <div className="absolute top-full mt-2 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10 max-h-60 overflow-y-auto animate-fade-in-fast">
                {interfaces.map(iface => (
                  <button
                    key={iface.id}
                    onClick={() => handleSelect(iface.id)}
                    className="w-full text-left p-3 hover:bg-slate-700/50 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center">
                      <StatusIndicator running={iface.running} disabled={iface.disabled} />
                      <span className="ml-3 text-sm font-medium text-slate-200">{iface.name}</span>
                    </div>
                    <InterfaceTypeBadge type={iface.type} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedInterface && (
            <div className="mt-6 pt-4 border-t border-slate-700 animate-fade-in">
              <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
                <div className="flex items-center">
                  <span className="font-medium text-slate-200">{selectedInterface.name}</span>
                </div>
                <InterfaceTypeBadge type={selectedInterface.type} />
              </div>
              
              {selectedInterface.comment && (
                <div className="mb-4 p-3 bg-slate-900/50 rounded-lg">
                  <p className="text-sm text-slate-400 italic">"{selectedInterface.comment}"</p>
                </div>
              )}
              
              {/* --- Visualisasi Bandwidth yang Didesain Ulang --- */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Download Card */}
                <div className="bg-slate-900/50 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <TrendingDown className="w-5 h-5 mr-2 text-blue-400" />
                    <span className="text-sm font-medium text-slate-300">Download</span>
                  </div>
                  <div className="text-2xl font-bold text-slate-100 mb-2 font-mono">
                    {formatBps(selectedInterface['rx-bits-per-second'])}
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${calculateBandwidthPercentage(selectedInterface['rx-bits-per-second'])}%` }}
                    />
                  </div>
                </div>
                
                {/* Upload Card */}
                <div className="bg-slate-900/50 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
                    <span className="text-sm font-medium text-slate-300">Upload</span>
                  </div>
                  <div className="text-2xl font-bold text-slate-100 mb-2 font-mono">
                    {formatBps(selectedInterface['tx-bits-per-second'])}
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-green-500 transition-all duration-300"
                      style={{ width: `${calculateBandwidthPercentage(selectedInterface['tx-bits-per-second'])}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center text-center text-slate-500 py-8">
          <ServerOff className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium">Tidak Ada Data</p>
          <p className="text-sm">Antarmuka jaringan tidak ditemukan.</p>
        </div>
      )}
    </div>
  );
};
