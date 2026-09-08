import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';

interface LoaderProps {
  text?: string;
}

export const Loader: React.FC<LoaderProps> = ({ text = "Processing enterprise request..." }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4">
      <div className="relative">
        <Loader2 className="w-10 h-10 text-sky-600 animate-spin" />
        <Sparkles className="w-4 h-4 text-indigo-500 absolute -top-1 -right-1 animate-pulse" />
      </div>
      <p className="text-sm font-semibold text-slate-700">{text}</p>
      <span className="text-xs text-slate-400">SAP HANA & AI Core Services</span>
    </div>
  );
};
