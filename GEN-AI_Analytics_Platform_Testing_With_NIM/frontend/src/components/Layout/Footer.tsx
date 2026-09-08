import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="py-4 px-6 border-t border-slate-200 bg-white/50 text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
      <p>© 2026 GEN-AI Analytics Platform. Powered by SAP HANA Cloud & SAP AI Core.</p>
      <div className="flex space-x-4 text-slate-500">
        <span className="hover:text-sky-600 cursor-pointer transition-colors">Documentation</span>
        <span className="hover:text-sky-600 cursor-pointer transition-colors">API Reference</span>
        <span className="hover:text-sky-600 cursor-pointer transition-colors">BTP Cloud Foundry</span>
      </div>
    </footer>
  );
};
