import React, { useState, useEffect, useRef } from 'react';
import { Menu, LogOut, Edit3, ChevronDown, Sun, Moon, Cloud } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Impor asli diaktifkan kembali

interface HeaderProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
}

// Fungsi helper untuk mendapatkan sapaan dan ikon berdasarkan waktu
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 11) return { text: 'Selamat Pagi', icon: <Sun className="w-4 h-4 mr-2 text-yellow-400" /> };
  if (hour < 15) return { text: 'Selamat Siang', icon: <Cloud className="w-4 h-4 mr-2 text-sky-400" /> };
  if (hour < 19) return { text: 'Selamat Sore', icon: <Sun className="w-4 h-4 mr-2 text-orange-400" /> };
  return { text: 'Selamat Malam', icon: <Moon className="w-4 h-4 mr-2 text-indigo-400" /> };
};

export const Header: React.FC<HeaderProps> = ({ toggleSidebar, isSidebarOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Efek untuk memperbarui jam setiap detik
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Efek untuk menutup dropdown saat klik di luar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setIsProfileOpen(false);
    logout();
  };

  const handleEditProfile = () => {
    setIsProfileOpen(false);
    navigate('/edit-profile');
  };

  const { text: greetingText, icon: greetingIcon } = getGreeting();

  return (
    // Latar belakang lebih gelap dengan efek blur yang lebih kuat
    <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-lg border-b border-slate-700/50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 -mb-px">
          
          {/* Tombol Toggle Sidebar */}
          <div className="flex">
            <button 
              onClick={toggleSidebar} 
              className="text-slate-400 hover:text-white transition-colors duration-200 lg:hidden"
              aria-controls="sidebar"
              aria-expanded={isSidebarOpen}
            >
              <span className="sr-only">Buka sidebar</span>
              <Menu className="w-6 h-6" />
            </button>
          </div>

          {/* Menu Header */}
          <div className="flex items-center space-x-4 md:space-x-6">
            
            {/* Sapaan dinamis dan jam */}
            <div className="hidden md:flex items-center text-sm font-medium text-slate-300 text-right">
              <div className="flex items-center">
                {greetingIcon}
                <span>{greetingText}, {user?.name || user?.username}!</span>
              </div>
              <div className="w-px h-6 bg-slate-700 mx-4" />
              <div>
                <div>{currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
                <div className="text-xs text-slate-500 tracking-widest">{currentTime.toLocaleTimeString('id-ID')}</div>
              </div>
            </div>
            
            <div className="w-px h-6 bg-slate-700 hidden md:block" />

            {/* Menu Profil */}
            <div className="relative inline-flex" ref={profileMenuRef}>
              <button
                className="inline-flex justify-center items-center group p-1 rounded-full hover:bg-slate-800 transition-colors duration-200"
                aria-haspopup="true"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                aria-expanded={isProfileOpen}
              >
                <div className="flex items-center truncate">
                  <img 
                    src={user?.profilePictureUrl || `https://ui-avatars.com/api/?name=${user?.name || user?.username}&background=1e293b&color=94a3b8&bold=true`} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full object-cover" 
                  />
                  <span className="hidden sm:inline truncate ml-3 text-sm font-medium text-slate-300 group-hover:text-white transition-colors duration-200">
                    {user?.name || user?.username || 'User'}
                  </span>
                  <ChevronDown className={`w-5 h-5 shrink-0 ml-1 text-slate-400 group-hover:text-white transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {/* Dropdown muncul dengan efek fade dan scale */}
              <div 
                className={`origin-top-right z-10 absolute top-full right-0 min-w-[200px] bg-slate-800/90 backdrop-blur-md border border-slate-700 rounded-lg shadow-2xl overflow-hidden mt-2 transition-all duration-300 ease-in-out ${isProfileOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
              >
                <div className="pt-2 pb-2 px-4 mb-2 border-b border-slate-700">
                  <div className="font-semibold text-slate-200">{user?.name || user?.username || 'User'}</div>
                  <div className="text-xs text-cyan-400">Administrator</div>
                </div>
                <ul>
                  <li>
                    <button
                      onClick={handleEditProfile}
                      className="font-medium text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 flex items-center py-2 px-4 w-full text-left transition-colors duration-200"
                    >
                      <Edit3 className="w-4 h-4 mr-3 text-slate-400"/>
                      Edit Profil
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={handleLogout}
                      className="font-medium text-sm text-red-500 hover:text-red-400 hover:bg-slate-700/50 flex items-center py-2 px-4 w-full text-left transition-colors duration-200"
                    >
                      <LogOut className="w-4 h-4 mr-3"/>
                      Keluar
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
