import { RouterOSAPI } from 'routeros-api';
import { v4 as uuidv4 } from 'uuid';

// Test RouterOS API import
console.log('RouterOSAPI imported successfully:', typeof RouterOSAPI);

export class MikroTikManager {
  constructor() {
    this.devices = new Map();
    this.connections = new Map();
  }

  async addDevice({ name, host, username, password, port = 8728 }) {
    const deviceId = uuidv4();
    const device = {
      id: deviceId,
      name,
      host,
      username,
      port,
      connected: false,
      lastUpdate: null,
      error: null
    };

    try {
      console.log(`Attempting to connect to device ${name} (${host}:${port})`);
      
      // Validate input parameters
      if (!name || !host || !username || !password) {
        throw new Error('Missing required parameters: name, host, username, password');
      }

      // Validate port number
      const portNum = parseInt(port);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        throw new Error('Invalid port number. Must be between 1 and 65535');
      }

      const client = new RouterOSAPI({
        host: host.trim(),
        user: username.trim(),
        password,
        port: portNum,
        timeout: 15000 // Increased timeout
      });

      console.log(`Connecting to RouterOS API at ${host}:${portNum}...`);
      await client.connect();
      
      // Test the connection by getting system identity
      const identity = await client.write('/system/identity/print');
      console.log(`Successfully connected to ${name}. Identity:`, identity[0]?.name || 'Unknown');
      
      device.connected = true;
      device.lastUpdate = new Date().toISOString();
      
      this.devices.set(deviceId, device);
      this.connections.set(deviceId, client);

      console.log(`Device ${name} (${host}:${portNum}) connected successfully`);
      return { success: true, device };
    } catch (error) {
      console.error(`Failed to connect to device ${name} (${host}:${port}):`, error);
      
      device.error = error.message || 'Unknown connection error';
      this.devices.set(deviceId, device);
      
      // Return more detailed error information
      return {
        success: false,
        device,
        error: error.message || 'Unknown connection error',
        details: {
          code: error.code,
          errno: error.errno,
          syscall: error.syscall,
          address: error.address,
          port: error.port
        }
      };
    }
  }

  async removeDevice(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    const connection = this.connections.get(deviceId);
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error('Error closing connection:', error);
      }
    }

    this.devices.delete(deviceId);
    this.connections.delete(deviceId);

    return { success: true, message: 'Device removed successfully' };
  }

  getAllDevices() {
    return Array.from(this.devices.values());
  }

  getDevice(deviceId) {
    return this.devices.get(deviceId);
  }

  async reconnectDevice(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error('Device not found for reconnection');
    }

    // Close existing connection if any
    const existingConnection = this.connections.get(deviceId);
    if (existingConnection) {
      try {
        await existingConnection.close();
      } catch (error) {
        console.error(`Error closing existing connection for ${deviceId}:`, error);
      } finally {
        this.connections.delete(deviceId);
      }
    }

    try {
      console.log(`Attempting to reconnect device ${device.name} (${device.host}:${device.port})`);
      const client = new RouterOSAPI({
        host: device.host.trim(),
        user: device.username.trim(),
        password: device.password, // Assuming password is stored or re-fetched
        port: device.port,
        timeout: 15000
      });
      await client.connect();
      await client.write('/system/identity/print'); // Test connection
      
      device.connected = true;
      device.lastUpdate = new Date().toISOString();
      device.error = null; // Clear any previous error
      this.devices.set(deviceId, device);
      this.connections.set(deviceId, client);
      console.log(`Device ${device.name} reconnected successfully.`);
      return true;
    } catch (error) {
      console.error(`Failed to reconnect device ${device.name}:`, error);
      device.connected = false;
      device.error = error.message || 'Failed to reconnect';
      this.devices.set(deviceId, device);
      return false;
    }
  }

  async getMonitoringData(deviceId) {
    let connection = this.connections.get(deviceId);
    const device = this.devices.get(deviceId);
    
    if (!connection || !device?.connected) {
      console.log(`Device ${deviceId} not connected, attempting reconnection...`);
      const reconnected = await this.reconnectDevice(deviceId);
      if (!reconnected) {
        throw new Error('Device not connected and failed to reconnect');
      }
      connection = this.connections.get(deviceId); // Get the new connection
    }

    try {
      // Get system resource information
      const resources = await connection.write('/system/resource/print');
      const systemResource = resources[0] || {};

      // Get interface statistics
      const interfaces = await connection.write('/interface/print');
      const interfaceStats = await Promise.all(
        interfaces.map(async (iface) => {
          const results = await connection.write('/interface/monitor-traffic', [`=interface=${iface.name}`, '=once=']);
          const stats = results[0];
          return {
            id: iface.name, // Use interface name as unique ID
            name: iface.name,
            type: iface.type,
            running: iface.running === 'true',
            disabled: iface.disabled === 'true',
            'mac-address': iface['mac-address'],
            'ip-address': iface['ip-address'] || iface.address,
            ...stats
          };
        })
      );

      // Get firewall rules
      const firewallRules = await connection.write('/ip/firewall/filter/print');
      
      // Get active connections
      const activeConnections = await connection.write('/ip/firewall/connection/print');

      // Get DHCP leases
      const dhcpLeases = await connection.write('/ip/dhcp-server/lease/print');

      // Get IP address information
      const ipAddresses = await connection.write('/ip/address/print');
      
      // Get routing information (for gateway)
      const routes = await connection.write('/ip/route/print');
      
      // Get DNS information
      const dns = await connection.write('/ip/dns/print');

      // Get system identity
      const identity = await connection.write('/system/identity/print');

      // Get queue information
      const queues = await connection.write('/queue/simple/print');
      const queueTree = await connection.write('/queue/tree/print');
      console.log('Queue Tree Data from MikroTik:', queueTree);

      // Update last update time
      device.lastUpdate = new Date().toISOString();
      this.devices.set(deviceId, device);

      return {
        system: {
          identity: identity[0]?.name || device.name,
          version: systemResource.version,
          uptime: systemResource.uptime,
          cpuLoad: parseFloat(systemResource['cpu-load']) || 0,
          freeMemory: parseInt(systemResource['free-memory']) || 0,
          totalMemory: parseInt(systemResource['total-memory']) || 0,
          freeDisk: parseInt(systemResource['free-hdd-space']) || 0,
          totalDisk: parseInt(systemResource['total-hdd-space']) || 0,
          temperature: parseFloat(systemResource.temperature) || null,
          boardName: systemResource['board-name'],
          architectureName: systemResource['architecture-name'],
          serialNumber: systemResource['serial-number'],
          factorySoftwareVersion: systemResource['factory-software-version'],
          platform: systemResource.platform,
          boardType: systemResource['board-type'],
          cpuFrequency: parseInt(systemResource['cpu-frequency']) || 0,
          cpuCount: parseInt(systemResource['cpu-count']) || 0
        },
        interfaces: interfaceStats,
        security: {
          firewallRules: firewallRules.map(rule => ({
            '.id': rule['.id'],
            chain: rule.chain,
            action: rule.action,
            protocol: rule.protocol,
            'src-address': rule['src-address'],
            'dst-port': rule['dst-port'],
            comment: rule.comment,
            disabled: rule.disabled === 'true'
          })),
          activeConnections: activeConnections.length,
          dhcpLeases: dhcpLeases.length,
          blockedIpsCount: 0 // This will be updated when we fetch blocked IPs
        },
        network: {
          dhcpLeases: dhcpLeases.map(lease => ({
            address: lease.address,
            macAddress: lease['mac-address'],
            hostName: lease['host-name'] || 'Unknown',
            status: lease.status
          })),
          activeConnections: activeConnections.map(conn => ({
            srcAddress: conn['src-address'],
            dstAddress: conn['dst-address'],
            protocol: conn.protocol,
            state: conn.state,
            timeout: conn.timeout
          })),
          // Add network properties
          address: ipAddresses[0]?.address || '',
          gateway: routes.find(route => route.dst === '0.0.0.0/0')?.gateway || '',
          dns: dns[0]?.servers || '',
          interface: ipAddresses[0]?.interface || '',
          status: ipAddresses[0] ? 'connected' : 'disconnected'
        },
        queues: queues.map(queue => ({
          id: queue['.id'],
          name: queue.name,
          target: queue.target,
          rate: queue.rate,
          maxLimit: queue['max-limit'],
          comment: queue.comment,
          disabled: queue.disabled === 'true'
        })),
        queueTree: queueTree.map(item => ({
          id: item['.id'],
          name: item.name,
          parent: item.parent,
          'packet-mark': item['packet-mark'],
          rate: item.rate,
          'max-limit': item['max-limit'],
          comment: item.comment,
          disabled: item.disabled === 'true'
        }))
      };
    } catch (error) {
      device.connected = false;
      device.error = error.message;
      this.devices.set(deviceId, device);
      throw error;
    }
  }

  async testConnection(deviceId) {
    const connection = this.connections.get(deviceId);
    if (!connection) {
      return false;
    }

    try {
      await connection.write('/system/identity/print');
      return true;
    } catch (error) {
      return false;
    }
  }

  async getLogs(deviceId) {
    let connection = this.connections.get(deviceId);
    const device = this.devices.get(deviceId);

    if (!connection || !device?.connected) {
      console.log(`Device ${deviceId} not connected, attempting reconnection...`);
      const reconnected = await this.reconnectDevice(deviceId);
      if (!reconnected) {
        throw new Error('Device not connected and failed to reconnect');
      }
      connection = this.connections.get(deviceId); // Get the new connection
    }

    try {
      const logs = await connection.write('/log/print');
      return logs;
    } catch (error) {
      console.error(`Error fetching logs for device ${deviceId}:`, error);
      throw error;
    }
  }

  async getAddressLists(deviceId) {
    const connection = this.connections.get(deviceId);
    const device = this.devices.get(deviceId);

    if (!connection || !device?.connected) {
      throw new Error('Device not connected');
    }

    try {
      const addressLists = await connection.write('/ip/firewall/address-list/print');
      return addressLists;
    } catch (error) {
      console.error(`Error fetching address lists for device ${deviceId}:`, error);
      throw error;
    }
  }

  async addAddressListEntry(deviceId, list, address, comment) {
    const connection = this.connections.get(deviceId);
    const device = this.devices.get(deviceId);

    if (!connection || !device?.connected) {
      throw new Error('Device not connected');
    }

    try {
      const result = await connection.write('/ip/firewall/address-list/add', [`=list=${list}`, `=address=${address}`, `=comment=${comment || ''}`]);
      return result;
    } catch (error) {
      console.error(`Error adding address list entry for device ${deviceId}:`, error);
      throw error;
    }
  }

  async removeAddressListEntry(deviceId, id) {
    const connection = this.connections.get(deviceId);
    const device = this.devices.get(deviceId);

    if (!connection || !device?.connected) {
      throw new Error('Device not connected');
    }

    try {
      const result = await connection.write('/ip/firewall/address-list/remove', [`=.id=${id}`]);
      return result;
    } catch (error) {
      console.error(`Error removing address list entry for device ${deviceId}:`, error);
      throw error;
    }
  }

  async getScripts(deviceId) {
    console.log(`Getting scripts for device ${deviceId}`);
    const connection = this.connections.get(deviceId);
    const device = this.devices.get(deviceId);

    if (!connection) {
      console.error(`No connection found for device ${deviceId}`);
      throw new Error(`No connection found for device ${deviceId}`);
    }

    if (!device) {
      console.error(`Device ${deviceId} not found`);
      throw new Error(`Device ${deviceId} not found`);
    }

    if (!device.connected) {
      console.error(`Device ${deviceId} is not connected`);
      throw new Error(`Device ${deviceId} is not connected`);
    }

    try {
      // Test connection first
      console.log(`Testing connection for device ${deviceId}`);
      await connection.write('/system/identity/print');
      console.log(`Connection test successful for device ${deviceId}`);

      console.log(`Executing /system/script/print for device ${deviceId}`);
      const scripts = await connection.write('/system/script/print');
      console.log(`Successfully retrieved ${scripts ? scripts.length : 0} scripts for device ${deviceId}`);
      
      // Handle case where scripts might be undefined or null
      if (!scripts || !Array.isArray(scripts)) {
        console.log(`No scripts found or invalid response for device ${deviceId}`);
        return [];
      }
      
      // Format scripts with proper structure
      const formattedScripts = scripts.map(script => ({
        '.id': script['.id'] || '',
        name: script.name || 'Unnamed Script',
        source: script.source || '',
        comment: script.comment || '',
        'last-started': script['last-started'] || null,
        'run-count': parseInt(script['run-count']) || 0,
        disabled: script.disabled === 'true'
      }));
      
      return formattedScripts;
    } catch (error) {
      console.error(`Error fetching scripts for device ${deviceId}:`, error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        errno: error.errno,
        stack: error.stack
      });
      
      // Update device connection status if connection failed
      if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
        device.connected = false;
        device.error = `Connection lost: ${error.message}`;
        this.devices.set(deviceId, device);
      }
      
      throw new Error(`Failed to fetch scripts: ${error.message}`);
    }
  }

  async addScript(deviceId, name, source) {
    const connection = this.connections.get(deviceId);
    const device = this.devices.get(deviceId);

    if (!connection || !device?.connected) {
      throw new Error('Device not connected');
    }

    try {
      const result = await connection.write('/system/script/add', [`=name=${name}`, `=source=${source}`]);
      return result;
    } catch (error) {
      console.error(`Error adding script for device ${deviceId}:`, error);
      throw error;
    }
  }

  async removeScript(deviceId, id) {
    const connection = this.connections.get(deviceId);
    const device = this.devices.get(deviceId);

    if (!connection || !device?.connected) {
      throw new Error('Device not connected');
    }

    try {
      const result = await connection.write('/system/script/remove', [`=.id=${id}`]);
      return result;
    } catch (error) {
      console.error(`Error removing script for device ${deviceId}:`, error);
      throw error;
    }
  }

  async runScript(deviceId, name) {
    const connection = this.connections.get(deviceId);
    const device = this.devices.get(deviceId);

    if (!connection || !device?.connected) {
      throw new Error('Device not connected');
    }

    try {
      const result = await connection.write('/system/script/run', [`=name=${name}`]);
      return result;
    } catch (error) {
      console.error(`Error running script for device ${deviceId}:`, error);
      throw error;
    }
  }

  async createBackup(deviceId) {
    const connection = this.connections.get(deviceId);
    const device = this.devices.get(deviceId);

    if (!connection || !device?.connected) {
      throw new Error('Device not connected');
    }

    try {
      const result = await connection.write('/system/backup/save', [`=name=${device.name}-${new Date().toISOString().replace(/[:.]/g, '-')}`]);
      return result;
    } catch (error) {
      console.error(`Error creating backup for device ${deviceId}:`, error);
      throw error;
    }
  }

  async exportConfiguration(deviceId) {
    const connection = this.connections.get(deviceId);
    const device = this.devices.get(deviceId);

    if (!connection || !device?.connected) {
      throw new Error('Device not connected');
    }

    try {
      const result = await connection.write('/export', [`=file=${device.name}-${new Date().toISOString().replace(/[:.]/g, '-')}`]);
      return result;
    } catch (error) {
      console.error(`Error exporting configuration for device ${deviceId}:`, error);
      throw error;
    }
  }

  async getAddressesInList(deviceId, listName) {
    const connection = this.connections.get(deviceId);
    const device = this.devices.get(deviceId);

    if (!connection || !device?.connected) {
      throw new Error('Device not connected');
    }

    try {
      const addresses = await connection.write('/ip/firewall/address-list/print', [`?list=${listName}`]);
      return addresses;
    } catch (error) {
      console.error(`Error fetching addresses in list ${listName} for device ${deviceId}:`, error);
      throw error;
    }
  }

  async getAllLogs() {
    const allLogs = [];
    for (const [deviceId, connection] of this.connections.entries()) {
      const device = this.devices.get(deviceId);
      if (device?.connected) {
        try {
          const logs = await connection.write('/log/print');
          allLogs.push(...logs.map(log => ({ ...log, deviceId, deviceName: device.name })));
        } catch (error) {
          console.error(`Error fetching logs for device ${deviceId}:`, error);
        }
      }
    }
    return allLogs;
  }

  disconnectAll() {
    this.connections.forEach(async (connection, deviceId) => {
      try {
        await connection.close();
      } catch (error) {
        console.error(`Error closing connection for device ${deviceId}:`, error);
      }
    });
    
    this.connections.clear();
    this.devices.clear();
  }

  async addFirewallFilterRule(deviceId, ruleData) {
    const connection = this.connections.get(deviceId);
    const device = this.devices.get(deviceId);

    if (!connection || !device?.connected) {
      throw new Error('Device not connected');
    }

    try {
      // Build parameters for the API call
      const params = [];
      Object.entries(ruleData).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          // Convert boolean values to string representation
          const formattedValue = typeof value === 'boolean' ? (value ? 'yes' : 'no') : value;
          params.push(`=${key}=${formattedValue}`);
        }
      });

      const result = await connection.write('/ip/firewall/filter/add', params);
      return result;
    } catch (error) {
      console.error(`Error adding firewall filter rule for device ${deviceId}:`, error);
      throw error;
    }
  }

  async updateFirewallFilterRule(deviceId, ruleId, ruleData) {
    const connection = this.connections.get(deviceId);
    const device = this.devices.get(deviceId);

    if (!connection || !device?.connected) {
      throw new Error('Device not connected');
    }

    try {
      // Build parameters for the API call
      const params = [`.id=${ruleId}`];
      Object.entries(ruleData).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          // Convert boolean values to string representation
          const formattedValue = typeof value === 'boolean' ? (value ? 'yes' : 'no') : value;
          params.push(`=${key}=${formattedValue}`);
        }
      });

      const result = await connection.write('/ip/firewall/filter/set', params);
      return result;
    } catch (error) {
      console.error(`Error updating firewall filter rule for device ${deviceId}:`, error);
      throw error;
    }
  }

  async removeFirewallFilterRule(deviceId, ruleId) {
    const connection = this.connections.get(deviceId);
    const device = this.devices.get(deviceId);

    if (!connection || !device?.connected) {
      throw new Error('Device not connected');
    }

    try {
      const result = await connection.write('/ip/firewall/filter/remove', [`.id=${ruleId}`]);
      return result;
    } catch (error) {
      console.error(`Error removing firewall filter rule for device ${deviceId}:`, error);
      throw error;
    }
  }

  async getUsers(deviceId) {
    const connection = this.connections.get(deviceId);
    if (!connection) throw new Error('Device not connected');
    return connection.write('/user/print');
  }

  async addUser(deviceId, { name, group, password }) {
    const connection = this.connections.get(deviceId);
    if (!connection) throw new Error('Device not connected');
    const params = [
      `=name=${name}`,
      `=group=${group}`,
    ];
    if (password) {
      params.push(`=password=${password}`);
    }
    return connection.write('/user/add', params);
  }

  async updateUser(deviceId, userId, userData) {
    const connection = this.connections.get(deviceId);
    if (!connection) throw new Error('Device not connected');
    const params = [
      `=.id=${userId}`,
      ...Object.entries(userData).map(([key, value]) => `=${key}=${value}`)
    ];
    return connection.write('/user/set', params);
  }

  async removeUser(deviceId, userId) {
    const connection = this.connections.get(deviceId);
    if (!connection) throw new Error('Device not connected');
    return connection.write('/user/remove', [`=.id=${userId}`]);
  }

  async getIpAddresses(deviceId) {
    const connection = this.connections.get(deviceId);
    if (!connection) throw new Error('Device not connected');
    return connection.write('/ip/address/print');
  }

  async addIpAddress(deviceId, { address, network, interface: iface, comment, disabled }) {
    const connection = this.connections.get(deviceId);
    if (!connection) throw new Error('Device not connected');
    const params = [
      `=address=${address}`,
      `=network=${network}`,
      `=interface=${iface}`,
    ];
    if (comment) params.push(`=comment=${comment}`);
    if (disabled !== undefined) params.push(`=disabled=${disabled ? 'yes' : 'no'}`);
    return connection.write('/ip/address/add', params);
  }

  async updateIpAddress(deviceId, addressId, userData) {
    const connection = this.connections.get(deviceId);
    if (!connection) throw new Error('Device not connected');
    const params = [
      `=.id=${addressId}`,
      ...Object.entries(userData).map(([key, value]) => {
        if (typeof value === 'boolean') return `=${key}=${value ? 'yes' : 'no'}`;
        return `=${key}=${value}`;
      })
    ];
    return connection.write('/ip/address/set', params);
  }

  async removeIpAddress(deviceId, addressId) {
    const connection = this.connections.get(deviceId);
    if (!connection) throw new Error('Device not connected');
    return connection.write('/ip/address/remove', [`=.id=${addressId}`]);
  }

  async getNatRules(deviceId) {
    const connection = this.connections.get(deviceId);
    if (!connection) throw new Error('Device not connected');
    return connection.write('/ip/firewall/nat/print');
  }

  async addNatRule(deviceId, ruleData) {
    const connection = this.connections.get(deviceId);
    if (!connection) throw new Error('Device not connected');
    const params = Object.entries(ruleData).map(([key, value]) => {
      if (typeof value === 'boolean') return `=${key}=${value ? 'yes' : 'no'}`;
      return `=${key}=${value}`;
    });
    return connection.write('/ip/firewall/nat/add', params);
  }

  async updateNatRule(deviceId, ruleId, ruleData) {
    const connection = this.connections.get(deviceId);
    if (!connection) throw new Error('Device not connected');
    const params = [
      `=.id=${ruleId}`,
      ...Object.entries(ruleData).map(([key, value]) => {
        if (typeof value === 'boolean') return `=${key}=${value ? 'yes' : 'no'}`;
        return `=${key}=${value}`;
      })
    ];
    return connection.write('/ip/firewall/nat/set', params);
  }

  async removeNatRule(deviceId, ruleId) {
    const connection = this.connections.get(deviceId);
    if (!connection) throw new Error('Device not connected');
    return connection.write('/ip/firewall/nat/remove', [`=.id=${ruleId}`]);
  }

  async getQueues(deviceId) {
    const connection = this.connections.get(deviceId);
    if (!connection) throw new Error('Device not connected');
    return connection.write('/queue/simple/print');
  }

  async addQueue(deviceId, queueData) {
    const connection = this.connections.get(deviceId);
    if (!connection) throw new Error('Device not connected');
    const params = Object.entries(queueData).map(([key, value]) => {
      if (typeof value === 'boolean') return `=${key}=${value ? 'yes' : 'no'}`;
      return `=${key}=${value}`;
    });
    return connection.write('/queue/simple/add', params);
  }

  async updateQueue(deviceId, queueId, queueData) {
    const connection = this.connections.get(deviceId);
    if (!connection) throw new Error('Device not connected');
    const params = [
      `=.id=${queueId}`,
      ...Object.entries(queueData).map(([key, value]) => {
        if (typeof value === 'boolean') return `=${key}=${value ? 'yes' : 'no'}`;
        return `=${key}=${value}`;
      })
    ];
    return connection.write('/queue/simple/set', params);
  }

  async removeQueue(deviceId, queueId) {
    const connection = this.connections.get(deviceId);
    if (!connection) throw new Error('Device not connected');
    return connection.write('/queue/simple/remove', [`=.id=${queueId}`]);
  }

  async getQueueTrees(deviceId) {
    const connection = this.connections.get(deviceId);
    if (!connection) throw new Error('Device not connected');
    return connection.write('/queue/tree/print');
  }

  async addQueueTree(deviceId, treeData) {
    const connection = this.connections.get(deviceId);
    if (!connection) throw new Error('Device not connected');
    const params = Object.entries(treeData).map(([key, value]) => {
      if (typeof value === 'boolean') return `=${key}=${value ? 'yes' : 'no'}`;
      return `=${key}=${value}`;
    });
    return connection.write('/queue/tree/add', params);
  }

  async updateQueueTree(deviceId, treeId, treeData) {
    const connection = this.connections.get(deviceId);
    if (!connection) throw new Error('Device not connected');
    const params = [
      `=.id=${treeId}`,
      ...Object.entries(treeData).map(([key, value]) => {
        if (typeof value === 'boolean') return `=${key}=${value ? 'yes' : 'no'}`;
        return `=${key}=${value}`;
      })
    ];
    return connection.write('/queue/tree/set', params);
  }

  async removeFirewallFilterRule(deviceId, ruleId) {
    const connection = this.connections.get(deviceId);
    if (!connection) throw new Error('Device not connected');
    return connection.write('/ip/firewall/filter/remove', [`=.id=${ruleId}`]);
  }
}