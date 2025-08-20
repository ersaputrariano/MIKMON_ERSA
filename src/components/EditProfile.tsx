import React, { useState, useRef, useEffect } from 'react';
import { User, Lock, Image as ImageIcon, Save, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const EditProfile: React.FC = () => {
  const { user, updateUser, changePassword, uploadProfilePicture } = useAuth();
  
  // State for user details
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');

  // State for password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // State for profile picture
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for feedback
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Update local state when user data changes
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setUsername(user.username || '');
      setPreview(user.profilePictureUrl || null);
    }
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file.');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB.');
        return;
      }

      setProfilePicture(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.onerror = () => {
        setError('Failed to read the selected file.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!username.trim()) {
      setError('Username harus diisi.');
      return;
    }
    
    if (username.length < 3) {
      setError('Username harus minimal 3 karakter.');
      return;
    }
    
    setError(null);
    setSuccess(null);
    
    try {
      // First, upload the picture if a new one is selected
      if (profilePicture) {
        await uploadProfilePicture(profilePicture);
        setProfilePicture(null); // Clear the selected file after upload
      }
      // Then, update the user details
      await updateUser({ name: name.trim(), username: username.trim() });
      setSuccess('Profil berhasil diperbarui.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || 'Gagal memperbarui profil.');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate password fields
    if (!currentPassword.trim()) {
      setError('Kata sandi saat ini harus diisi.');
      return;
    }
    
    if (!newPassword.trim()) {
      setError('Kata sandi baru harus diisi.');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Kata sandi baru harus minimal 6 karakter.');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Kata sandi baru tidak cocok.');
      return;
    }
    
    if (currentPassword === newPassword) {
      setError('Kata sandi baru harus berbeda dari kata sandi saat ini.');
      return;
    }
    
    setError(null);
    setSuccess(null);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess('Kata sandi berhasil diubah.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || 'Gagal mengubah kata sandi.');
    }
  };

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-100 mb-6">Edit Profil</h1>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg relative mb-6 flex items-center" role="alert">
            <AlertCircle className="mr-2 flex-shrink-0" size={20} />
            <div>
              <strong className="font-bold mr-2">Error!</strong>
              <span className="block sm:inline">{error}</span>
            </div>
          </div>
        )}
        {success && (
          <div className="bg-green-500/20 border border-green-500 text-green-300 px-4 py-3 rounded-lg relative mb-6" role="alert">
            <strong className="font-bold mr-2">Sukses!</strong>
            <span className="block sm:inline">{success}</span>
          </div>
        )}

        {/* Profile Details Form */}
        <form onSubmit={handleProfileUpdate} className="bg-slate-800/50 p-6 rounded-lg shadow-lg mb-8">
          <h2 className="text-xl font-semibold text-slate-200 mb-4 flex items-center"><User className="mr-2"/> Informasi Pengguna</h2>
          <div className="flex flex-col md:flex-row items-center gap-6 mb-4">
            <div className="relative">
              <img src={preview || `https://ui-avatars.com/api/?name=${name || username}&background=0f172a&color=06b6d4`} alt="Profile Preview" className="w-32 h-32 rounded-full object-cover" />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 bg-cyan-500 hover:bg-cyan-600 text-white p-2 rounded-full">
                <ImageIcon size={16}/>
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            </div>
            <div className="flex-grow w-full">
              <div className="mb-4">
                <label htmlFor="name" className="block text-slate-400 text-sm font-bold mb-2">Nama Lengkap</label>
                <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
              </div>
              <div>
                <label htmlFor="username" className="block text-slate-400 text-sm font-bold mb-2">Username</label>
                <input type="text" id="username" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
              </div>
            </div>
          </div>
          <div className="text-right">
            <button type="submit" className="inline-flex items-center justify-center px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-md shadow-sm">
              <Save className="mr-2" size={18}/> Simpan Perubahan Profil
            </button>
          </div>
        </form>

        {/* Password Change Form */}
        <form onSubmit={handlePasswordChange} className="bg-slate-800/50 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold text-slate-200 mb-4 flex items-center"><Lock className="mr-2"/> Ubah Kata Sandi</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="currentPassword" className="block text-slate-400 text-sm font-bold mb-2">Kata Sandi Saat Ini</label>
              <input type="password" id="currentPassword" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
            <div>
              <label htmlFor="newPassword" className="block text-slate-400 text-sm font-bold mb-2">Kata Sandi Baru</label>
              <input type="password" id="newPassword" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-slate-400 text-sm font-bold mb-2">Konfirmasi Kata Sandi Baru</label>
              <input type="password" id="confirmPassword" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
          </div>
          <div className="text-right mt-6">
            <button type="submit" className="inline-flex items-center justify-center px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-md shadow-sm">
              <Save className="mr-2" size={18}/> Ubah Kata Sandi
            </button>
          </div>
        </form>
      </div>
    </main>
  );
};

export default EditProfile;
