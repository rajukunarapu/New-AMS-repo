import React, { useState } from 'react';
import {
  Bell,
  Search,
  Database,
  Cpu,
  ShieldCheck,
} from 'lucide-react';

interface NavbarProps {
  onRefresh?: () => void;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ setActiveTab }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationOpen, setNotificationOpen] = useState(false);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim() && setActiveTab) {
      const q = searchQuery.toLowerCase();
      if (q.includes('graph') || q.includes('chart') || q.includes('plot')) {
        setActiveTab('graph');
      } else if (q.includes('chat') || q.includes('rag') || q.includes('ask')) {
        setActiveTab('chat');
      } else if (q.includes('upload') || q.includes('file') || q.includes('dataset') || q.includes('ingest')) {
        setActiveTab('upload');
      } else if (q.includes('explore') || q.includes('sql') || q.includes('analytics')) {
        setActiveTab('Data_Explorer');
      } else {
        setActiveTab('dashboard');
      }
    }
  };

  return (
    <header className="h-16 bg-white/85 backdrop-blur-md border-b border-slate-200/90 px-6 flex items-center justify-between sticky top-0 z-40 shadow-xs">
      {/* Search & Quick Navigator */}
      <div className="flex items-center space-x-3 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Quick jump (e.g., 'Custom Graphs', 'RAG Chat')..."
            className="w-full pl-9 pr-12 py-2 text-xs bg-slate-100/70 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:bg-white transition-all"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-slate-200 text-[10px] font-mono text-slate-500">
            ↵
          </span>
        </div>
      </div>

      {/* System Status Indicators & Actions */}
      <div className="flex items-center space-x-3 ml-4">
        {/* HANA Vector Engine pill */}
        <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <Database className="w-3.5 h-3.5 text-sky-600" />
          <span className="text-slate-700 font-medium text-[11px]">HANA Vector Engine</span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-mono text-[9px] font-bold">
            ACTIVE
          </span>
        </div>

        {/* SAP AI Core pill */}
        <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <Cpu className="w-3.5 h-3.5 text-indigo-600" />
          <span className="text-slate-700 font-medium text-[11px]">SAP AI Core</span>
          <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 font-mono text-[9px] font-bold">
            GPT-4o
          </span>
        </div>

        {/* Notifications toggle */}
        <div className="relative">
          <button
            onClick={() => setNotificationOpen(!notificationOpen)}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 relative transition-colors"
            title="System alerts"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-sky-500 ring-2 ring-white"></span>
          </button>

          {notificationOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800">System Activity</span>
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> All Services Healthy
                </span>
              </div>
              <div className="mt-3 space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-100 text-sky-900">
                  <p className="font-semibold text-[11px]">Excel Dataset Synchronized</p>
                  <p className="text-[10px] text-sky-700 mt-0.5">3,000+ records cached in in-memory dataframe.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-700">
                  <p className="font-semibold text-[11px]">Python Agent Environment</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Matplotlib / Seaborn visualization pipeline ready.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="flex items-center space-x-3 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
            AD
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-slate-800 leading-none">Analytics Director</p>
            <p className="text-[10px] text-slate-400 mt-1">Enterprise Admin</p>
          </div>
        </div>
      </div>
    </header>
  );
};
