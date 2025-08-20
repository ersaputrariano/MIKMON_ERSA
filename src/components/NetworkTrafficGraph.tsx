import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { InterfaceInfo } from '../types';

interface NetworkTrafficGraphProps {
  interfaces: InterfaceInfo[];
}

interface TrafficDataPoint {
  name: string;
  rx: number;
  tx: number;
}

const MAX_DATA_POINTS = 30; // Keep last 30 seconds of data

export const NetworkTrafficGraph: React.FC<NetworkTrafficGraphProps> = ({ interfaces }) => {
  const [trafficHistory, setTrafficHistory] = useState<Record<string, TrafficDataPoint[]>>({});

  useEffect(() => {
    const newTrafficData: Record<string, TrafficDataPoint> = {};
    interfaces.forEach(iface => {
      const rx = parseInt(iface['rx-bits-per-second'] || '0') / 1000; // Convert to Kbps
      const tx = parseInt(iface['tx-bits-per-second'] || '0') / 1000; // Convert to Kbps
      newTrafficData[iface.name] = { name: new Date().toLocaleTimeString(), rx, tx };
    });

    setTrafficHistory(prevHistory => {
      const updatedHistory = { ...prevHistory };
      Object.keys(newTrafficData).forEach(ifaceName => {
        if (!updatedHistory[ifaceName]) {
          updatedHistory[ifaceName] = [];
        }
        updatedHistory[ifaceName] = [...updatedHistory[ifaceName], newTrafficData[ifaceName]].slice(-MAX_DATA_POINTS);
      });
      return updatedHistory;
    });
  }, [interfaces]);

  return (
    <div className="flex flex-col col-span-full bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <div className="px-5 pt-5"> {/* Adjusted padding here */}
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Network Traffic (Kbps)</h2> {/* Adjusted text color for dark mode */}
        {interfaces.length === 0 ? (
          <p className="text-gray-600">No network interfaces found or data not available.</p>
        ) : (
          <div className="space-y-6">
            {interfaces.map(iface => (
              <div key={iface.name} className="mb-4">
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-2">Interface: {iface.name}</h3> {/* Adjusted text color for dark mode */}
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trafficHistory[iface.name] || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="rx" stroke="#8884d8" name="Rx (Kbps)" />
                    <Line type="monotone" dataKey="tx" stroke="#82ca9d" name="Tx (Kbps)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
