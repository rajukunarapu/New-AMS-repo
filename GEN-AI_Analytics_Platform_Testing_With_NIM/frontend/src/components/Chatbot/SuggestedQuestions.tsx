import React from 'react';
import {
  Sparkles,
  TrendingUp,
  BarChart2,
  PieChart,
  Search,
} from 'lucide-react';

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
}

export const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({ onSelect }) => {
  const suggestions = [
    {
      text: 'Bar chart of Net Revenue by Region',
      icon: BarChart2,
      badge: 'Chart',
    },
    {
      text: 'Primary drivers of profit margins in 2024?',
      icon: Sparkles,
      badge: 'Insight',
    },
    {
      text: 'Quarterly revenue target vs actual performance',
      icon: TrendingUp,
      badge: 'Target',
    },
    {
      text: 'Pie chart of sales share by top countries',
      icon: PieChart,
      badge: 'Chart',
    },
    {
      text: 'Lookup Order SO-106760 complete breakdown',
      icon: Search,
      badge: 'Order',
    },
  ];

  return (
    <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2">
      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
        <span>Suggested Queries:</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
        {suggestions.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelect(item.text)}
              className="text-left flex items-center justify-between p-2 rounded-lg bg-white hover:bg-indigo-50/40 hover:border-indigo-200 border border-slate-200 text-xs text-slate-700 transition-all group"
            >
              <div className="flex items-center gap-1.5 min-w-0 pr-1">
                <Icon className="w-3 h-3 text-indigo-600 flex-shrink-0" />
                <span className="truncate group-hover:text-indigo-950 font-medium text-[11px]">
                  {item.text}
                </span>
              </div>
              <span className="text-[9px] font-semibold uppercase px-1 py-0.2 rounded bg-slate-100 group-hover:bg-indigo-100 group-hover:text-indigo-700 text-slate-500 flex-shrink-0">
                {item.badge}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
