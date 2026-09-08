import React, { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';

interface SQLResultProps {
  sql: string;
}

export const SQLResult: React.FC<SQLResultProps> = ({ sql }) => {
  const [copied, setCopied] = useState(false);
  const displaySql = sql && sql.trim() ? sql : '-- null / empty SQL generated';

  const handleCopy = () => {
    navigator.clipboard.writeText(displaySql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-3 shadow-lg">
      <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2 font-mono text-sky-400 font-semibold">
          <Terminal className="w-4 h-4 text-sky-400" />
          <span>SAP HANA SQL Synthesized Query</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-sky-300 bg-slate-800/80 hover:bg-slate-800 px-3 py-1 rounded-lg transition-colors border border-slate-700"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy SQL</span>
            </>
          )}
        </button>
      </div>
      <pre className="text-xs font-mono text-sky-300 overflow-x-auto p-3 bg-slate-950 rounded-xl leading-relaxed border border-slate-800/80">
        <code>{displaySql}</code>
      </pre>
    </div>
  );
};
