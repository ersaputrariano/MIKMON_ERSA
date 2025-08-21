import React, { useState } from 'react';
import { Shield, FileText, Search, Loader, ShieldOff, Plus, Edit, Trash2, X } from 'lucide-react';
import { useAuthFetch } from '../hooks/useAuthFetch';
import { MonitoringData } from '../types';

// --- Tipe Data (Asumsi dari ../types) ---
interface FirewallRule {
  '.id': string;
  chain: 'input' | 'forward' | 'output';
  action: 'accept' | 'drop' | 'reject' | 'log';
  protocol?: string;
  'src-address'?: string;
  'dst-port'?: string;
  comment?: string;
  disabled: boolean;
}

interface FirewallViewerProps {
  selectedDevice: string | null;
  selectedMonitoringData: MonitoringData | { error: string; } | null;
  onDataChange: () => void;
}

// --- Gaya Umum ---
const cardStyle = "bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-lg p-6";
const inputStyle = "mt-1 block w-full bg-slate-700/50 border border-slate-600 rounded-lg shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm text-slate-200 px-3 py-2 transition-colors";
const buttonStyle = "inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-semibold rounded-lg shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-slate-800 disabled:opacity-50 transition-all";

const DeleteConfirmationModal = ({ rule, onConfirm, onCancel, isLoading }: { rule: FirewallRule | null; onConfirm: (ruleId: string) => void; onCancel: () => void; isLoading: boolean }) => {
  if (!rule) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`${cardStyle} max-w-sm w-full`}>
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-500/20">
            <Trash2 className="h-6 w-6 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-100 mt-4">Hapus Aturan Firewall?</h3>
          <p className="text-sm text-slate-400 mt-2">
            Yakin ingin menghapus aturan ini? Tindakan ini tidak dapat dibatalkan.
          </p>
        </div>
        <div className="mt-6 flex justify-center space-x-4">
          <button onClick={onCancel} disabled={isLoading} className="px-4 py-2 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors disabled:opacity-50">Batal</button>
          <button onClick={() => onConfirm(rule['.id'])} disabled={isLoading} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center disabled:opacity-50">
            {isLoading && <Loader className="animate-spin mr-2 h-4 w-4" />} Hapus
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Komponen Form & Modal ---
interface FirewallRuleFormProps {
  initialData: FirewallRule | null;
  onSave: (ruleData: Omit<FirewallRule, '.id'>) => void;
  onClose: () => void;
  isLoading: boolean;
}

