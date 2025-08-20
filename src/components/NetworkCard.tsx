import { Network } from 'lucide-react';
import { NetworkInfo } from '../types';

interface NetworkCardProps {
  network: NetworkInfo;
}

const cardStyle = "bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-lg p-6";

export function NetworkCard({ network }: NetworkCardProps) {
  // Helper function to flatten network data
  const flattenNetworkData = (data: Record<string, unknown>, prefix = ''): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const key in data) {
      if (typeof data[key] === 'object' && data[key] !== null && !Array.isArray(data[key])) {
        Object.assign(result, flattenNetworkData(data[key] as Record<string, unknown>, `${prefix}${key}.`));
      } else {
        result[`${prefix}${key}`] = data[key];
      }
    }
    return result;
  };

  const flattenedNetwork = flattenNetworkData(network as Record<string, unknown>);

  const metrics = [
    { label: 'Gateway', value: flattenedNetwork.gateway || flattenedNetwork.defaultGateway || '-' },
    { label: 'DNS', value: flattenedNetwork.dns || flattenedNetwork['dns-server'] || flattenedNetwork['dns1'] || '-' },
    { label: 'IP Address', value: flattenedNetwork.address || flattenedNetwork['ip-address'] || flattenedNetwork.ip || flattenedNetwork['ip.address'] || '-' },
    { label: 'Subnet Mask', value: flattenedNetwork.subnet || flattenedNetwork['subnet-mask'] || flattenedNetwork.netmask || '-' },
    { label: 'Interface', value: flattenedNetwork.interface || flattenedNetwork['interface-name'] || flattenedNetwork['interface.name'] || '-' },
    { label: 'Status', value: flattenedNetwork.status || flattenedNetwork.state || (flattenedNetwork.running ? 'Connected' : 'Disconnected') || '-' },
  ];

  const networkHealth = metrics.some(metric => metric.value === '-' || !metric.value) ? 'warning' : 'good';

  return (
    <div className={cardStyle}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-slate-100 flex items-center">
          <Network className="w-5 h-5 mr-3 text-cyan-400" />
          Status Jaringan
        </h3>
        <div className="text-sm font-semibold text-slate-400">
          {networkHealth === 'good' ? 'Stabil' : 'Perlu Perhatian'}
        </div>
      </div>
      
      <div className="space-y-3">
        {metrics.map((metric, index) => (
          <div key={index} className="flex justify-between items-center py-2 border-b border-slate-700 last:border-0">
            <span className="text-slate-400">{metric.label}</span>
            <span className="text-slate-200 font-medium">{String(metric.value)}</span>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">Koneksi</span>
          <span className="text-sm font-medium text-slate-200">
            {metrics.find(m => m.label === 'Status')?.value === 'Connected' ? 'Aktif' : 'Tidak Aktif'}
          </span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${metrics.find(m => m.label === 'Status')?.value === 'Connected' ? 'bg-green-500' : 'bg-red-500'}`}
            style={{ width: metrics.find(m => m.label === 'Status')?.value === 'Connected' ? '100%' : '0%' }}
          />
        </div>
      </div>
    </div>
  );
}