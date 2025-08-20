import telegramService from './telegramService.js';
import { telegramConfig } from '../routes/telegram.js';

class AlertService {
  constructor() {
    this.alertRules = []; // In production, store in database
    this.lastAlertTimes = new Map(); // Track when alerts were last sent
    this.alertCooldown = 5 * 60 * 1000; // 5 minutes cooldown between same alerts
  }

  /**
   * Add or update an alert rule
   * @param {Object} rule - Alert rule configuration
   */
  addAlertRule(rule) {
    const existingIndex = this.alertRules.findIndex(r => r.id === rule.id);
    if (existingIndex >= 0) {
      this.alertRules[existingIndex] = rule;
    } else {
      this.alertRules.push(rule);
    }
    console.log(`Alert rule ${rule.name} added/updated`);
  }

  /**
   * Remove an alert rule
   * @param {string} ruleId - Rule ID to remove
   */
  removeAlertRule(ruleId) {
    this.alertRules = this.alertRules.filter(r => r.id !== ruleId);
    console.log(`Alert rule ${ruleId} removed`);
  }

  /**
   * Get all alert rules
   */
  getAlertRules() {
    return this.alertRules;
  }

  /**
   * Check monitoring data against alert rules
   * @param {string} deviceId - Device ID
   * @param {string} deviceName - Device name
   * @param {Object} monitoringData - Monitoring data from MikroTik
   */
  async checkAlerts(deviceId, deviceName, monitoringData) {
    if (!monitoringData || !monitoringData.system) {
      return;
    }

    const { system, interfaces } = monitoringData;
    const timestamp = new Date().toISOString();

    // Check system-level alerts
    await this.checkSystemAlerts(deviceId, deviceName, system, timestamp);

    // Check interface-level alerts
    if (interfaces && interfaces.length > 0) {
      await this.checkInterfaceAlerts(deviceId, deviceName, interfaces, timestamp);
    }
  }

  /**
   * Check system-level alerts (CPU, Memory)
   */
  async checkSystemAlerts(deviceId, deviceName, systemData, timestamp) {
    for (const rule of this.alertRules) {
      let currentValue = null;
      let metricName = '';

      switch (rule.metric) {
        case 'cpu':
          currentValue = systemData.cpuLoad;
          metricName = 'CPU Load';
          break;
        case 'memory':
          if (systemData.totalMemory > 0) {
            currentValue = ((systemData.totalMemory - systemData.freeMemory) / systemData.totalMemory) * 100;
          }
          metricName = 'Memory Usage';
          break;
        default:
          continue;
      }

      if (currentValue !== null) {
        await this.evaluateRule(rule, deviceId, deviceName, metricName, currentValue, timestamp);
      }
    }
  }

  /**
   * Check interface-level alerts (RX/TX rates)
   */
  async checkInterfaceAlerts(deviceId, deviceName, interfaces, timestamp) {
    for (const rule of this.alertRules) {
      if (rule.metric !== 'rx-rate' && rule.metric !== 'tx-rate') {
        continue;
      }

      for (const iface of interfaces) {
        let currentValue = null;
        let metricName = '';

        switch (rule.metric) {
          case 'rx-rate':
            if (iface['rx-bits-per-second']) {
              currentValue = this.convertBitsToMbps(parseInt(iface['rx-bits-per-second']));
              metricName = `RX Rate (${iface.name})`;
            }
            break;
          case 'tx-rate':
            if (iface['tx-bits-per-second']) {
              currentValue = this.convertBitsToMbps(parseInt(iface['tx-bits-per-second']));
              metricName = `TX Rate (${iface.name})`;
            }
            break;
        }

        if (currentValue !== null) {
          const ruleKey = `${rule.id}-${iface.name}`;
          await this.evaluateRule(
            { ...rule, id: ruleKey }, 
            deviceId, 
            deviceName, 
            metricName, 
            currentValue, 
            timestamp
          );
        }
      }
    }
  }

  /**
   * Evaluate a single rule against current value
   */
  async evaluateRule(rule, deviceId, deviceName, metricName, currentValue, timestamp) {
    const isTriggered = this.checkCondition(rule.condition, currentValue, rule.threshold);
    
    if (!isTriggered) {
      return;
    }

    // Check cooldown to prevent spam
    const alertKey = `${deviceId}-${rule.id}`;
    const lastAlertTime = this.lastAlertTimes.get(alertKey);
    const now = Date.now();
    
    if (lastAlertTime && (now - lastAlertTime) < this.alertCooldown) {
      return; // Still in cooldown period
    }

    // Update last alert time
    this.lastAlertTimes.set(alertKey, now);

    // Prepare alert data
    const alertData = {
      alertName: rule.name,
      deviceName,
      deviceId,
      metric: metricName,
      condition: rule.condition,
      threshold: rule.threshold,
      unit: rule.unit,
      currentValue: this.formatValue(currentValue, rule.unit),
      timestamp
    };

    // Send notifications based on configured channels
    await this.sendNotifications(rule.channels, alertData);
  }

  /**
   * Check if condition is met
   */
  checkCondition(condition, currentValue, threshold) {
    switch (condition) {
      case 'greater':
        return currentValue > threshold;
      case 'less':
        return currentValue < threshold;
      default:
        return false;
    }
  }

  /**
   * Convert bits per second to Mbps
   */
  convertBitsToMbps(bitsPerSecond) {
    return bitsPerSecond / (1024 * 1024);
  }

  /**
   * Format value based on unit
   */
  formatValue(value, unit) {
    if (unit === '%') {
      return Math.round(value * 100) / 100;
    } else if (unit === 'Mbps') {
      return Math.round(value * 100) / 100;
    } else if (unit === 'Kbps') {
      return Math.round(value * 1024 * 100) / 100;
    }
    return value;
  }

  /**
   * Send notifications through configured channels
   */
  async sendNotifications(channels, alertData) {
    const results = [];

    for (const channel of channels) {
      switch (channel) {
        case 'telegram':
          if (telegramConfig.enabled && telegramConfig.chatIds.length > 0) {
            try {
              const response = await fetch('http://localhost:3001/api/telegram/send-alert', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(alertData)
              });
              
              const result = await response.json();
              results.push({ channel: 'telegram', success: result.success, message: result.message });
            } catch (error) {
              console.error('Error sending Telegram alert:', error);
              results.push({ channel: 'telegram', success: false, error: error.message });
            }
          }
          break;
        
        case 'email':
          // Email implementation would go here
          console.log('Email notification not implemented yet');
          results.push({ channel: 'email', success: false, message: 'Not implemented' });
          break;
        
        default:
          console.log(`Unknown notification channel: ${channel}`);
      }
    }

    console.log(`Alert "${alertData.alertName}" sent:`, results);
    return results;
  }

  /**
   * Load alert rules from storage (database in production)
   */
  loadAlertRules() {
    // In production, load from database
    // For now, use some default rules
    this.alertRules = [
      {
        id: '1',
        name: 'CPU Load Tinggi',
        metric: 'cpu',
        condition: 'greater',
        threshold: 90,
        unit: '%',
        channels: ['telegram']
      },
      {
        id: '2',
        name: 'Memori Hampir Penuh',
        metric: 'memory',
        condition: 'greater',
        threshold: 85,
        unit: '%',
        channels: ['telegram']
      }
    ];
  }

  /**
   * Save alert rules to storage (database in production)
   */
  saveAlertRules() {
    // In production, save to database
    console.log('Alert rules saved (mock implementation)');
  }
}

export default new AlertService();