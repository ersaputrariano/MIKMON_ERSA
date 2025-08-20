import React from 'react';
import { Queue } from '../types';
import { Zap, XCircle } from 'lucide-react';

interface QueueMonitorCardProps {
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

const QueueMonitorCard: React.FC<QueueMonitorCardProps> = ({ queues }) => {
  return (
    <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 h-full">
      <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center">
        <Zap className="w-5 h-5 mr-2 text-cyan-400" />
        Queue Monitor
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-400">
          <thead className="text-xs text-slate-300 uppercase bg-slate-900/50">
            <tr>
              <th scope="col" className="px-4 py-3">Name</th>
              <th scope="col" className="px-4 py-3">Target</th>
              <th scope="col" className="px-4 py-3">Rate</th>
              <th scope="col" className="px-4 py-3">Max Limit</th>
              <th scope="col" className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {queues && queues.length > 0 ? (
              queues.map((queue) => (
                <tr key={queue.id} className="border-b border-slate-700 hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-medium text-slate-200">{queue.name}</td>
                  <td className="px-4 py-3">{queue.target}</td>
                  <td className="px-4 py-3">{formatBytes(parseFloat(queue.rate))}</td>
                  <td className="px-4 py-3">{formatBytes(parseFloat(queue.maxLimit))}</td>
                  <td className="px-4 py-3">
                    {queue.disabled ? (
                      <span className="flex items-center text-red-400">
                        <XCircle className="w-4 h-4 mr-1" />
                        Disabled
                      </span>
                    ) : (
                      <span className="flex items-center text-green-400">
                        <Zap className="w-4 h-4 mr-1" />
                        Active
                      </span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center py-4">
                  No queue data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default QueueMonitorCard;