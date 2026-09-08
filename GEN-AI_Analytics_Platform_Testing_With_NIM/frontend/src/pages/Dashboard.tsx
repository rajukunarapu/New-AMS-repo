import React, { useEffect, useState } from 'react';
import { KPICards } from '../components/Dashboard/KPICards';
import { RevenueChart } from '../components/Dashboard/RevenueChart';
import { RegionChart } from '../components/Dashboard/RegionChart';
import { CountryChart } from '../components/Dashboard/CountryChart';
import { CategoryChart } from '../components/Dashboard/CategoryChart';
import { QuarterlyChart } from '../components/Dashboard/QuarterlyChart';
import { TopProductsChart } from '../components/Dashboard/TopProductsChart';
import { Loader } from '../components/Common/Loader';
import { EmptyState } from '../components/Common/EmptyState';
import { fetchDashboardData, type DashboardData } from '../services/dashboard';
import {
  BarChart3,
  MessageSquareText,
  RefreshCw,
  UploadCloud,
  Database,
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate?: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadData = () => {
    setIsRefreshing(true);
    setFetchError(null);

    fetchDashboardData()
      .then((res) => {
        if (res && res.kpis && res.kpis.length > 0) {
          setData(res);
        } else {
          // Backend returned empty or null data structure
          setData(null);
        }
      })
      .catch((err) => {
        console.warn('Backend API connection warning, no data received:', err);
        setFetchError('Unable to connect to backend service. Showing empty state.');
        setData(null);
      })
      .finally(() => {
        setLoading(false);
        setIsRefreshing(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading && !data) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader text="Fetching live enterprise data from backend..." />
      </div>
    );
  }

  const isDataEmpty = !data || (!data.kpis?.length && !data.revenue_trend?.length);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-4 sm:p-5 bg-gradient-to-r from-white via-sky-50/40 to-indigo-50/30 border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-100 text-sky-700 uppercase tracking-wider">
                Enterprise Intelligence
              </span>
              <span className="text-[11px] text-slate-400">
                {isDataEmpty ? 'Status: No Live Dataset Connected' : 'Fiscal Year 2023 - 2025'}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 mt-0.5">
              Executive Sales & Analytics Dashboard
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
              Real-time enterprise metrics & machine-learning projections.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
            <button
              onClick={loadData}
              disabled={isRefreshing}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-all disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync'}</span>
            </button>

            {onNavigate && (
              <>
                <button
                  onClick={() => onNavigate('upload')}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-all"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-slate-600" />
                  <span>Upload Data</span>
                </button>
                <button
                  onClick={() => onNavigate('graph')}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 rounded-lg shadow-2xs transition-all"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Custom Graph</span>
                </button>
                <button
                  onClick={() => onNavigate('chat')}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-lg shadow-2xs transition-all"
                >
                  <MessageSquareText className="w-3.5 h-3.5" />
                  <span>RAG Chat</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Connection Notice if empty */}
      {isDataEmpty && (
        <div className="glass-panel p-6 border border-slate-200 bg-white">
          <EmptyState
            icon={Database}
            title="No Dashboard Data Available (Empty State)"
            description={fetchError || "The backend returned no dataset records or the service is not currently populated. You can upload an Excel/CSV file to initialize metrics."}
            actionText={onNavigate ? "Upload Dataset File" : undefined}
            onAction={onNavigate ? () => onNavigate('upload') : undefined}
          />
        </div>
      )}

      {/* KPI Cards Grid */}
      <KPICards cards={data?.kpis ?? []} />

      {/* Primary Analytics Grid: Revenue Trend (2/3) + Regional Share (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart data={data?.revenue_trend ?? []} />
        </div>
        <div>
          <RegionChart data={data?.region_breakdown ?? []} />
        </div>
      </div>

      {/* Secondary Metrics: Country + Category + Quarterly */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CountryChart data={data?.country_breakdown ?? []} />
        <CategoryChart data={data?.category_breakdown ?? []} />
        <QuarterlyChart data={data?.quarterly_performance ?? []} />
      </div>

      {/* Product Leaderboard Table */}
      <TopProductsChart data={data?.top_products ?? []} />
    </div>
  );
};

