import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';

// Import komponen-komponen modern Anda
import { Header } from './components/Header';
import Sidebar from './components/Sidebar';
import { DeviceManager } from './components/DeviceManager';
import { FirewallViewer } from './components/FirewallViewer';
import { ActiveConnectionsViewer } from './components/ActiveConnectionsViewer';
import { AddressListManager } from './components/AddressListManager';
import { ScriptManager } from './components/ScriptManager';
import { BackupManager } from './components/BackupManager';
import { CentralizedLogViewer } from './components/CentralizedLogViewer';
import { AlertsManager } from './components/AlertsManager';
import { HistoricalReportsManager } from './components/HistoricalReportsManager';
import RealTimeDashboard from './components/RealTimeDashboard';
import MainDashboard from './components/MainDashboard';
import Login from './components/Login';
import EditProfile from './components/EditProfile';
import { TelegramSettings } from './components/TelegramSettings';
import BandwidthMonitor from './components/BandwidthMonitor';

// Placeholder untuk hook dan tipe
import { useAuth } from './context/AuthContext';
import { useWebSocket } from './hooks/useWebSocket';
import { Device, MonitoringData, LogEntry } from './types';

// Komponen Layout Utama untuk halaman yang memerlukan Sidebar dan Header
const MainLayout = ({ isSidebarOpen, toggleSidebar }: { isSidebarOpen: boolean; toggleSidebar: () => void }) => (
  <div className="flex h-screen bg-slate-900 text-slate-300">
    <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
    <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
      <Header toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
      <main className="grow p-4 sm:p-6 lg:p-8">
        {/* Konten halaman akan dirender di sini */}
        <Outlet />
      </main>
    </div>
  </div>
);

