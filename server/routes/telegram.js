import express from 'express';
import telegramService from '../services/telegramService.js';

const router = express.Router();

// Store Telegram configurations (in production, use a database)
let telegramConfig = {
  botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  chatIds: [], // Array of chat IDs for notifications
  enabled: false
};

/**
 * Get current Telegram configuration
 */
router.get('/config', (req, res) => {
  res.json({
    enabled: telegramConfig.enabled,
    chatIds: telegramConfig.chatIds,
    botConfigured: !!telegramConfig.botToken
  });
});

/**
 * Update Telegram configuration
 */
router.post('/config', async (req, res) => {
  try {
    const { enabled, chatIds, botToken } = req.body;

    if (botToken) {
      telegramConfig.botToken = botToken;
      process.env.TELEGRAM_BOT_TOKEN = botToken;
    }

    if (Array.isArray(chatIds)) {
      telegramConfig.chatIds = chatIds;
    }

    if (typeof enabled === 'boolean') {
      telegramConfig.enabled = enabled;
    }

    res.json({
      success: true,
      message: 'Telegram configuration updated successfully',
      config: {
        enabled: telegramConfig.enabled,
        chatIds: telegramConfig.chatIds,
        botConfigured: !!telegramConfig.botToken
      }
    });
  } catch (error) {
    console.error('Error updating Telegram config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update Telegram configuration',
      error: error.message
    });
  }
});

/**
 * Test Telegram bot configuration
 */
router.post('/test', async (req, res) => {
  try {
    const { chatId } = req.body;

    if (!chatId) {
      return res.status(400).json({
        success: false,
        message: 'Chat ID is required'
      });
    }

    const result = await telegramService.sendTestMessage(chatId);

    if (result) {
      res.json({
        success: true,
        message: 'Test message sent successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to send test message. Check bot token and chat ID.'
      });
    }
  } catch (error) {
    console.error('Error testing Telegram:', error);
    res.status(500).json({
      success: false,
      message: 'Error testing Telegram configuration',
      error: error.message
    });
  }
});

/**
 * Validate a chat ID
 */
router.post('/validate-chat', async (req, res) => {
  try {
    const { chatId } = req.body;

    if (!chatId) {
      return res.status(400).json({
        success: false,
        message: 'Chat ID is required'
      });
    }

    const isValid = await telegramService.validateChatId(chatId);

    res.json({
      success: isValid,
      message: isValid ? 'Chat ID is valid' : 'Chat ID is invalid or bot cannot send messages to this chat'
    });
  } catch (error) {
    console.error('Error validating chat ID:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating chat ID',
      error: error.message
    });
  }
});

/**
 * Get bot information
 */
router.get('/bot-info', async (req, res) => {
  try {
    const botInfo = await telegramService.getBotInfo();
    res.json({
      success: true,
      botInfo: botInfo.result
    });
  } catch (error) {
    console.error('Error getting bot info:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting bot information. Check bot token.',
      error: error.message
    });
  }
});

/**
 * Send alert notification (used by monitoring system)
 */
router.post('/send-alert', async (req, res) => {
  try {
    if (!telegramConfig.enabled) {
      return res.status(400).json({
        success: false,
        message: 'Telegram notifications are disabled'
      });
    }

    if (telegramConfig.chatIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No chat IDs configured'
      });
    }

    const alertData = req.body;
    const results = [];

    // Send alert to all configured chat IDs
    for (const chatId of telegramConfig.chatIds) {
      const result = await telegramService.sendAlert(chatId, alertData);
      results.push({ chatId, success: result });
    }

    const successCount = results.filter(r => r.success).length;

    res.json({
      success: successCount > 0,
      message: `Alert sent to ${successCount}/${results.length} chats`,
      results
    });
  } catch (error) {
    console.error('Error sending alert:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending alert notification',
      error: error.message
    });
  }
});

// Export the configuration for use in other modules
export { telegramConfig };
export default router;