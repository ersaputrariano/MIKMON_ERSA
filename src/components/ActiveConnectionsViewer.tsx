import React from 'react';
import { MonitoringData, ActiveConnection } from '../types';

interface ActiveConnectionsViewerProps {
  selectedMonitoringData: MonitoringData | { error: string; } | null;
}

export const ActiveConnectionsViewer: React.FC<ActiveConnectionsViewerProps> = ({
  selectedMonitoringData,
}) => {
  const activeConnections = selectedMonitoringData?.network?.activeConnections || [];

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Active Connections</h2>
      {activeConnections.length === 0 ? (
        <p className="text-gray-600">No active connections found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Protocol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">State</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timeout</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activeConnections.map((conn: ActiveConnection, index: number) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{conn.srcAddress}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{conn.dstAddress}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{conn.protocol}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{conn.state}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{conn.timeout}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