function App() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [monitoringData, setMonitoringData] = useState<Record<string, MonitoringData | { error: string }>>({});
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [blockedIpsCount, setBlockedIpsCount] = useState<number>(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Default sidebar terbuka di desktop

  const { isAuthenticated, token, logout, loading } = useAuth();

  const wsToken = loading ? null : token;

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // --- Logika Fetching Data dan WebSocket ---
  const authFetch = useCallback(async (url: string, options?: RequestInit) => {
    // Use relative URLs for API requests, so they are handled by the Vite proxy.
    const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...options?.headers } });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) logout();
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  }, [token, logout]);

  // Construct the WebSocket URL based on the frontend's host.
  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const wsUrl = `${wsProtocol}://${window.location.host}/ws`;

  const { lastMessage, connectionStatus } = useWebSocket(wsUrl, wsToken);

  // Define fetchInitialData first before using it
  const fetchInitialData = useCallback(async () => {
    console.log('fetchInitialData called.'); // Added for debugging
    if (!isAuthenticated) return;
    try {
      const devicesResponse = await authFetch('/api/devices');
      const devicesData = await devicesResponse.json();
      console.log('Devices fetched:', devicesData); // Added for debugging
      setDevices(devicesData);
      if (devicesData.length > 0 && !selectedDevice) {
        setSelectedDevice(devicesData[0].id);
      }
    } catch (error) {
      console.error('Gagal mengambil data perangkat:', error);
    }
  }, [isAuthenticated, authFetch, selectedDevice]);

  useEffect(() => {
    if (lastMessage) {
      try {
        console.log('WebSocket message received:', lastMessage); // Added for debugging
        const message = JSON.parse(lastMessage);
        console.log('Parsed WebSocket message:', message); // Added for debugging
        if (message.type === 'monitoring_update' && message.deviceId) {
          setMonitoringData(prev => ({
            ...prev,
            [message.deviceId]: message.data
          }));
        } else if (message.type === 'device_added' || message.type === 'device_deleted') {
          console.log('Device added/deleted message received. Triggering fetchInitialData.'); // Added for debugging
          // Trigger a re-fetch of devices
          fetchInitialData();
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    }
  }, [lastMessage, fetchInitialData]);

  // Function to fetch monitoring data for a specific device
  const fetchDeviceMonitoringData = useCallback(async (deviceId: string) => {
    try {
      const response = await authFetch(`/api/monitoring/device/${deviceId}`);
      if (response.ok) {
        const data = await response.json();
        setMonitoringData(prev => ({
          ...prev,
          [deviceId]: data
        }));
        return data;
      }
    } catch (error) {
      console.error(`Error fetching monitoring data for device ${deviceId}:`, error);
      // Set error state for the device
      setMonitoringData(prev => ({
        ...prev,
        [deviceId]: { error: 'Failed to fetch monitoring data' }
      }));
    }
  }, [authFetch]);

  const reloadDeviceData = useCallback(async (deviceId: string) => {
    try {
      const response = await authFetch(`/api/devices/${deviceId}/reload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to reload device');
      }
      
      // Refresh device data after successful reload
      await fetchInitialData();
      
      // Fetch fresh monitoring data
      await fetchDeviceMonitoringData(deviceId);
      
      // If this is the selected device, also refresh its specific data
      if (selectedDevice === deviceId) {
        const logsResponse = await authFetch(`/api/monitoring/device/${selectedDevice}/logs`);
        setLogs(await logsResponse.json());
        const blockedIpsResponse = await authFetch(`/api/monitoring/device/${selectedDevice}/address-lists/blocked_ips`);
        setBlockedIpsCount((await blockedIpsResponse.json()).length);
      }
    } catch (error) {
      console.error('Failed to reload device:', error);
      throw error;
    }
  }, [authFetch, fetchInitialData, selectedDevice, fetchDeviceMonitoringData]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]); // Now depends on fetchInitialData
    
  useEffect(() => {
    const fetchDeviceSpecificData = async () => {
        if (!isAuthenticated || !selectedDevice) return;
        try {
            // Fetch monitoring data
            await fetchDeviceMonitoringData(selectedDevice);
            
            // Fetch logs
            const logsResponse = await authFetch(`/api/monitoring/device/${selectedDevice}/logs`);
            setLogs(await logsResponse.json());
            
            // Fetch blocked IPs
            const blockedIpsResponse = await authFetch(`/api/monitoring/device/${selectedDevice}/address-lists/blocked_ips`);
            setBlockedIpsCount((await blockedIpsResponse.json()).length);
        } catch (error) {
            console.error('Gagal mengambil data spesifik perangkat:', error);
        }
    };
    fetchDeviceSpecificData();
  }, [selectedDevice, isAuthenticated, authFetch, fetchDeviceMonitoringData]);

  const selectedMonitoringData = selectedDevice ? monitoringData[selectedDevice] : null;

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route 
          path="/*" 
          element={
            loading ? (
              <div className="flex items-center justify-center min-h-screen bg-slate-900 text-slate-300">
                Loading authentication...
              </div>
            ) : isAuthenticated ? (
              <Routes>
                {/* Rute dengan Layout Utama */}
                <Route element={<MainLayout isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />}>
                  <Route
                    path="/"
                    element={
                      <MainDashboard
                        devices={devices}
                        selectedDeviceId={selectedDevice}
                        onDeviceSelect={setSelectedDevice}
                        monitoringData={monitoringData}
                        logs={logs}
                        blockedIpsCount={blockedIpsCount}
                        reloadDevice={reloadDeviceData}
                      />
                    }
                  />
                  <Route path="/devices" element={<DeviceManager />} />
                  <Route path="/firewall" element={<FirewallViewer selectedDevice={selectedDevice} selectedMonitoringData={selectedMonitoringData} authFetch={authFetch} />} />
                  <Route path="/connections" element={<ActiveConnectionsViewer selectedMonitoringData={selectedMonitoringData} />} />
                  <Route path="/address-list" element={<AddressListManager selectedDevice={selectedDevice} />} />
                  <Route path="/script-manager" element={
                    <ScriptManager 
                      selectedDevice={selectedDevice}
                      devices={devices}
                      onDeviceSelect={setSelectedDevice}
                    />
                  } />
                  <Route path="/backup" element={<BackupManager selectedDevice={selectedDevice} />} />
                  <Route path="/logs" element={<CentralizedLogViewer />} />
                  <Route path="/alerts" element={<AlertsManager />} />
                  <Route path="/telegram-settings" element={<TelegramSettings />} />
                  <Route path="/historical-reports" element={
                    <HistoricalReportsManager
                      devices={devices}
                      selectedDeviceId={selectedDevice}
                      onDeviceSelect={setSelectedDevice}
                    />
                  } />
                  <Route path="/realtime-dashboard" element={
                    <RealTimeDashboard
                      devices={devices}
                      selectedDeviceId={selectedDevice}
                      onDeviceSelect={setSelectedDevice}
                      monitoringData={monitoringData}
                      connectionStatus={connectionStatus}
                    />
                  } />
                  <Route path="/bandwidth-monitor" element={
                    <BandwidthMonitor
                      devices={devices}
                      selectedDeviceId={selectedDevice}
                      onDeviceSelect={setSelectedDevice}
                      monitoringData={monitoringData}
                    />
                  } />
                  <Route path="/edit-profile" element={<EditProfile />} />
                </Route>
                
                {/* Rute tanpa Layout Utama */}
                
              </Routes>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
