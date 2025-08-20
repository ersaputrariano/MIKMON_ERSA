import React, { useState } from 'react';
import { BellRing, Plus, Edit, Trash2, Cpu, MemoryStick, ArrowDownUp, ShieldAlert } from 'lucide-react';

// Tipe data untuk sebuah alert rule
interface AlertRule {
  id: string;
  name: string;
  metric: 'cpu' | 'memory' | 'rx-rate' | 'tx-rate';
  condition: 'greater' | 'less';
  threshold: number;
  unit: '%' | 'Kbps' | 'Mbps';
  channels: ('email' | 'telegram')[];
}

// Data awal sebagai contoh
const initialAlerts: AlertRule[] = [
  { id: '1', name: 'CPU Load Tinggi', metric: 'cpu', condition: 'greater', threshold: 90, unit: '%', channels: ['email'] },
  { id: '2', name: 'Memori Hampir Penuh', metric: 'memory', condition: 'greater', threshold: 85, unit: '%', channels: ['email', 'telegram'] },
  { id: '3', name: 'Trafik Download Tinggi', metric: 'rx-rate', condition: 'greater', threshold: 100, unit: 'Mbps', channels: ['telegram'] },
];

// Gaya umum yang konsisten
const cardStyle = "bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-lg p-6";
const inputStyle = "mt-1 block w-full bg-slate-700/50 border border-slate-600 rounded-lg shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm text-slate-200 px-3 py-2 transition-colors";
const buttonStyle = "inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-semibold rounded-lg shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-slate-800 disabled:opacity-50 transition-all";


