import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Queue } from '../../types';

interface QueueTrafficChartProps {
  queues: Queue[];
}

const formatBytes = (bits: number, decimals = 2) => {
  if (bits === 0) return '0 Bps';
  const k = 1000;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bps', 'Kbps', 'Mbps', 'Gbps', 'Tbps'];
  const i = Math.floor(Math.log(bits) / Math.log(k));
  return parseFloat((bits / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const QueueTrafficChart: React.FC<QueueTrafficChartProps> = ({ queues }) => {
  const chartData = queues.map(q => ({
    name: q.name,
    rate: parseFloat(q.rate) || 0,
  }));

  return (
    <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
      <h3 className="text-lg font-semibold text-slate-100 mb-4">Queue Traffic</h3>
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
          <Bar dataKey="rate" fill="#8884d8" name="Traffic Rate" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default QueueTrafficChart;