import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Settings,
  BellRing,
  List,
  Archive,
  ScrollText,
  Shield,
  BarChart2,
  FileText,
  Monitor,
  X,
  ChevronLeft,
  Bot,
  Activity,
} from 'lucide-react';

interface SidebarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isSidebarOpen, toggleSidebar }) => {
  // Fungsi untuk menentukan kelas CSS untuk NavLink, disesuaikan dengan tema baru
  const getNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center p-2 rounded-lg transition-all duration-200 group
    ${isSidebarOpen ? 'justify-start space-x-3' : 'justify-center'}
    ${
      isActive
        ? 'bg-slate-700/60 text-cyan-400 shadow-inner'
        : 'text-slate-400 hover:bg-slate-700/40 hover:text-slate-200'
    }`;

  // Data untuk navigasi agar lebih mudah dikelola
  const navSections = [
    {
      title: 'Dashboard & Monitoring',
      links: [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/realtime-dashboard', icon: Activity, label: 'Real-Time Monitor' },
        { to: '/bandwidth-monitor', icon: BarChart2, label: 'Bandwidth Monitor' },
      ],
    },
    {
      title: 'Device Management',
      links: [
        { to: '/devices', icon: Settings, label: 'Device Manager' },
      ],
    },
    {
      title: 'Security & Monitoring',
      links: [
        { to: '/alerts', icon: BellRing, label: 'Alerts Manager' },
        { to: '/telegram-settings', icon: Bot, label: 'Telegram Settings' },
        { to: '/address-list', icon: List, label: 'Address List Manager' },
        { to: '/firewall', icon: Shield, label: 'Firewall Viewer' },
        { to: '/logs', icon: ScrollText, label: 'Centralized Log Viewer' },
      ],
    },
    {
      title: 'Configuration & Management',
      links: [
        { to: '/backup', icon: Archive, label: 'Backup Manager' },
        { to: '/script-manager', icon: FileText, label: 'Script Manager' },
      ],
    },
    {
      title: 'Reporting',
      links: [
        { to: '/historical-reports', icon: BarChart2, label: 'Historical Reports' },
      ],
    },
  ];

  return (
    <>
      {/* Latar belakang gelap saat sidebar terbuka di mode mobile */}
      <div
        className={`fixed inset-0 bg-slate-900/50 z-40 lg:hidden transition-opacity duration-200 ${
          isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
        onClick={toggleSidebar}
      ></div>

      {/* Kontainer Sidebar */}
      <aside
        id="sidebar"
        className={`flex flex-col fixed z-50 top-0 h-screen overflow-y-auto no-scrollbar shrink-0 bg-slate-800/50 backdrop-blur-sm border-r border-slate-700 p-4 transition-all duration-300 ease-in-out
          ${isSidebarOpen ? 'left-0 translate-x-0 w-80' : '-left-full -translate-x-full w-80'}
          lg:static lg:left-auto lg:top-auto lg:translate-x-0
          ${isSidebarOpen ? 'lg:w-64' : 'lg:w-20'}
        }`}
      >
        {/* Header Sidebar */}
        <div className="flex items-center justify-between mb-8">
          {isSidebarOpen && (
            <NavLink end to="/" className="flex items-center space-x-2">
              <Monitor className="w-8 h-8 text-cyan-400" />
              <h1 className="text-xl font-bold text-slate-100 whitespace-nowrap">
                MikroTik Monitor
              </h1>
            </NavLink>
          )}
          {/* Tombol Toggle untuk Desktop dan Tombol Close untuk Mobile */}
          <button
            onClick={toggleSidebar}
            className="text-slate-500 hover:text-slate-200"
            aria-controls="sidebar"
            aria-expanded={isSidebarOpen}
          >
            <span className="sr-only">Toggle sidebar</span>
            <X className="w-6 h-6 fill-current lg:hidden" />
            <ChevronLeft className={`w-6 h-6 fill-current hidden lg:block transition-transform duration-300 ${isSidebarOpen ? '' : 'rotate-180'}`} />
          </button>
        </div>

        {/* Link Navigasi */}
        <nav className="flex-1">
          {navSections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="mb-6">
              {isSidebarOpen && (
                <h2 className="text-xs uppercase text-slate-500 font-semibold mb-2 px-2">
                  {section.title}
                </h2>
              )}
              <ul>
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex} className="mb-1">
                    <NavLink to={link.to} className={getNavLinkClass}>
                      <link.icon className="w-5 h-5 shrink-0" />
                      {isSidebarOpen && (
                        <span className="whitespace-nowrap">{link.label}</span>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
              {/* Tambahkan pemisah jika sidebar diciutkan */}
              {!isSidebarOpen && sectionIndex < navSections.length - 1 && (
                  <hr className="my-4 border-slate-700" />
              )}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
