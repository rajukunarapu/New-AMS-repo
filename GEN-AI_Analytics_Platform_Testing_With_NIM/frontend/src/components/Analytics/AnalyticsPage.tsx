import React, { useState } from 'react';
import { Search, Play, Database, Loader2 } from 'lucide-react';
import { queryAnalytics } from '../../services/analytics';
import type { AnalyticsResponse } from '../../services/analytics';
import { SQLResult } from './SQLResult';
import { DynamicChart } from './DynamicChart';
import { Insights } from './Insights';

const SAMPLE_QUERIES = [
  'Compare NetRevenueUSD and GrossMarginUSD across Categories',
  'Total NetRevenueUSD by Region and DistributionChannel',
  'Average GrossMarginPercent and Quantity by Country',
  'Top 5 Products with highest DiscountPercent and NetRevenueUSD',
];

export const AnalyticsPageComponent: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const executeQuery = async (queryText?: string) => {
    const finalQuery = (queryText ?? query).trim();
    if (!finalQuery) return;

    setLoading(true);
    setError(null);
    if (queryText) setQuery(queryText);

    try {
      const res = await queryAnalytics(finalQuery);
      setResult(res);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ??
          err?.message ??
          'Failed to execute text-to-SQL query. Please try another phrasing.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeQuery();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-6 bg-gradient-to-r from-white via-sky-50/40 to-blue-50/30 border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-gradient-to-tr from-sky-600 to-blue-600 rounded-2xl shadow-md shadow-sky-600/20 text-white flex-shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700 uppercase tracking-wider">
                  Text-to-SQL Engine
                </span>
                <span className="text-[11px] text-slate-400">SAP HANA SQL Generator</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
                Custom Text-to-SQL Analytics
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Query any dimension or metric across all 39 columns using natural language. The engine converts your prompt to executable SQL.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Query Input Box */}
      <div className="glass-panel p-5 border border-slate-200 bg-white space-y-4">
        <form onSubmit={handleFormSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Compare NetRevenueUSD and GrossMarginUSD across Categories..."
              disabled={loading}
              className="w-full pl-10 pr-4 py-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:bg-white transition-all shadow-2xs"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-6 py-3 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2 shadow-md shadow-sky-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running SQL…</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Run Query</span>
              </>
            )}
          </button>
        </form>

        {/* Sample query pills */}
        <div className="pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Sample Analytical Queries
          </span>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_QUERIES.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => executeQuery(sample)}
                disabled={loading}
                className="text-xs font-medium bg-slate-50 text-slate-700 hover:text-sky-700 hover:bg-sky-50 border border-slate-200 px-3 py-1.5 rounded-xl transition-all text-left"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs sm:text-sm">
          {error}
        </div>
      )}

      {/* Results View */}
      {result && (
        <div className="space-y-6">
          <SQLResult sql={result.generated_sql} />
          <DynamicChart
            data={result.results}
            recommendedChart={result.recommended_chart}
          />
          {result.summary_insights && <Insights insights={result.summary_insights} />}
        </div>
      )}
    </div>
  );
};
