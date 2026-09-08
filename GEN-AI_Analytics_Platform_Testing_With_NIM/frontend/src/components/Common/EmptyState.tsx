import React from 'react';
import { Database, type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  compact?: boolean;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = "No Data Found",
  description = "No results available to display right now.",
  icon: Icon = Database,
  compact = false,
  actionText,
  onAction,
}) => {
  if (compact) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed border-slate-200/90 rounded-xl bg-slate-50/60 my-2">
        <div className="p-2.5 bg-slate-100 rounded-full text-slate-400 mb-2">
          <Icon className="w-5 h-5" />
        </div>
        <h4 className="text-xs font-bold text-slate-700">{title}</h4>
        <p className="text-[11px] text-slate-400 max-w-xs mt-0.5">{description}</p>
        {actionText && onAction && (
          <button
            onClick={onAction}
            className="mt-2.5 px-3 py-1 text-[11px] font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors"
          >
            {actionText}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-10 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/70">
      <div className="p-4 bg-sky-100/70 rounded-2xl text-sky-600 mb-3 shadow-2xs">
        <Icon className="w-8 h-8" />
      </div>
      <h4 className="text-sm sm:text-base font-bold text-slate-800">{title}</h4>
      <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-xs transition-all"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

