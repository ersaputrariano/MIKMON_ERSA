import React, { useState, useEffect, useCallback } from 'react';
import { PlusCircle, Trash2, List, Loader, AlertCircle, ShieldOff } from 'lucide-react';
import { AddressListEntry } from '../types';
import { useAuth } from '../context/AuthContext';
import { useAuthFetch } from '../hooks/useAuthFetch';

// Extended interface for local use with disabled property
interface ExtendedAddressListEntry extends AddressListEntry {
  disabled?: boolean;
}

interface AddressListManagerProps {
  selectedDevice: string | null;
}


// Gaya umum yang konsisten
const cardStyle = "bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-lg p-6";
const inputStyle = "mt-1 block w-full bg-slate-700/50 border border-slate-600 rounded-lg shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm text-slate-200 px-3 py-2 transition-colors";
const buttonStyle = "inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-semibold rounded-lg shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-slate-800 disabled:opacity-50 transition-all";

// Komponen Modal Konfirmasi Hapus
interface DeleteConfirmationModalProps {
  entry: ExtendedAddressListEntry | null;
  onConfirm: (entryId: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ entry, onConfirm, onCancel, isLoading }) => {
  if (!entry) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`${cardStyle} max-w-sm w-full`}>
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-500/20"><Trash2 className="h-6 w-6 text-red-500" /></div>
          <h3 className="text-lg font-semibold text-slate-100 mt-4">Hapus Entri?</h3>
          <p className="text-sm text-slate-400 mt-2">
            Yakin ingin menghapus entri <span className="font-bold text-slate-200">{entry.address}</span> dari daftar <span className="font-bold text-slate-200">{entry.list}</span>?
          </p>
        </div>
        <div className="mt-6 flex justify-center space-x-4">
          <button onClick={onCancel} disabled={isLoading} className="px-4 py-2 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors disabled:opacity-50">Batal</button>
          <button onClick={() => onConfirm(entry['.id'])} disabled={isLoading} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center disabled:opacity-50">
            {isLoading && <Loader className="animate-spin mr-2 h-4 w-4" />} Hapus
          </button>
        </div>
      </div>
    </div>
  );
};
export const AddressListManager: React.FC<AddressListManagerProps> = ({ selectedDevice }) => {
  const [addressLists, setAddressLists] = useState<ExtendedAddressListEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [newEntry, setNewEntry] = useState({ list: '', address: '', comment: '' });
  const [entryToDelete, setEntryToDelete] = useState<ExtendedAddressListEntry | null>(null);
  const authFetch = useAuthFetch();

  const fetchAddressLists = useCallback(async () => {
    if (!selectedDevice) return;
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch(`/api/monitoring/device/${selectedDevice}/address-lists`);
      const data = await response.json();
      setAddressLists(data);
    } catch (err: unknown) {
      setError(`Gagal memuat daftar alamat: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [selectedDevice, authFetch]);

  useEffect(() => { fetchAddressLists(); }, [fetchAddressLists]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewEntry(prev => ({ ...prev, [name]: value }));
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDevice) return;
    
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const response = await authFetch(`/api/monitoring/device/${selectedDevice}/address-lists`, {
        method: 'POST',
        body: JSON.stringify(newEntry)
      });
      
      await response.json();
      setSuccessMessage('Entri berhasil ditambahkan!');
      setNewEntry({ list: '', address: '', comment: '' });
      
      // Refresh the list
      fetchAddressLists();
    } catch (err: unknown) {
      setError(`Gagal menambahkan entri: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!selectedDevice) return;
    
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const response = await authFetch(`/api/monitoring/device/${selectedDevice}/address-lists/${entryId}`, {
        method: 'DELETE'
      });
      
      await response.json();
      setSuccessMessage('Entri berhasil dihapus!');
      
      // Refresh the list
      fetchAddressLists();
    } catch (err: unknown) {
      setError(`Gagal menghapus entri: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setEntryToDelete(null);
      setLoading(false);
    }
  };


  return (
    <>
      <DeleteConfirmationModal entry={entryToDelete} onConfirm={handleDeleteEntry} onCancel={() => setEntryToDelete(null)} isLoading={loading} />
      <h1 className="text-3xl font-bold text-white mb-8 flex items-center"><List className="w-8 h-8 mr-3 text-cyan-400"/>Address List Manager</h1>
      
      {/* Notifikasi */}
      {error && <div className="bg-red-500/20 text-red-400 p-3 rounded-lg mb-6 flex items-center"><AlertCircle className="w-5 h-5 mr-2"/>{error}</div>}
      {successMessage && <div className="bg-green-500/20 text-green-400 p-3 rounded-lg mb-6">{successMessage}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Kolom Form */}
        <div className={`${cardStyle} xl:col-span-1 h-fit`}>
          <h2 className="text-xl font-semibold text-white mb-4">Tambah Entri Baru</h2>
          <form onSubmit={handleAddEntry} className="space-y-4">
            <div>
              <label htmlFor="list" className="block text-sm font-medium text-slate-400">Nama Daftar</label>
              <input type="text" id="list" name="list" value={newEntry.list} onChange={handleInputChange} className={inputStyle} required />
            </div>
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-slate-400">Alamat IP / CIDR</label>
              <input type="text" id="address" name="address" value={newEntry.address} onChange={handleInputChange} className={inputStyle} required />
            </div>
            <div>
              <label htmlFor="comment" className="block text-sm font-medium text-slate-400">Komentar (Opsional)</label>
              <input type="text" id="comment" name="comment" value={newEntry.comment} onChange={handleInputChange} className={inputStyle} />
            </div>
            <div className="pt-2">
              <button type="submit" className={`${buttonStyle} w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600`} disabled={loading}>
                <PlusCircle className="-ml-1 mr-2 h-5 w-5" /> Tambah Entri
              </button>
            </div>
          </form>
        </div>

        {/* Kolom Daftar */}
        <div className={`${cardStyle} xl:col-span-2`}>
          <h2 className="text-xl font-semibold text-white mb-4">Daftar Alamat yang Ada</h2>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center h-48"><Loader className="w-8 h-8 animate-spin text-cyan-400"/></div>
            ) : addressLists.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <ShieldOff className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Tidak ada entri daftar alamat ditemukan.</p>
              </div>
            ) : (
              <table className="min-w-full">
                <thead className="border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-slate-400">Daftar</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-slate-400">Alamat</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-slate-400">Komentar</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-slate-400">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {addressLists.map(entry => (
                    <tr key={entry['.id']} className={`border-b border-slate-800 ${entry.disabled ? 'text-slate-600 italic' : 'text-slate-200'}`}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">{entry.list}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-mono">{entry.address}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">{entry.comment}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => setEntryToDelete(entry)} className="p-1 text-slate-500 hover:text-red-500 transition-colors" disabled={loading}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
