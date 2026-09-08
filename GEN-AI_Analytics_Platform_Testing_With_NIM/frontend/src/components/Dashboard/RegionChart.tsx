import React from 'react';
import { Card } from '../Common/Card';
import { EmptyState } from '../Common/EmptyState';
import { Globe } from 'lucide-react';

interface RegionChartProps {
  data?: Array<{ region: string; revenue: number; share: number }> | null;
}

export const RegionChart: React.FC<RegionChartProps> = ({ data }) => {
  const gradientColors = [
    'from-sky-500 to-blue-600',
    'from-indigo-500 to-purple-600',
    'from-violet-500 to-pink-600',
    'from-emerald-500 to-teal-600',
  ];

  const rawData = data ?? [];
  const isEmpty = rawData.length === 0;
  const totalRev = rawData.reduce((acc, d) => acc + (d.revenue ?? 0), 0);

  return (
    <Card
      title="Regional Market Share"
      subtitle="Global revenue contribution"
      action={
        <div className="p-1.5 bg-sky-50 text-sky-600 rounded-lg">
          <Globe className="w-4 h-4" />
        </div>
      }
    >
      {isEmpty ? (
        <EmptyState
          compact
          icon={Globe}
          title="No Regional Data Available"
          description="Regional sales share records are currently empty or loading from backend."
        />
      ) : (
        <div className="space-y-4 py-2">
          {rawData.map((item, idx) => {
            const gradient = gradientColors[idx % gradientColors.length];
            const rev = item.revenue ?? 0;
            const calculatedShare = item.share || (totalRev > 0 ? (rev / totalRev) * 100 : 0);

            return (
              <div key={idx} className="space-y-1.5 group">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-md bg-slate-100 font-bold text-[10px] text-slate-600 flex items-center justify-center border border-slate-200">
                      #{idx + 1}
                    </span>
                    <span className="font-semibold text-slate-800 group-hover:text-sky-600 transition-colors">
                      {item.region || '—'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900">
                      ${(rev / 1000000).toFixed(1)}M
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      {calculatedShare.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-200/80">
                  <div
                    style={{ width: `${Math.min(100, Math.max(calculatedShare, 3))}%` }}
                    className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-500 group-hover:brightness-110 shadow-xs`}
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

