import express from 'express';

export function monitoringRoutes(mikrotikManager) {
  const router = express.Router();

  // Get monitoring data for a device
  router.get('/device/:id', async (req, res) => {
    try {
      const data = await mikrotikManager.getMonitoringData(req.params.id);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get monitoring data for all devices
  router.get('/all', async (req, res) => {
    try {
      const devices = mikrotikManager.getAllDevices();
      const monitoringData = {};

      for (const device of devices) {
        if (device.connected) {
          try {
            monitoringData[device.id] = await mikrotikManager.getMonitoringData(device.id);
          } catch (error) {
            monitoringData[device.id] = { error: error.message };
          }
        } else {
          monitoringData[device.id] = { error: 'Device not connected' };
        }
      }

      res.json(monitoringData);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get logs for a device
  router.get('/device/:id/logs', async (req, res) => {
    try {
      const logs = await mikrotikManager.getLogs(req.params.id);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get address lists for a device
  router.get('/device/:id/address-lists', async (req, res) => {
    try {
      const addressLists = await mikrotikManager.getAddressLists(req.params.id);
      res.json(addressLists);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Add address list entry for a device
  router.post('/device/:id/address-lists', async (req, res) => {
    try {
      const { list, address, comment } = req.body;
      if (!list || !address) {
        return res.status(400).json({ error: 'Missing required fields: list, address' });
      }
      const result = await mikrotikManager.addAddressListEntry(req.params.id, list, address, comment);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Remove address list entry for a device
  router.delete('/device/:id/address-lists/:entryId', async (req, res) => {
    try {
      const result = await mikrotikManager.removeAddressListEntry(req.params.id, req.params.entryId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get scripts for a device
  router.get('/device/:id/scripts', async (req, res) => {
    try {
      console.log(`Received request to get scripts for device: ${req.params.id}`);
      
      // Validate device ID
      if (!req.params.id) {
        return res.status(400).json({ error: 'Device ID is required' });
      }

      // Check if device exists
      const device = mikrotikManager.getDevice(req.params.id);
      if (!device) {
        return res.status(404).json({ error: `Device with ID ${req.params.id} not found` });
      }

      console.log(`Device found: ${device.name}, connected: ${device.connected}`);

      const scripts = await mikrotikManager.getScripts(req.params.id);
      console.log(`Successfully retrieved scripts for device ${req.params.id}`);
      res.json(scripts);
    } catch (error) {
      console.error(`Error in get scripts route for device ${req.params.id}:`, error);
      res.status(500).json({
        error: error.message,
        deviceId: req.params.id,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Add script for a device
  router.post('/device/:id/scripts', async (req, res) => {
    try {
      const { name, source } = req.body;
      if (!name || !source) {
        return res.status(400).json({ error: 'Missing required fields: name, source' });
      }
      const result = await mikrotikManager.addScript(req.params.id, name, source);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Remove script for a device
  router.delete('/device/:id/scripts/:scriptId', async (req, res) => {
    try {
      const result = await mikrotikManager.removeScript(req.params.id, req.params.scriptId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Run script for a device
  router.post('/device/:id/scripts/:scriptName/run', async (req, res) => {
    try {
      const result = await mikrotikManager.runScript(req.params.id, req.params.scriptName);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create backup for a device
  router.post('/device/:id/backup', async (req, res) => {
    try {
      const result = await mikrotikManager.createBackup(req.params.id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Export configuration for a device
  router.post('/device/:id/export-config', async (req, res) => {
    try {
      const result = await mikrotikManager.exportConfiguration(req.params.id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get addresses in a specific address list for a device
  router.get('/device/:id/address-lists/:listName', async (req, res) => {
    try {
      const addresses = await mikrotikManager.getAddressesInList(req.params.id, req.params.listName);
      res.json(addresses);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all logs from all connected devices
  router.get('/all-logs', async (req, res) => {
    try {
      const allLogs = await mikrotikManager.getAllLogs();
      res.json(allLogs);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Add firewall filter rule for a device
  router.post('/device/:id/firewall/filter', async (req, res) => {
    try {
      const ruleData = req.body;
      const result = await mikrotikManager.addFirewallFilterRule(req.params.id, ruleData);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update firewall filter rule for a device
  router.put('/device/:id/firewall/filter/:ruleId', async (req, res) => {
    try {
      const ruleData = req.body;
      const result = await mikrotikManager.updateFirewallFilterRule(req.params.id, req.params.ruleId, ruleData);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Remove firewall filter rule for a device
  router.delete('/device/:id/firewall/filter/:ruleId', async (req, res) => {
    try {
      const result = await mikrotikManager.removeFirewallFilterRule(req.params.id, req.params.ruleId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}