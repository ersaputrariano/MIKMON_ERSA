import express from 'express';

export function deviceRoutes(mikrotikManager, wss) {
  const router = express.Router();

  // Get all devices
  router.get('/', (req, res) => {
    try {
      const devices = mikrotikManager.getAllDevices();
      res.json(devices);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Add new device
  router.post('/', async (req, res) => {
    try {
      console.log('Received device add request:', req.body);
      const { name, host, username, password, port } = req.body;

      // Validate required fields
      if (!name || !host || !username || !password) {
        console.log('Missing required fields in request');
        return res.status(400).json({
          error: 'Missing required fields: name, host, username, password',
          received: { name: !!name, host: !!host, username: !!username, password: !!password, port }
        });
      }

      // Validate field types and values
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Device name must be a non-empty string' });
      }
      
      if (typeof host !== 'string' || host.trim().length === 0) {
        return res.status(400).json({ error: 'Host must be a non-empty string' });
      }
      
      if (typeof username !== 'string' || username.trim().length === 0) {
        return res.status(400).json({ error: 'Username must be a non-empty string' });
      }
      
      if (typeof password !== 'string' || password.length === 0) {
        return res.status(400).json({ error: 'Password must be a non-empty string' });
      }

      console.log(`Attempting to add device: ${name} at ${host}:${port || 8728}`);

      const result = await mikrotikManager.addDevice({
        name: name.trim(),
        host: host.trim(),
        username: username.trim(),
        password,
        port: port || 8728
      });

      console.log('Device add result:', result);

      if (result.success) {
        // Send WebSocket message to all connected clients
        const message = JSON.stringify({
          type: 'device_added',
          device: result.device,
          timestamp: new Date().toISOString()
        });
        console.log('Sending WebSocket message: device_added');
        wss.clients.forEach((client) => {
          if (client.readyState === 1) { // WebSocket.OPEN
            client.send(message);
          }
        });
        res.status(201).json(result);
      } else {
        console.log('Device add failed:', result.error);
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error in device add route:', error);
      res.status(500).json({
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // Get device by ID
  router.get('/:id', (req, res) => {
    try {
      const device = mikrotikManager.getDevice(req.params.id);
      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }
      res.json(device);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Remove device
  router.delete('/:id', async (req, res) => {
    try {
      const result = await mikrotikManager.removeDevice(req.params.id);
      if (result.success) {
        // Send WebSocket message to all connected clients
        const message = JSON.stringify({
          type: 'device_deleted',
          deviceId: req.params.id, // Send the ID of the deleted device
          timestamp: new Date().toISOString()
        });
        wss.clients.forEach((client) => {
          if (client.readyState === 1) { // WebSocket.OPEN
            client.send(message);
          }
        });
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
// Test device connection
router.post('/:id/test', async (req, res) => {
  try {
    const isConnected = await mikrotikManager.testConnection(req.params.id);
    res.json({ connected: isConnected });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reload device connection (retest connection)
router.post('/:id/reload', async (req, res) => {
  try {
    const isConnected = await mikrotikManager.testConnection(req.params.id);
    // Update device status in the manager
    const device = mikrotikManager.getDevice(req.params.id);
    if (device) {
      device.connected = isConnected;
      device.lastUpdate = new Date().toISOString();
      if (!isConnected) {
        device.error = 'Device is not connected';
      } else {
        device.error = null;
      }
    }
    res.json({
      success: true,
      connected: isConnected,
      message: isConnected ? 'Device reconnected successfully' : 'Device is not connected'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

return router;
}
