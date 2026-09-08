import React, { useState } from 'react';
import { Card } from '../Common/Card';
import { EmptyState } from '../Common/EmptyState';
import { BarChart3, Table, ArrowUpDown } from 'lucide-react';

interface DynamicChartProps {
  data: Array<Record<string, any>>;
  recommendedChart?: string;
}

export const DynamicChart: React.FC<DynamicChartProps> = ({ data, recommendedChart }) => {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(false);

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="No Query Records Returned"
        description="The backend executed the query successfully, but the result set contains 0 rows (empty dataset)."
      />
    );
  }

  const firstRow = data[0] || {};
  const allKeys = Object.keys(firstRow);
  const labelKey = allKeys[0] || 'Dimension';
  const numericKeys = allKeys.filter((k) => typeof firstRow[k] === 'number');
  const valueKey = numericKeys.length > 0 ? numericKeys[0] : allKeys[1] || allKeys[0];

  const maxVal = Math.max(
    ...data.map((d) => (typeof d[valueKey] === 'number' ? Number(d[valueKey]) : 0)),
    1
  );

  const sortedData = [...data].sort((a, b) => {
    if (!sortCol) return 0;
    const valA = a[sortCol];
    const valB = b[sortCol];
    if (valA === null || valA === undefined) return sortAsc ? -1 : 1;
    if (valB === null || valB === undefined) return sortAsc ? 1 : -1;
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortAsc ? valA - valB : valB - valA;
    }
    return sortAsc
      ? String(valA).localeCompare(String(valB))
      : String(valB).localeCompare(String(valA));
  });

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(false);
    }
  };

  const renderCellValue = (val: any) => {
    if (val === null || val === undefined) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-400 border border-slate-200/60">
          null
        </span>
      );
    }
    if (val === '') {
      return <span className="text-slate-400 italic text-[11px]">(empty)</span>;
    }
    if (typeof val === 'number') {
      return <span className="font-mono text-slate-700">{val.toLocaleString()}</span>;
    }
    if (typeof val === 'boolean') {
      return <span className="font-mono text-indigo-600">{val ? 'true' : 'false'}</span>;
    }
    return <span className="text-slate-800">{String(val)}</span>;
  };

  return (
    <Card
      title={`Dynamic Query Visualizer${recommendedChart ? ` (${recommendedChart.toUpperCase()})` : ''}`}
      subtitle={`Plotting ${valueKey} by ${labelKey} (${data.length} records)`}
      action={
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setViewMode('chart')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              viewMode === 'chart'
                ? 'bg-white text-sky-700 shadow-xs border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Chart</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              viewMode === 'table'
                ? 'bg-white text-sky-700 shadow-xs border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Data Grid</span>
          </button>
        </div>
      }
    >
      {viewMode === 'chart' ? (
        <div className="space-y-3 py-2">
          {data.slice(0, 15).map((item, idx) => {
            const rawVal = item[valueKey];
            const isNullVal = rawVal === null || rawVal === undefined;
            const val = isNullVal ? 0 : Number(rawVal) || 0;
            const widthPct = (val / maxVal) * 100;
            const isDollar =
              valueKey.toLowerCase().includes('usd') ||
              valueKey.toLowerCase().includes('revenue') ||
              valueKey.toLowerCase().includes('profit') ||
              valueKey.toLowerCase().includes('margin');

            return (
              <div key={idx} className="space-y-1 group">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-800 truncate max-w-[60%] group-hover:text-sky-700 transition-colors">
                    {item[labelKey] === null || item[labelKey] === undefined
                      ? 'null'
                      : String(item[labelKey]) || '(empty)'}
                  </span>
                  <span className="text-sky-700 font-bold font-mono">
                    {isNullVal ? (
                      <span className="text-slate-400 font-normal italic">null</span>
                    ) : isDollar && val > 100000 ? (
                      `$${(val / 1000000).toFixed(2)}M`
                    ) : typeof val === 'number' ? (
                      val.toLocaleString()
                    ) : (
                      val
                    )}
                  </span>
                </div>

                <div className="w-full bg-slate-100 rounded-lg h-3 overflow-hidden border border-slate-200/70 p-0.5">
                  <div
                    style={{ width: `${isNullVal ? 0 : Math.min(100, Math.max(widthPct, 3))}%` }}
                    className={`h-full rounded-lg transition-all duration-500 group-hover:brightness-110 shadow-xs ${
                      isNullVal ? 'bg-slate-200' : 'bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600'
                    }`}
                  />
                </div>
              </div>
            );
          })}
          {data.length > 15 && (
            <p className="text-center text-xs text-slate-400 pt-2 italic">
              Showing top 15 records. Switch to Data Grid to view all {data.length} records.
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-100/90 backdrop-blur-xs border-b border-slate-200 z-10">
              <tr>
                {allKeys.map((k) => (
                  <th
                    key={k}
                    onClick={() => handleSort(k)}
                    className="py-2.5 px-3 font-bold uppercase tracking-wider text-slate-600 text-[10px] cursor-pointer hover:bg-slate-200/70 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>{k}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedData.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-sky-50/50 transition-colors">
                  {allKeys.map((k) => (
                    <td key={k} className="py-2 px-3">
                      {renderCellValue(row[k])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};

