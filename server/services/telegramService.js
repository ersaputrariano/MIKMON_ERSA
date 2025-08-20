import axios from 'axios';

class TelegramService {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.baseURL = `https://api.telegram.org/bot${this.botToken}`;
  }

  /**
   * Send a message to a Telegram chat
   * @param {string} chatId - The chat ID to send the message to
   * @param {string} message - The message to send
   * @param {Object} options - Additional options for the message
   */
  async sendMessage(chatId, message, options = {}) {
    if (!this.botToken) {
      console.error('Telegram bot token not configured');
      return false;
    }

    try {
      const payload = {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        ...options
      };

      const response = await axios.post(`${this.baseURL}/sendMessage`, payload);
      
      if (response.data.ok) {
        console.log(`Telegram message sent successfully to chat ${chatId}`);
        return true;
      } else {
        console.error('Telegram API error:', response.data);
        return false;
      }
    } catch (error) {
      console.error('Error sending Telegram message:', error.message);
      return false;
    }
  }

  /**
   * Send an alert notification to Telegram
   * @param {string} chatId - The chat ID to send the alert to
   * @param {Object} alertData - The alert data
   */
  async sendAlert(chatId, alertData) {
    const { deviceName, metric, condition, threshold, unit, currentValue, timestamp } = alertData;
    
    const conditionSymbol = condition === 'greater' ? '>' : '<';
    const statusIcon = condition === 'greater' ? '🔴' : '🟡';
    
    const message = `
${statusIcon} <b>ALERT: ${alertData.alertName}</b>

📊 <b>Device:</b> ${deviceName}
📈 <b>Metric:</b> ${metric.toUpperCase()}
⚠️ <b>Condition:</b> ${conditionSymbol} ${threshold}${unit}
📋 <b>Current Value:</b> ${currentValue}${unit}
🕐 <b>Time:</b> ${new Date(timestamp).toLocaleString('id-ID')}

<i>Sistem monitoring MikroTik</i>
    `.trim();

    return await this.sendMessage(chatId, message);
  }

  /**
   * Send a test message to verify bot configuration
   * @param {string} chatId - The chat ID to send the test message to
   */
  async sendTestMessage(chatId) {
    const message = `
🤖 <b>Test Notification</b>

✅ Telegram bot berhasil terkonfigurasi!
📡 Sistem monitoring MikroTik siap mengirim notifikasi.

<i>Pesan ini dikirim pada: ${new Date().toLocaleString('id-ID')}</i>
    `.trim();

    return await this.sendMessage(chatId, message);
  }

  /**
   * Get bot information
   */
  async getBotInfo() {
    if (!this.botToken) {
      throw new Error('Telegram bot token not configured');
    }

    try {
      const response = await axios.get(`${this.baseURL}/getMe`);
      return response.data;
    } catch (error) {
      console.error('Error getting bot info:', error.message);
      throw error;
    }
  }

  /**
   * Validate chat ID by sending a test message
   * @param {string} chatId - The chat ID to validate
   */
  async validateChatId(chatId) {
    try {
      const testMessage = '🔍 Validating chat ID...';
      const result = await this.sendMessage(chatId, testMessage);
      
      if (result) {
        // Send a follow-up message to confirm validation
        await this.sendMessage(chatId, '✅ Chat ID valid! Notifikasi akan dikirim ke chat ini.');
      }
      
      return result;
    } catch (error) {
      console.error('Chat ID validation failed:', error.message);
      return false;
    }
  }
}

export default new TelegramService();