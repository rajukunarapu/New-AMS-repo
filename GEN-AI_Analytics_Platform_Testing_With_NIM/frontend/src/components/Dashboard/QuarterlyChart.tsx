import React, { useState } from 'react';
import { Card } from '../Common/Card';
import { EmptyState } from '../Common/EmptyState';
import { BarChart3 } from 'lucide-react';

interface QuarterlyChartProps {
  data?: Array<{ quarter: string; target: number; actual: number }> | null;
}

export const QuarterlyChart: React.FC<QuarterlyChartProps> = ({ data }) => {
  const [selectedYear, setSelectedYear] = useState<string>('2025');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const rawData = data ?? [];
  const isEmpty = rawData.length === 0;

  // Group years
  const years = ['2025', '2024', '2023', 'All'];

  const filteredData = React.useMemo(() => {
    if (selectedYear === 'All') return rawData;
    return rawData.filter((d) => d.quarter.includes(selectedYear));
  }, [rawData, selectedYear]);

  const maxVal = Math.max(
    ...filteredData.map((d) => Math.max(d.target ?? 0, d.actual ?? 0)),
    1
  );

  const totalTarget = filteredData.reduce((acc, d) => acc + (d.target ?? 0), 0);
  const totalActual = filteredData.reduce((acc, d) => acc + (d.actual ?? 0), 0);
  const overallRate = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;
  const hoveredItem = hoveredIdx !== null ? filteredData[hoveredIdx] : null;

  const formatQuarterLabel = (quarterStr: string, isAll: boolean) => {
    if (!isAll) {
      return quarterStr.includes('Q') 
        ? quarterStr.substring(quarterStr.indexOf('Q'), quarterStr.indexOf('Q') + 2) 
        : quarterStr;
    }
    // For 'All' mode: format e.g. "2023 Q1" -> "Q1 '23"
    const qMatch = quarterStr.match(/Q[1-4]/i);
    const yMatch = quarterStr.match(/20\d{2}/);
    if (qMatch && yMatch) {
      return `${qMatch[0].toUpperCase()} '${yMatch[0].slice(2)}`;
    }
    return quarterStr;
  };

  return (
    <Card
      title="Quarterly Targets vs Actual"
      subtitle="Budget plan attainment by quarter"
      action={
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {years.map((y) => (
            <button
              key={y}
              onClick={() => {
                setSelectedYear(y);
                setHoveredIdx(null);
              }}
              disabled={isEmpty}
              className={`px-2 py-0.5 text-[11px] font-semibold rounded-lg transition-all ${
                selectedYear === y
                  ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/80'
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
          icon={BarChart3}
          title="No Quarterly Data Available"
          description="Quarterly budget vs actuals are currently empty or loading from backend."
        />
      ) : (
        <div className="space-y-3 pt-1">
          {/* Interactive Stats Ribbon on Hover */}
          <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50/90 rounded-xl border border-slate-200/70 text-xs transition-colors">
            <div>
              <span className="text-slate-400 text-[10px] font-medium block">
                {hoveredItem ? `${hoveredItem.quarter} Target` : 'Period Target'}
              </span>
              <p className="text-xs font-bold text-slate-700 font-mono">
                ${(((hoveredItem ? hoveredItem.target : totalTarget) ?? 0) / 1000000).toFixed(1)}M
              </p>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] font-medium block">
                {hoveredItem ? `${hoveredItem.quarter} Actual` : 'Period Actual'}
              </span>
              <p className="text-xs font-bold text-emerald-600 font-mono">
                ${(((hoveredItem ? hoveredItem.actual : totalActual) ?? 0) / 1000000).toFixed(1)}M
              </p>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] font-medium block">
                {hoveredItem ? 'Attainment' : 'Avg Attainment'}
              </span>
              <p
                className={`text-xs font-bold font-mono ${
                  (hoveredItem
                    ? (hoveredItem.actual ?? 0) >= (hoveredItem.target ?? 0)
                    : overallRate >= 100)
                    ? 'text-emerald-600'
                    : 'text-amber-600'
                }`}
              >
                {(hoveredItem
                  ? (hoveredItem.target ?? 0) > 0
                    ? ((hoveredItem.actual ?? 0) / (hoveredItem.target ?? 1)) * 100
                    : 100
                  : overallRate
                ).toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Scrollable container for chart bars */}
          <div className="overflow-x-auto pb-1">
            <div
              className="h-48 flex items-end justify-between gap-2.5 pt-4 pb-2"
              style={{ minWidth: filteredData.length > 4 ? `${filteredData.length * 56}px` : '100%' }}
            >
              {filteredData.map((item, idx) => {
                const target = item.target ?? 0;
                const actual = item.actual ?? 0;
                const targetPct = (target / maxVal) * 100;
                const actualPct = (actual / maxVal) * 100;
                const achievementRate = target > 0 ? (actual / target) * 100 : 100;
                const isExceeded = actual >= target;
                const isHovered = hoveredIdx === idx;
                const quarterLabel = formatQuarterLabel(item.quarter || '', selectedYear === 'All');

                return (
                  <div
                    key={idx}
                    className={`flex-1 min-w-[44px] flex flex-col items-center justify-end gap-1.5 relative group cursor-pointer select-none transition-all duration-150 ${
                      isHovered ? '-translate-y-1' : ''
                    }`}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    {/* Bars Container */}
                    <div
                      className={`w-full flex items-end justify-center gap-1 h-36 bg-slate-50/80 p-1.5 rounded-xl border transition-all duration-150 ${
                        isHovered
                          ? 'border-emerald-400 bg-emerald-50/30 shadow-md ring-2 ring-emerald-400/20'
                          : 'border-slate-200/80 group-hover:border-slate-300'
                      }`}
                    >
                      {/* Target Column */}
                      <div
                        style={{ height: `${Math.max(targetPct, 4)}%` }}
                        className={`w-1/2 rounded-t-md transition-all ${
                          isHovered ? 'bg-slate-400' : 'bg-slate-300'
                        }`}
                      />
                      {/* Actual Column */}
                      <div
                        style={{ height: `${Math.max(actualPct, 4)}%` }}
                        className={`w-1/2 rounded-t-md transition-all shadow-xs ${
                          isExceeded
                            ? 'bg-gradient-to-t from-emerald-600 to-teal-500'
                            : 'bg-gradient-to-t from-amber-600 to-amber-400'
                        } ${isHovered ? 'brightness-110 shadow-emerald-500/20' : ''}`}
                      />
                    </div>

                    {/* Quarter Label & Achievement Badge */}
                    <span
                      className={`font-bold text-center whitespace-nowrap transition-colors ${
                        isHovered ? 'text-emerald-700 font-extrabold' : 'text-slate-700'
                      } ${selectedYear === 'All' ? 'text-[10px]' : 'text-[11px]'}`}
                    >
                      {quarterLabel}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap transition-all ${
                        isExceeded
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      } ${isHovered ? 'scale-105 shadow-xs' : ''}`}
                    >
                      {achievementRate.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500 font-medium">
            <div className="flex items-center space-x-4">
              <span className="flex items-center">
                <span className="w-3 h-3 rounded bg-slate-300 mr-1.5"></span> Target Budget
              </span>
              <span className="flex items-center">
                <span className="w-3 h-3 rounded bg-gradient-to-tr from-emerald-600 to-teal-500 mr-1.5 shadow-xs"></span> Actual Realized
              </span>
            </div>
            {selectedYear === 'All' && (
              <span className="text-[10px] text-slate-400 italic">↔ Scroll for all 12 quarters</span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