const FirewallRuleForm: React.FC<FirewallRuleFormProps> = ({ initialData, onSave, onClose, isLoading }) => {
    const [rule, setRule] = useState<Omit<FirewallRule, '.id'>>(initialData || {
        chain: 'input', action: 'accept', disabled: false, protocol: 'tcp', 'src-address': '', 'dst-port': '', comment: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        setRule(prev => ({ ...prev, [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(rule);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <form onSubmit={handleSubmit} className={`${cardStyle} max-w-lg w-full`}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-white">{initialData ? 'Edit Aturan Firewall' : 'Tambah Aturan Firewall'}</h2>
                    <button type="button" onClick={onClose} className="text-slate-500 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="chain" className="block text-sm font-medium text-slate-400">Chain</label>
                            <select name="chain" value={rule.chain} onChange={handleChange} className={inputStyle}>
                                <option value="input">input</option>
                                <option value="forward">forward</option>
                                <option value="output">output</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="action" className="block text-sm font-medium text-slate-400">Action</label>
                            <select name="action" value={rule.action} onChange={handleChange} className={inputStyle}>
                                <option value="accept">accept</option>
                                <option value="drop">drop</option>
                                <option value="reject">reject</option>
                                <option value="log">log</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="protocol" className="block text-sm font-medium text-slate-400">Protocol</label>
                        <select name="protocol" value={rule.protocol} onChange={handleChange} className={inputStyle}>
                            <option value="tcp">tcp</option>
                            <option value="udp">udp</option>
                            <option value="icmp">icmp</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="src-address" className="block text-sm font-medium text-slate-400">Source Address</label>
                        <input type="text" name="src-address" value={rule['src-address']} onChange={handleChange} className={inputStyle} placeholder="e.g., 192.168.1.0/24" />
                    </div>
                     <div>
                        <label htmlFor="dst-port" className="block text-sm font-medium text-slate-400">Destination Port</label>
                        <input type="text" name="dst-port" value={rule['dst-port']} onChange={handleChange} className={inputStyle} placeholder="e.g., 80, 443" />
                    </div>
                    <div>
                        <label htmlFor="comment" className="block text-sm font-medium text-slate-400">Comment</label>
                        <input type="text" name="comment" value={rule.comment} onChange={handleChange} className={inputStyle} />
                    </div>
                </div>
                <div className="mt-8 flex justify-end space-x-4">
                    <button type="button" onClick={onClose} className={`${buttonStyle} bg-slate-700 hover:bg-slate-600`}>Batal</button>
                    <button type="submit" disabled={isLoading} className={`${buttonStyle} bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600`}>
                        {isLoading ? <Loader className="animate-spin w-5 h-5" /> : 'Simpan'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export const FirewallViewer: React.FC<FirewallViewerProps> = ({ selectedDevice, selectedMonitoringData, onDataChange }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<FirewallRule | null>(null);
  const [ruleToDelete, setRuleToDelete] = useState<FirewallRule | null>(null);
  const authFetch = useAuthFetch();

  // Type guard to check if data is valid MonitoringData
  const isDataValid = (data: MonitoringData | { error: string } | null): data is MonitoringData => {
    return data != null && !('error' in data);
  };

  // Get firewall rules from monitoring data
  const firewallRules = isDataValid(selectedMonitoringData) && Array.isArray(selectedMonitoringData.security?.firewallRules)
    ? selectedMonitoringData.security.firewallRules
    : [];

  // Remove the useEffect that was calling fetchFirewallRules since we're now using props data

  // Removed useEffect that was calling fetchFirewallRules since we're now using props data
  // The component will automatically update when selectedMonitoringData changes

  const handleAddNew = () => {
    setError(null);
    setEditingRule(null);
    setIsFormVisible(true);
  };
  const handleEdit = (rule: FirewallRule) => {
    setError(null);
    setEditingRule(rule);
    setIsFormVisible(true);
  };
  
  const handleSave = async (ruleData: Omit<FirewallRule, '.id'>) => {
    if (!selectedDevice) return;
    setLoading(true);
    setError(null);
    const isEditing = !!editingRule;
    const url = isEditing
      ? `/api/monitoring/device/${selectedDevice}/firewall/filter/${editingRule['.id']}`
      : `/api/monitoring/device/${selectedDevice}/firewall/filter`;
    const method = isEditing ? 'PUT' : 'POST';

    try {
      await authFetch(url, {
        method,
        body: JSON.stringify(ruleData),
      });
      setIsFormVisible(false);
      onDataChange(); // Memberi tahu induk untuk memuat ulang data
    } catch (err) {
      setError(`Gagal menyimpan aturan: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (!selectedDevice) return;
    setLoading(true);
    setError(null);
    try {
      await authFetch(`/api/monitoring/device/${selectedDevice}/firewall/filter/${ruleId}`, {
        method: 'DELETE',
      });
      setRuleToDelete(null); // Tutup modal setelah berhasil
      onDataChange(); // Memberi tahu induk untuk memuat ulang data
    } catch (err) {
      setError(`Gagal menghapus aturan: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredRules = firewallRules.filter((rule: FirewallRule) =>
    Object.values(rule).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  const getActionColor = (action: string) => {
    switch(action) {
      case 'accept': return 'bg-green-500/20 text-green-400';
      case 'drop': return 'bg-red-500/20 text-red-400';
      case 'reject': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-slate-600 text-slate-300';
    }
  };

  return (
    <>
      <DeleteConfirmationModal rule={ruleToDelete} onConfirm={handleDelete} onCancel={() => setRuleToDelete(null)} isLoading={loading} />
      {isFormVisible && <FirewallRuleForm initialData={editingRule} onSave={handleSave} onClose={() => setIsFormVisible(false)} isLoading={loading} />}
      <div className="space-y-8">
        <h1 className="text-3xl font-bold text-white flex items-center"><Shield className="w-8 h-8 mr-3 text-cyan-400"/>Firewall & Logs</h1>
        
        {/* Error Message Display */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-200 flex justify-between items-start">
            <div>
              <p className="font-medium">Error:</p>
              <p>{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-300 hover:text-white transition-colors"
              aria-label="Dismiss error"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        
        <div className={cardStyle}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">Aturan Filter Firewall</h2>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="text" placeholder="Cari aturan..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-slate-700/50 border border-slate-600 rounded-lg pl-9 pr-3 py-1.5 text-sm w-64 focus:ring-cyan-500 focus:border-cyan-500"/>
              </div>
              <button onClick={handleAddNew} className={`${buttonStyle} bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600`}>
                <Plus className="w-4 h-4 mr-2" /> Tambah Aturan
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            {loading ? <div className="flex justify-center items-center h-48"><Loader className="w-8 h-8 animate-spin text-cyan-400"/></div> : !isDataValid(selectedMonitoringData) ? (
              <div className="flex justify-center items-center h-48 text-slate-500 text-center px-4">
                <p>
                  {selectedMonitoringData?.error
                    ? `Gagal memuat data: ${selectedMonitoringData.error}`
                    : 'Data monitoring tidak tersedia. Pastikan perangkat telah dipilih dan terhubung.'}
                </p>
              </div>
            ) : filteredRules.length > 0 ? (
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="px-4 py-3">Chain</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Rule</th>
                    <th className="px-4 py-3">Comment</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRules.map((rule: FirewallRule) => (
                    <tr key={rule['.id']} className={`border-b border-slate-800 ${rule.disabled ? 'text-slate-600 italic' : 'text-slate-200'}`}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">{rule.chain}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getActionColor(rule.action)}`}>{rule.action}</span></td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-mono">{rule.protocol} {rule['src-address']} {rule['dst-port']}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">{rule.comment}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleEdit(rule)} className="p-1 text-slate-500 hover:text-yellow-400 transition-colors"><Edit className="w-4 h-4"/></button>
                        <button onClick={() => setRuleToDelete(rule)} className="p-1 text-slate-500 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12 text-slate-500"><ShieldOff className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>Tidak ada aturan firewall yang cocok.</p></div>
            )}
          </div>
        </div>
        {/* Log Viewer Card */}
        <div className={cardStyle}>
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-cyan-400" /> Log Firewall
          </h2>
          <div className="text-center py-8 text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Fitur log akan segera tersedia.</p>
          </div>
        </div>
      </div>
    </>
  );
};
