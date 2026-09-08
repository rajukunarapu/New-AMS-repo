import React, { useState } from 'react';
import { Card } from '../Common/Card';
import { EmptyState } from '../Common/EmptyState';
import { MapPin } from 'lucide-react';

interface CountryChartProps {
  data?: Array<{ country: string; revenue: number }> | null;
}

export const CountryChart: React.FC<CountryChartProps> = ({ data }) => {
  const [showCount, setShowCount] = useState<number>(5);

  const rawData = data ?? [];
  const isEmpty = rawData.length === 0;
  const maxVal = Math.max(...rawData.map((d) => d.revenue ?? 0), 1);
  const displayedData = rawData.slice(0, showCount);

  return (
    <Card
      title="Top Revenue by Country"
      subtitle="Leading geographic sales markets"
      action={
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {[5, 10].map((count) => (
            <button
              key={count}
              onClick={() => setShowCount(count)}
              disabled={isEmpty}
              className={`px-2 py-0.5 text-[11px] font-semibold rounded-lg transition-all ${
                showCount === count
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800'
              } disabled:opacity-50`}
            >
              Top {count}
            </button>
          ))}
        </div>
      }
    >
      {isEmpty ? (
        <EmptyState
          compact
          icon={MapPin}
          title="No Country Data Available"
          description="Country breakdown is currently empty or loading from backend."
        />
      ) : (
        <div className="space-y-3 py-1">
          {displayedData.map((item, idx) => {
            const rev = item.revenue ?? 0;
            const widthPct = (rev / maxVal) * 100;
            return (
              <div key={idx} className="space-y-1 group">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center space-x-2 truncate">
                    <span
                      className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center flex-shrink-0 ${
                        idx === 0
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : idx === 1
                          ? 'bg-slate-200 text-slate-700'
                          : idx === 2
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                      {item.country || '—'}
                    </span>
                  </div>
                  <span className="text-indigo-600 font-bold ml-2 flex-shrink-0">
                    ${(rev / 1000000).toFixed(1)}M
                  </span>
                </div>

                {/* Bar */}
                <div className="w-full bg-slate-100 rounded-lg h-2.5 overflow-hidden border border-slate-200/70 p-0.5">
                  <div
                    style={{ width: `${Math.min(100, Math.max(widthPct, 4))}%` }}
                    className="h-full bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 rounded-lg transition-all duration-500 group-hover:brightness-110 shadow-xs"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

