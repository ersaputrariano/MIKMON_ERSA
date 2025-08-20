import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken'; // Import jsonwebtoken
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirp } from 'mkdirp';
import { MikroTikManager } from './mikrotik/manager.js';
import { deviceRoutes } from './routes/devices.js';
import { monitoringRoutes } from './routes/monitoring.js';
import authRoutes from './routes/auth.js'; // Import auth routes
import telegramRoutes from './routes/telegram.js'; // Import telegram routes
import alertService from './services/alertService.js'; // Import alert service
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
const PORT = process.env.PORT || 3005;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey'; // Secret key for JWT

// Ensure necessary directories exist
mkdirp.sync(path.join(__dirname, 'data'));
mkdirp.sync(path.join(__dirname, 'uploads/avatars'));

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) return res.sendStatus(401); // No token

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // Invalid token
    req.user = user;
    next();
  });
};

// Initialize MikroTik Manager
const mikrotikManager = new MikroTikManager();

// Initialize Alert Service
alertService.loadAlertRules();

// Auth Routes (public)
console.log('[SERVER] Mounting auth routes at /api/auth');
app.use('/api/auth', authRoutes);

// Protected Routes
app.use('/api/devices', authenticateToken, deviceRoutes(mikrotikManager, wss));
app.use('/api/monitoring', authenticateToken, monitoringRoutes(mikrotikManager));
app.use('/api/telegram', authenticateToken, telegramRoutes);

// Add a catch-all route for debugging 404s
app.use((req, res, next) => {
  console.log(`[SERVER] 404 - Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ message: `Route not found: ${req.method} ${req.url}` });
});

// WebSocket handling
wss.on('connection', (ws, req) => { // Add 'req' parameter to get request details
  const urlParams = new URLSearchParams(req.url.split('?')[1]);
  const token = urlParams.get('token');

  if (!token) {
    console.log('WebSocket connection rejected: No token provided');
    ws.terminate();
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log('WebSocket connection rejected: Invalid token');
      ws.terminate();
      return;
    }

    console.log('New WebSocket connection established for user:', user.username);
    ws.id = uuidv4();
    ws.user = user; // Attach user info to WebSocket object
    ws.isAlive = true;
    
    ws.on('pong', () => {
      ws.isAlive = true;
    });
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('WebSocket message received:', data);
      } catch (error) {
        console.error('Invalid WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket connection closed for user:', ws.user?.username || 'unknown');
    });
  });
});

// Ping WebSocket clients every 30 seconds
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// Real-time data broadcasting
const broadcastData = () => {
  const devices = mikrotikManager.getAllDevices();
  
  devices.forEach(async (device) => {
    if (device.connected) {
      try {
        console.log(`[BROADCAST] Fetching data for device: ${device.name} (${device.id})`);
        const monitoringData = await mikrotikManager.getMonitoringData(device.id);
        
        // Check alerts for this device
        await alertService.checkAlerts(device.id, device.name, monitoringData);
        
        const message = JSON.stringify({
          type: 'monitoring_update',
          deviceId: device.id,
          data: monitoringData,
          timestamp: new Date().toISOString()
        });
        
        wss.clients.forEach((client) => {
          if (client.readyState === 1) { // WebSocket.OPEN
            client.send(message);
            console.log(`[BROADCAST] Data sent for device: ${device.name} (${device.id})`);
          }
        });
      } catch (error) {
        console.error(`[BROADCAST ERROR] Error getting monitoring data for device ${device.id}:`, error.message);
        // Optionally, you might want to mark the device as disconnected here if it's a persistent error
        // Or implement a backoff strategy
      }
    } else {
      console.log(`[BROADCAST] Device ${device.name} (${device.id}) is not connected. Skipping data fetch.`);
    }
  });
};

// Broadcast real-time data every 5 seconds
setInterval(broadcastData, 5000);

// Health check endpoint (protected)
app.get('/api/health', authenticateToken, (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    connectedDevices: mikrotikManager.getAllDevices().filter(d => d.connected).length
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  mikrotikManager.disconnectAll();
  server.close(() => {
    console.log('Server closed');
  });
});