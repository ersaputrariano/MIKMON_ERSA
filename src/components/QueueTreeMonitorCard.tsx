import React from 'react';
import { QueueTreeItem } from '../types';
import { Zap, XCircle, GitCommit } from 'lucide-react';

interface QueueTreeMonitorCardProps {
  queueTree: QueueTreeItem[];
}

const formatBytes = (bits: number, decimals = 2) => {
  if (bits === 0) return '0 Bps';
  const k = 1000;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bps', 'Kbps', 'Mbps', 'Gbps', 'Tbps'];
  const i = bits > 0 ? Math.floor(Math.log(bits) / Math.log(k)) : 0;
  return parseFloat((bits / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const QueueTreeMonitorCard: React.FC<QueueTreeMonitorCardProps> = ({ queueTree }) => {
  const renderQueueTreeRows = (parentId: string, level = 0) => {
    return queueTree
      .filter(item => item.parent === parentId)
      .map(item => (
        <React.Fragment key={item.id}>
          <tr className="border-b border-slate-700 hover:bg-slate-800/50">
            <td className="px-4 py-3" style={{ paddingLeft: `${level * 20 + 16}px` }}>
              <div className="flex items-center">
                <GitCommit className="w-4 h-4 mr-2 text-slate-500 transform -rotate-90" />
                <span className="font-medium text-slate-200">{item.name}</span>
              </div>
            </td>
            <td className="px-4 py-3">{item['packet-mark']}</td>
            <td className="px-4 py-3">{formatBytes(parseFloat(item.rate))}</td>
            <td className="px-4 py-3">{formatBytes(parseFloat(item['max-limit']))}</td>
            <td className="px-4 py-3">
              {item.disabled ? (
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
          {renderQueueTreeRows(item.name, level + 1)}
        </React.Fragment>
      ));
  };

  return (
    <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 h-full">
      <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center">
        <Zap className="w-5 h-5 mr-2 text-cyan-400" />
        Queue Tree Monitor
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-400">
          <thead className="text-xs text-slate-300 uppercase bg-slate-900/50">
            <tr>
              <th scope="col" className="px-4 py-3">Name</th>
              <th scope="col" className="px-4 py-3">Packet Mark</th>
              <th scope="col" className="px-4 py-3">Rate</th>
              <th scope="col" className="px-4 py-3">Max Limit</th>
              <th scope="col" className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {queueTree && queueTree.length > 0 ? (
              renderQueueTreeRows('none')
            ) : (
              <tr>
                <td colSpan={5} className="text-center py-4">
                  No queue tree data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default QueueTreeMonitorCard;