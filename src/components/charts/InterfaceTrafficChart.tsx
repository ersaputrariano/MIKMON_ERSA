import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { InterfaceInfo } from '../../types';

interface InterfaceTrafficChartProps {
  interfaces: InterfaceInfo[];
}

const formatBytes = (bits: number, decimals = 2) => {
  if (bits === 0) return '0 Bps';
  const k = 1000;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bps', 'Kbps', 'Mbps', 'Gbps', 'Tbps'];
  // To prevent log(0) which is -Infinity
  const i = bits > 0 ? Math.floor(Math.log(bits) / Math.log(k)) : 0;
  return parseFloat((bits / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const InterfaceTrafficChart: React.FC<InterfaceTrafficChartProps> = ({ interfaces }) => {
  const chartData = interfaces
    .filter(iface => iface.running && !iface.disabled)
    .map(iface => ({
      name: iface.name,
      RX: parseFloat(iface['rx-bits-per-second'] || '0'),
      TX: parseFloat(iface['tx-bits-per-second'] || '0'),
    }));

  return (
    <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
      <h3 className="text-lg font-semibold text-slate-100 mb-4">Interface Traffic</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
          <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={(value) => formatBytes(value as number)} />
          <Tooltip
            formatter={(value) => formatBytes(value as number)}
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#F3F4F6'
            }}
          />
          <Legend />
          <Bar dataKey="RX" fill="#3b82f6" name="RX" />
          <Bar dataKey="TX" fill="#f59e0b" name="TX" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default InterfaceTrafficChart;