import React, { useState } from 'react';
import { Card } from '../Common/Card';
import { EmptyState } from '../Common/EmptyState';
import { TrendingUp } from 'lucide-react';

interface RevenueChartProps {
  data?: Array<{ month: string; revenue: number; profit: number }> | null;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const rawData = data ?? [];
  const isEmpty = rawData.length === 0;

  // Extract unique years from data month labels if available, or default
  const years = ['All', '2025', '2024', '2023'];

  // Filter data based on selected year
  const filteredData = React.useMemo(() => {
    if (selectedYear === 'All') {
      return rawData;
    }
    return rawData.filter((d) => d.month.includes(selectedYear));
  }, [rawData, selectedYear]);

  const maxVal = Math.max(...filteredData.map((d) => d.revenue ?? 0), 1);
  const totalRevenue = filteredData.reduce((acc, d) => acc + (d.revenue ?? 0), 0);
  const totalProfit = filteredData.reduce((acc, d) => acc + (d.profit ?? 0), 0);
  const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  return (
    <Card
      title="Monthly Net Revenue & Gross Profit"
      subtitle="Enterprise sales trend over time"
      action={
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              disabled={isEmpty}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                selectedYear === y
                  ? 'bg-white text-sky-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800'
              } disabled:opacity-50`}
            >
              {y}
            </button>
          ))}
        </div>
      }
    >
      {isEmpty ? (
        <EmptyState
          compact
          icon={TrendingUp}
          title="No Revenue Data Available"
          description="Monthly revenue and profit trends are currently empty or loading from the backend."
        />
      ) : (
        <>
          {/* Metric summary ribbon */}
          <div className="grid grid-cols-3 gap-3 mb-6 p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 text-xs">
            <div>
              <span className="text-slate-400 font-medium">Period Revenue</span>
              <p className="text-sm font-bold text-slate-800">
                ${(totalRevenue / 1000000).toFixed(2)}M
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Gross Profit</span>
              <p className="text-sm font-bold text-indigo-600">
                ${(totalProfit / 1000000).toFixed(2)}M
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Avg Profit Margin</span>
              <p className="text-sm font-bold text-emerald-600">
                {avgMargin.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Interactive Chart Bars */}
          <div className="overflow-x-auto pb-2">
            <div
              className="h-64 flex items-end justify-between gap-2 pt-8 pb-4 min-w-[500px]"
              style={{ minWidth: filteredData.length > 16 ? `${filteredData.length * 32}px` : '100%' }}
            >
              {filteredData.map((item, idx) => {
                const revHeight = ((item.revenue ?? 0) / maxVal) * 100;
                const profitHeight = ((item.profit ?? 0) / maxVal) * 100;
                const isHovered = hoveredIdx === idx;

                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center gap-1.5 relative group cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    {/* Floating Tooltip */}
                    {isHovered && (
                      <div className="absolute -top-14 bg-slate-900 text-white text-[11px] p-2 rounded-xl shadow-xl z-30 pointer-events-none whitespace-nowrap border border-slate-700 animate-in fade-in duration-100">
                        <div className="font-semibold text-slate-200 mb-0.5">{item.month || '—'}</div>
                        <div className="flex items-center gap-3">
                          <span className="text-sky-300 font-bold">
                            Rev: ${((item.revenue ?? 0) / 1000000).toFixed(2)}M
                          </span>
                          <span className="text-indigo-300 font-bold">
                            Profit: ${((item.profit ?? 0) / 1000000).toFixed(2)}M
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Dual Column Bars */}
                    <div className="w-full bg-slate-100/80 rounded-xl h-48 flex items-end justify-center gap-1 p-1 border border-slate-200/70 group-hover:border-sky-300 transition-all">
                      {/* Revenue Bar */}
                      <div
                        style={{ height: `${Math.max(revHeight, 4)}%` }}
                        className="w-1/2 bg-gradient-to-t from-sky-600 via-sky-500 to-sky-400 rounded-t-md group-hover:brightness-110 transition-all shadow-xs"
                      />
                      {/* Profit Bar */}
                      <div
                        style={{ height: `${Math.max(profitHeight, 4)}%` }}
                        className="w-1/2 bg-gradient-to-t from-indigo-700 via-indigo-600 to-indigo-500 rounded-t-md group-hover:brightness-110 transition-all shadow-xs"
                      />
                    </div>

                    {/* X-axis Month Label */}
                    <span
                      className={`text-[10px] font-medium transition-colors text-center truncate max-w-[60px] ${
                        isHovered ? 'text-sky-700 font-bold' : 'text-slate-500'
                      }`}
                    >
                      {item.month ? item.month.replace('202', "'2") : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend & Footnote */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex items-center space-x-6">
              <span className="flex items-center font-medium">
                <span className="w-3 h-3 rounded-md bg-gradient-to-tr from-sky-500 to-sky-400 mr-2 shadow-xs"></span>
                Net Revenue ($)
              </span>
              <span className="flex items-center font-medium">
                <span className="w-3 h-3 rounded-md bg-gradient-to-tr from-indigo-600 to-indigo-500 mr-2 shadow-xs"></span>
                Gross Margin Profit ($)
              </span>
            </div>
            <span className="text-[11px] text-slate-400 italic">Hover columns for granular figures</span>
          </div>
        </>
      )}
    </Card>
  );
};

