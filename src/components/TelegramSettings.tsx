import React, { useState, useEffect } from 'react';
import { Send, Bot, MessageCircle, Settings, Plus, Trash2, Check, AlertCircle } from 'lucide-react';
import { useAuthFetch } from '../hooks/useAuthFetch';

interface TelegramConfig {
  enabled: boolean;
  chatIds: string[];
  botConfigured: boolean;
}

interface BotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
}

export const TelegramSettings: React.FC = () => {
  const [config, setConfig] = useState<TelegramConfig>({
    enabled: false,
    chatIds: [],
    botConfigured: false
  });
  const [botToken, setBotToken] = useState('');
  const [newChatId, setNewChatId] = useState('');
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [testingChatId, setTestingChatId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const authFetch = useAuthFetch();

  // Styles
  const cardStyle = "bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-lg p-6";
  const inputStyle = "mt-1 block w-full bg-slate-700/50 border border-slate-600 rounded-lg shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm text-slate-200 px-3 py-2 transition-colors";
  const buttonStyle = "inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-semibold rounded-lg shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-slate-800 disabled:opacity-50 transition-all";

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await authFetch('/api/telegram/config');
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Error loading Telegram config:', error);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const saveBotToken = async () => {
    if (!botToken.trim()) {
      showMessage('error', 'Bot token tidak boleh kosong');
      return;
    }

    setLoading(true);
    try {
      const response = await authFetch('/api/telegram/config', {
        method: 'POST',
        body: JSON.stringify({ botToken }),
      });

      const data = await response.json();
      
      if (data.success) {
        setConfig(data.config);
        setBotToken('');
        showMessage('success', 'Bot token berhasil disimpan');
        await getBotInfo();
      } else {
        showMessage('error', data.message || 'Gagal menyimpan bot token');
      }
    } catch (_) {
      showMessage('error', 'Error menyimpan bot token');
    } finally {
      setLoading(false);
    }
  };

  const getBotInfo = async () => {
    try {
      const response = await authFetch('/api/telegram/bot-info');
      const data = await response.json();
      
      if (data.success) {
        setBotInfo(data.botInfo);
      }
    } catch (error) {
      console.error('Error getting bot info:', error);
    }
  };

  const addChatId = async () => {
    if (!newChatId.trim()) {
      showMessage('error', 'Chat ID tidak boleh kosong');
      return;
    }

    if (config.chatIds.includes(newChatId)) {
      showMessage('error', 'Chat ID sudah ada');
      return;
    }

    setLoading(true);
    try {
      // Validate chat ID first
      const validateResponse = await authFetch('/api/telegram/validate-chat', {
        method: 'POST',
        body: JSON.stringify({ chatId: newChatId }),
      });

      const validateData = await validateResponse.json();
      
      if (!validateData.success) {
        showMessage('error', 'Chat ID tidak valid atau bot tidak dapat mengirim pesan ke chat ini');
        return;
      }

      // Add to config
      const newChatIds = [...config.chatIds, newChatId];
      const response = await authFetch('/api/telegram/config', {
        method: 'POST',
        body: JSON.stringify({ chatIds: newChatIds }),
      });

      const data = await response.json();
      
      if (data.success) {
        setConfig(data.config);
        setNewChatId('');
        showMessage('success', 'Chat ID berhasil ditambahkan dan divalidasi');
      } else {
        showMessage('error', data.message || 'Gagal menambahkan chat ID');
      }
    } catch (_) {
      showMessage('error', 'Error menambahkan chat ID');
    } finally {
      setLoading(false);
    }
  };

  const removeChatId = async (chatIdToRemove: string) => {
    const newChatIds = config.chatIds.filter(id => id !== chatIdToRemove);
    
    try {
      const response = await authFetch('/api/telegram/config', {
        method: 'POST',
        body: JSON.stringify({ chatIds: newChatIds }),
      });

      const data = await response.json();
      
      if (data.success) {
        setConfig(data.config);
        showMessage('success', 'Chat ID berhasil dihapus');
      } else {
        showMessage('error', data.message || 'Gagal menghapus chat ID');
      }
    } catch (_) {
      showMessage('error', 'Error menghapus chat ID');
    }
  };

  const testChatId = async (chatId: string) => {
    setTestingChatId(chatId);
    try {
      const response = await authFetch('/api/telegram/test', {
        method: 'POST',
        body: JSON.stringify({ chatId }),
      });

      const data = await response.json();
      
      if (data.success) {
        showMessage('success', 'Pesan test berhasil dikirim');
      } else {
        showMessage('error', data.message || 'Gagal mengirim pesan test');
      }
    } catch (_) {
      showMessage('error', 'Error mengirim pesan test');
    } finally {
      setTestingChatId(null);
    }
  };

  const toggleEnabled = async () => {
    try {
      const response = await authFetch('/api/telegram/config', {
        method: 'POST',
        body: JSON.stringify({ enabled: !config.enabled }),
      });

      const data = await response.json();
      
      if (data.success) {
        setConfig(data.config);
        showMessage('success', `Notifikasi Telegram ${!config.enabled ? 'diaktifkan' : 'dinonaktifkan'}`);
      } else {
        showMessage('error', data.message || 'Gagal mengubah status');
      }
    } catch (_) {
      showMessage('error', 'Error mengubah status');
    }
  };

  useEffect(() => {
    if (config.botConfigured) {
      getBotInfo();
    }
  }, [config.botConfigured]);

  return (
    <div className="space-y-6">
      {/* Message Alert */}
      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-green-900/20 border-green-500 text-green-300' 
            : 'bg-red-900/20 border-red-500 text-red-300'
        }`}>
          <div className="flex items-center">
            {message.type === 'success' ? (
              <Check className="w-5 h-5 mr-2" />
            ) : (
              <AlertCircle className="w-5 h-5 mr-2" />
            )}
            {message.text}
          </div>
        </div>
      )}

      {/* Header */}
      <div className={cardStyle}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center">
            <Bot className="w-6 h-6 mr-3 text-cyan-400"/>
            Telegram Bot Settings
          </h1>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-slate-400">
              Status: {config.enabled ? 'Aktif' : 'Nonaktif'}
            </span>
            <button
              onClick={toggleEnabled}
              disabled={!config.botConfigured || config.chatIds.length === 0}
              className={`${buttonStyle} ${
                config.enabled 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {config.enabled ? 'Nonaktifkan' : 'Aktifkan'}
            </button>
          </div>
        </div>

        {/* Bot Configuration */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Bot Token
            </label>
            {config.botConfigured ? (
              <div className="flex items-center space-x-4">
                <div className="flex-1 bg-slate-700/30 rounded-lg p-3">
                  <div className="flex items-center text-green-400">
                    <Check className="w-4 h-4 mr-2" />
                    Bot token sudah dikonfigurasi
                  </div>
                  {botInfo && (
                    <div className="text-sm text-slate-400 mt-1">
                      Bot: @{botInfo.username} ({botInfo.first_name})
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setConfig(prev => ({ ...prev, botConfigured: false }))}
                  className={`${buttonStyle} bg-slate-600 hover:bg-slate-500`}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Ubah
                </button>
              </div>
            ) : (
              <div className="flex space-x-2">
                <input
                  type="password"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="Masukkan bot token dari @BotFather"
                  className={`${inputStyle} flex-1`}
                />
                <button
                  onClick={saveBotToken}
                  disabled={loading || !botToken.trim()}
                  className={`${buttonStyle} bg-cyan-600 hover:bg-cyan-700`}
                >
                  {loading ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat IDs Management */}
      {config.botConfigured && (
        <div className={cardStyle}>
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <MessageCircle className="w-5 h-5 mr-2 text-cyan-400" />
            Chat IDs untuk Notifikasi
          </h2>

          {/* Add new chat ID */}
          <div className="flex space-x-2 mb-4">
            <input
              type="text"
              value={newChatId}
              onChange={(e) => setNewChatId(e.target.value)}
              placeholder="Masukkan Chat ID (contoh: -1001234567890)"
              className={`${inputStyle} flex-1`}
            />
            <button
              onClick={addChatId}
              disabled={loading || !newChatId.trim()}
              className={`${buttonStyle} bg-green-600 hover:bg-green-700`}
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah
            </button>
          </div>

          {/* Chat IDs list */}
          <div className="space-y-2">
            {config.chatIds.length > 0 ? (
              config.chatIds.map((chatId) => (
                <div key={chatId} className="flex items-center justify-between bg-slate-700/30 rounded-lg p-3">
                  <span className="text-slate-200 font-mono">{chatId}</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => testChatId(chatId)}
                      disabled={testingChatId === chatId}
                      className={`${buttonStyle} bg-blue-600 hover:bg-blue-700 text-xs px-3 py-1`}
                    >
                      {testingChatId === chatId ? (
                        'Testing...'
                      ) : (
                        <>
                          <Send className="w-3 h-3 mr-1" />
                          Test
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => removeChatId(chatId)}
                      className={`${buttonStyle} bg-red-600 hover:bg-red-700 text-xs px-3 py-1`}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Hapus
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Belum ada chat ID yang dikonfigurasi</p>
                <p className="text-sm mt-1">Tambahkan chat ID untuk menerima notifikasi</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className={`${cardStyle} bg-slate-900/50`}>
        <h3 className="text-lg font-semibold text-white mb-3">Cara Setup Bot Telegram</h3>
        <div className="space-y-2 text-sm text-slate-300">
          <p><strong>1.</strong> Buat bot baru dengan mengirim pesan ke @BotFather di Telegram</p>
          <p><strong>2.</strong> Gunakan command /newbot dan ikuti instruksi</p>
          <p><strong>3.</strong> Copy bot token yang diberikan dan paste di atas</p>
          <p><strong>4.</strong> Untuk mendapatkan Chat ID:</p>
          <ul className="ml-4 space-y-1">
            <li>• Untuk personal chat: Kirim pesan ke bot, lalu buka https://api.telegram.org/bot[BOT_TOKEN]/getUpdates</li>
            <li>• Untuk group: Tambahkan bot ke group, kirim pesan, lalu cek getUpdates</li>
            <li>• Chat ID biasanya berupa angka negatif untuk group (contoh: -1001234567890)</li>
          </ul>
          <p><strong>5.</strong> Tambahkan Chat ID dan test untuk memastikan bot dapat mengirim pesan</p>
        </div>
      </div>
    </div>
  );
};

export default TelegramSettings;