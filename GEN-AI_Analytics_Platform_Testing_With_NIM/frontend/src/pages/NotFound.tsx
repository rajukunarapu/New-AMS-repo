import React from 'react';
import { FileQuestion } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
      <div className="p-4 bg-rose-500/10 rounded-full text-rose-400">
        <FileQuestion className="w-12 h-12" />
      </div>
      <h3 className="text-xl font-bold text-slate-100">404 - Page Not Found</h3>
      <p className="text-sm text-slate-400 max-w-md">The page or resource you requested could not be located in the platform.</p>
    </div>
  );
};
