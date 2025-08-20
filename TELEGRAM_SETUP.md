# Telegram Bot Integration Setup Guide

## Overview
This guide explains how to set up Telegram bot notifications for the MikroTik monitoring system. The system can send real-time alerts to Telegram chats when monitoring thresholds are exceeded.

## Features
- 🤖 Telegram bot integration for real-time notifications
- 📊 Configurable alert rules (CPU, Memory, Network Traffic)
- 🔧 Web-based configuration interface
- ✅ Chat ID validation and testing
- 🔄 Automatic alert monitoring with cooldown periods
- 📱 Support for both personal chats and groups

## Prerequisites
- Telegram account
- Access to @BotFather on Telegram
- Running MikroTik monitoring system

## Step 1: Create a Telegram Bot

1. **Start a chat with @BotFather** on Telegram
2. **Send `/newbot`** command
3. **Choose a name** for your bot (e.g., "MikroTik Monitor Bot")
4. **Choose a username** for your bot (must end with 'bot', e.g., "mikrotik_monitor_bot")
5. **Copy the bot token** provided by BotFather (format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

## Step 2: Configure Environment Variables

1. **Copy the environment file:**
   ```bash
   cd server
   cp .env.example .env
   ```

2. **Edit the .env file:**
   ```bash
   # JWT Secret for authentication
   JWT_SECRET=supersecretjwtkey
   
   # Telegram Bot Configuration
   TELEGRAM_BOT_TOKEN=your_actual_bot_token_here
   
   # Server Configuration
   PORT=3001
   ```

## Step 3: Get Chat IDs

### For Personal Chat:
1. **Send a message** to your bot on Telegram
2. **Open this URL** in your browser (replace `YOUR_BOT_TOKEN`):
   ```
   https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates
   ```
3. **Find the chat ID** in the response (usually a positive number)

### For Group Chat:
1. **Add your bot** to the group
2. **Send a message** in the group (mention the bot with @)
3. **Open the getUpdates URL** (same as above)
4. **Find the chat ID** in the response (usually a negative number like `-1001234567890`)

## Step 4: Configure the System

1. **Start the server:**
   ```bash
   cd server
   npm start
   ```

2. **Access the web interface** at `http://localhost:3000`

3. **Login** with your credentials (default: admin/admin123)

4. **Navigate to "Telegram Settings"** in the sidebar

5. **Configure the bot:**
   - Enter your bot token (if not set via environment variable)
   - Add chat IDs for notifications
   - Test each chat ID to ensure it works
   - Enable Telegram notifications

## Step 5: Set Up Alert Rules

1. **Navigate to "Alerts Manager"** in the sidebar

2. **Create alert rules:**
   - **Name:** Descriptive name for the alert
   - **Metric:** Choose from CPU, Memory, RX Rate, TX Rate
   - **Condition:** Greater than (>) or Less than (<)
   - **Threshold:** Numeric value for the threshold
   - **Unit:** % for CPU/Memory, Mbps/Kbps for network rates
   - **Channels:** Select "Telegram" checkbox

3. **Example alert rules:**
   - **High CPU:** CPU > 90%
   - **Low Memory:** Memory > 85%
   - **High Traffic:** RX Rate > 100 Mbps

## Step 6: Test the System

1. **Use the test function** in Telegram Settings to verify bot communication
2. **Create a test alert** with low thresholds to trigger notifications
3. **Monitor the system** and wait for alerts to be triggered

## Alert Message Format

Telegram alerts include:
- 🔴/🟡 Status icon
- **Alert name** and device name
- **Metric details** (current vs threshold)
- **Timestamp** in local format
- **System identification**

Example message:
```
🔴 ALERT: High CPU Load

📊 Device: Router-Main
📈 Metric: CPU
⚠️ Condition: > 90%
📋 Current Value: 95%
🕐 Time: 18/08/2025 14:30:15

Sistem monitoring MikroTik
```

## Troubleshooting

### Bot Token Issues
- ✅ Verify token format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`
- ✅ Check token is active (test with getMe API)
- ✅ Ensure no extra spaces in environment variable

### Chat ID Issues
- ✅ Use correct format (positive for personal, negative for groups)
- ✅ Ensure bot can send messages to the chat
- ✅ For groups, make sure bot is added as member

### No Alerts Received
- ✅ Check alert rules are properly configured
- ✅ Verify Telegram notifications are enabled
- ✅ Ensure monitoring data is being received
- ✅ Check server logs for errors

### API Errors
- ✅ Verify server is running on correct port
- ✅ Check authentication token is valid
- ✅ Ensure network connectivity to Telegram API

## API Endpoints

The system provides these API endpoints for Telegram integration:

- `GET /api/telegram/config` - Get current configuration
- `POST /api/telegram/config` - Update configuration
- `POST /api/telegram/test` - Send test message
- `POST /api/telegram/validate-chat` - Validate chat ID
- `GET /api/telegram/bot-info` - Get bot information
- `POST /api/telegram/send-alert` - Send alert (internal use)

## Security Considerations

- 🔒 Keep bot token secure and never share it
- 🔒 Use environment variables for sensitive data
- 🔒 Regularly rotate bot tokens if compromised
- 🔒 Monitor bot usage and unauthorized access
- 🔒 Use private groups for sensitive alerts

## Advanced Configuration

### Alert Cooldown
- Default: 5 minutes between same alerts
- Prevents spam notifications
- Configurable in `alertService.js`

### Custom Message Format
- Modify `telegramService.js` to customize message format
- Support for HTML formatting in messages
- Emoji and formatting options available

### Multiple Bot Support
- System supports multiple bots (requires code modification)
- Useful for different alert types or departments

## Support

For issues or questions:
1. Check server logs for error messages
2. Verify all configuration steps
3. Test with simple alert rules first
4. Ensure network connectivity

## Version History

- **v1.0** - Initial Telegram bot integration
- **v1.1** - Added chat validation and testing
- **v1.2** - Improved error handling and logging