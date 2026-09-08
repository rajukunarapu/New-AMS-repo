import React from 'react';
import logoImg from '../../assets/logo.png';
import {
  LayoutDashboard,
  MessageSquareText,
  BarChart3,
  UploadCloud,
  Cpu,
  Compass,
  Bell,
  FileText,
  Database,
  Users,
  Settings,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Executive Dashboard',
      subtitle: 'Sales & Target Metrics',
      icon: LayoutDashboard,
      badge: 'Live',
      badgeColor: 'bg-emerald-100 text-emerald-700',
    },
    {
      id: 'chat',
      label: 'AI Dashboards',
      subtitle: 'Vector Context + Visuals',
      icon: MessageSquareText,
      badge: 'Llama-3.3',
      badgeColor: 'bg-indigo-100 text-indigo-700',
    },
    {
      id: 'graph',
      label: 'Build Your KPI',
      subtitle: 'AI Natural Language Charts',
      icon: BarChart3,
      badge: 'Agent',
      badgeColor: 'bg-sky-100 text-sky-700',
    },
    {
      id: 'upload',
      label: 'Upload Dataset',
      subtitle: 'Excel & CSV Sync',
      icon: UploadCloud,
      badge: '',
      badgeColor: 'bg-emerald-100 text-emerald-700',
    },
    {
      id: 'Data_Explorer',
      label: 'Data Explorer',
      subtitle: 'Drill Down & Insights',
      icon: Compass,
      badge: 'Insight',
      badgeColor: 'bg-sky-100 text-sky-700',
    },
    {
      id: 'Alerts',
      label: 'Alerts & Notifications',
      subtitle: 'Real-time Alerts',
      icon: Bell,
      badge: '',
      badgeColor: 'bg-rose-100 text-rose-700',
    },
    {
      id: 'Reports Library',
      label: 'Reports Library',
      subtitle: 'Scheduled & On-demand',
      icon: FileText,
      badge: '',
      badgeColor: 'bg-amber-100 text-amber-700',
    },
    {
      id: 'Data_Sources',
      label: 'Data Sources',
      subtitle: 'Manage',
      icon: Database,
      badge: '→',
      badgeColor: 'bg-slate-100 text-slate-600',
    },
    {
      id: 'User Management',
      label: 'User Management',
      subtitle: 'Roles & Permissions',
      icon: Users,
      badge: '→',
      badgeColor: 'bg-slate-100 text-slate-600',
    },
    {
      id: 'settings',
      label: 'System Settings',
      subtitle: 'Configuration & Security',
      icon: Settings,
      badge: '→',
      badgeColor: 'bg-slate-100 text-slate-600',
    },
  ];

  return (
    <aside className="w-72 bg-white/95 backdrop-blur-xl border-r border-slate-200/90 flex flex-col justify-between p-4 min-h-screen shadow-xs z-30 flex-shrink-0">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center space-x-3 px-3.5 py-3 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md shadow-slate-900/10">
          <div className="p-1.5 bg-white/95 rounded-xl shadow-xs flex-shrink-0 flex items-center justify-center border border-white/20">
            <img src={logoImg} alt="Neovatic GEN-AI platform Logo" className="w-7 h-7 object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
              <span>NEOVATIC GEN-AI PLATFORM</span>
            </h1>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[10px] text-sky-300 font-semibold tracking-wide uppercase">
                SAP HANA & AI Core
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div>
          <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Enterprise Modules
          </p>
          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-btn-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full text-left flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${isActive
                    ? 'bg-sky-50 text-sky-900 border border-sky-200/90 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                    }`}
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1 pr-1">
                    <div
                      className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${isActive
                        ? 'bg-sky-500 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                        }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate">{item.label}</div>
                      <div className="text-[10px] text-slate-400 font-normal truncate">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider flex-shrink-0 ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* System Status Footer */}
      <div className="space-y-2 pt-4 border-t border-slate-100">
        <div className="p-3 bg-gradient-to-br from-slate-50 to-sky-50/40 rounded-xl border border-slate-200/80 text-[11px] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-sky-600" />
              <span className="font-semibold text-slate-700 text-xs">Platform Runtime</span>
            </div>
            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700">
              OPERATIONAL
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-500 pt-1 border-t border-slate-200/60">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>HANA Cloud</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
              <span>Python Venv</span>
            </div>
          </div>
        </div>

        <div className="text-center text-[10px] text-slate-400">
          SAP BTP MTA Architecture · v1.0.0
        </div>
      </div>
    </aside>
  );
};