export const AlertsManager: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertRule[]>(initialAlerts);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingAlert, setEditingAlert] = useState<AlertRule | null>(null);

  const handleAddNew = () => {
    setEditingAlert(null);
    setIsFormVisible(true);
  };

  const handleEdit = (alert: AlertRule) => {
    setEditingAlert(alert);
    setIsFormVisible(true);
  };

  const handleDelete = (alertId: string) => {
    // Di aplikasi nyata, Anda akan meminta konfirmasi
    setAlerts(alerts.filter(a => a.id !== alertId));
  };

  const handleFormClose = () => {
    setIsFormVisible(false);
    setEditingAlert(null);
  };
  
  // Fungsi untuk menyimpan (menambah atau mengedit) akan ditambahkan di sini
  const handleSave = (alertData: AlertRule) => {
    if (editingAlert) {
      // Logika edit
      setAlerts(alerts.map(a => a.id === editingAlert.id ? alertData : a));
    } else {
      // Logika tambah baru
      setAlerts([...alerts, { ...alertData, id: Date.now().toString() }]);
    }
    handleFormClose();
  };

  const metricIcons = {
    cpu: <Cpu className="w-4 h-4 mr-2 text-orange-400" />,
    memory: <MemoryStick className="w-4 h-4 mr-2 text-purple-400" />,
    'rx-rate': <ArrowDownUp className="w-4 h-4 mr-2 text-blue-400" />,
    'tx-rate': <ArrowDownUp className="w-4 h-4 mr-2 text-green-400" />,
  };

  return (
    <>
      {/* Form akan ditampilkan sebagai modal/overlay */}
      {isFormVisible && <AlertForm initialData={editingAlert} onSave={handleSave} onClose={handleFormClose} />}

      <div className={`${cardStyle} h-full`}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center">
            <BellRing className="w-6 h-6 mr-3 text-cyan-400"/>
            Alerts & Notifications Manager
          </h1>
          <button onClick={handleAddNew} className={`${buttonStyle} bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600`}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Aturan
          </button>
        </div>

        <div className="space-y-4">
          {alerts.length > 0 ? alerts.map(alert => (
            <div key={alert.id} className="bg-slate-800/60 p-4 rounded-lg flex items-center justify-between">
              <div className="flex items-center">
                {metricIcons[alert.metric]}
                <div>
                  <p className="font-semibold text-slate-200">{alert.name}</p>
                  <p className="text-sm text-slate-400">
                    Jika {alert.metric} {' '}
                    <span className="font-mono">{alert.condition === 'greater' ? '>' : '<'}</span> {' '}
                    {alert.threshold}{alert.unit}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button onClick={() => handleEdit(alert)} className="p-2 text-slate-500 hover:text-yellow-400 transition-colors"><Edit className="w-4 h-4"/></button>
                <button onClick={() => handleDelete(alert.id)} className="p-2 text-slate-500 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
              </div>
            </div>
          )) : (
            <div className="text-center py-12 text-slate-500">
              <ShieldAlert className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Belum ada aturan notifikasi yang dibuat.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// --- Komponen Form Terpisah ---
interface AlertFormProps {
  initialData: AlertRule | null;
  onSave: (alertData: AlertRule) => void;
  onClose: () => void;
}

const AlertForm: React.FC<AlertFormProps> = ({ initialData, onSave, onClose }) => {
  const [formData, setFormData] = useState<Omit<AlertRule, 'id'>>(
    initialData ? {
      name: initialData.name,
      metric: initialData.metric,
      condition: initialData.condition,
      threshold: initialData.threshold,
      unit: initialData.unit,
      channels: initialData.channels,
    } : {
      name: '',
      metric: 'cpu',
      condition: 'greater',
      threshold: 80,
      unit: '%',
      channels: [],
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, id: initialData?.id || '' });
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <form onSubmit={handleSubmit} className={`${cardStyle} max-w-lg w-full`}>
        <h2 className="text-xl font-semibold text-white mb-6">{initialData ? 'Edit Aturan Notifikasi' : 'Buat Aturan Notifikasi Baru'}</h2>
        
        {/* Konten Form di sini */}
        <div className="space-y-4">
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-400">Nama Aturan</label>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} className={inputStyle} required />
            </div>
            <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                    <label htmlFor="metric" className="block text-sm font-medium text-slate-400">Metrik</label>
                    <select name="metric" value={formData.metric} onChange={handleInputChange} className={inputStyle}>
                        <option value="cpu">CPU Load</option>
                        <option value="memory">Memory Usage</option>
                        <option value="rx-rate">RX Rate</option>
                        <option value="tx-rate">TX Rate</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="condition" className="block text-sm font-medium text-slate-400">Kondisi</label>
                    <select name="condition" value={formData.condition} onChange={handleInputChange} className={inputStyle}>
                        <option value="greater">{'>'}</option>
                        <option value="less">{'<'}</option>
                    </select>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="threshold" className="block text-sm font-medium text-slate-400">Nilai Ambang</label>
                    <input
                        type="number"
                        name="threshold"
                        value={formData.threshold}
                        onChange={handleInputChange}
                        className={inputStyle}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="unit" className="block text-sm font-medium text-slate-400">Satuan</label>
                    <select name="unit" value={formData.unit} onChange={handleInputChange} className={inputStyle}>
                        <option value="%">%</option>
                        <option value="Kbps">Kbps</option>
                        <option value="Mbps">Mbps</option>
                    </select>
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Saluran Notifikasi</label>
                <div className="space-y-2">
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={formData.channels.includes('email')}
                            onChange={(e) => {
                                const channels = e.target.checked
                                    ? [...formData.channels, 'email' as const]
                                    : formData.channels.filter(c => c !== 'email');
                                setFormData(prev => ({ ...prev, channels }));
                            }}
                            className="mr-2 rounded bg-slate-700 border-slate-600 text-cyan-500 focus:ring-cyan-500"
                        />
                        <span className="text-slate-300">Email</span>
                    </label>
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={formData.channels.includes('telegram')}
                            onChange={(e) => {
                                const channels = e.target.checked
                                    ? [...formData.channels, 'telegram' as const]
                                    : formData.channels.filter(c => c !== 'telegram');
                                setFormData(prev => ({ ...prev, channels }));
                            }}
                            className="mr-2 rounded bg-slate-700 border-slate-600 text-cyan-500 focus:ring-cyan-500"
                        />
                        <span className="text-slate-300">Telegram</span>
                    </label>
                </div>
            </div>
        </div>

        <div className="mt-8 flex justify-end space-x-4">
          <button type="button" onClick={onClose} className={`${buttonStyle} bg-slate-700 hover:bg-slate-600`}>Batal</button>
          <button type="submit" className={`${buttonStyle} bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600`}>Simpan</button>
        </div>
      </form>
    </div>
  );
};
