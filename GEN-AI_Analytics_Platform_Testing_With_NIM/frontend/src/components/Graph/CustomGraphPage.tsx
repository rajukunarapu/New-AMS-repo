import React, { useState, useRef, useCallback } from 'react';
import {
  Sparkles,
  BarChart2,
  Send,
  Download,
  AlertTriangle,
  Lightbulb,
  TrendingUp,
  PieChart,
  Activity,
  LayoutGrid,
  Loader2,
  X,
  RefreshCw,
  History,
  Copy,
  Check,
  Maximize2,
  TableProperties,
} from 'lucide-react';
import { generateCustomGraph } from '../../services/graph';
import type { GraphResponse } from '../../services/graph';

// ── Types ─────────────────────────────────────────────────────────────────────

interface HistoryEntry {
  id: string;
  prompt: string;
  result: GraphResponse;
  timestamp: Date;
}

// ── Streamlined Prompt Suggestions ───────────────────────────────────────────

const PROMPT_SUGGESTIONS = [
  { label: 'Monthly revenue trend', icon: TrendingUp, prompt: 'Show monthly net revenue trend over time as a line chart with smooth shaded area' },
  { label: 'Quarterly profit comparison', icon: BarChart2, prompt: 'Compare quarterly gross profit across 2023, 2024, and 2025 as a grouped bar chart' },
  { label: 'Revenue by category', icon: PieChart, prompt: 'Create a donut chart of total net revenue by product category with percentage callouts' },
  { label: 'Top 10 products by profit', icon: LayoutGrid, prompt: 'Horizontal bar chart of top 10 products ranked by total GrossMarginUSD' },
  { label: 'Revenue & margin by region', icon: Activity, prompt: 'Compare Net Revenue and Gross Margin across North America, Europe, Asia-Pacific, and Latin America' },
  { label: 'Discount vs Margin scatter', icon: Sparkles, prompt: 'Scatter plot of DiscountPercent vs GrossMarginPercent with a regression trendline' },
];

// ── Available Dataset Columns Reference ───────────────────────────────────────

const DATASET_COLUMNS = [
  { name: 'NetRevenueUSD', type: 'Numeric', desc: 'Total realized sales revenue in USD' },
  { name: 'GrossMarginUSD', type: 'Numeric', desc: 'Total gross profit margin in USD' },
  { name: 'GrossMarginPercent', type: 'Numeric', desc: 'Margin percentage (0-100%)' },
  { name: 'DiscountPercent', type: 'Numeric', desc: 'Applied discount rate' },
  { name: 'Quantity', type: 'Numeric', desc: 'Number of units sold' },
  { name: 'UnitCostUSD', type: 'Numeric', desc: 'Manufacturing & logistics cost per unit' },
  { name: 'UnitPriceUSD', type: 'Numeric', desc: 'Standard retail list price' },
  { name: 'Region', type: 'Categorical', desc: 'North America, Europe, Asia-Pacific, Latin America' },
  { name: 'Country', type: 'Categorical', desc: '15 global operating countries (e.g., US, Germany, UK)' },
  { name: 'Category', type: 'Categorical', desc: 'Material Handling, Heavy Machinery, Robotics, Safety, Tools' },
  { name: 'Product', type: 'Categorical', desc: 'Specific industrial catalog SKU item' },
  { name: 'SalesQuarter', type: 'Temporal', desc: 'Fiscal quarter (e.g., 2024 Q1, 2025 Q4)' },
  { name: 'MonthLabel', type: 'Temporal', desc: 'Monthly granularity (e.g., 2024 Jan, 2025 Dec)' },
  { name: 'DistributionChannel', type: 'Categorical', desc: 'Direct Enterprise, Distributor, Online B2B' },
  { name: 'CustomerSegment', type: 'Categorical', desc: 'Enterprise, Mid-Market, Tier 1 OEM' },
];

// ── Chart-type badge colours ──────────────────────────────────────────────────

const CHART_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  bar:          { bg: 'bg-sky-100',    text: 'text-sky-700',    label: 'Bar Chart'          },
  stacked_bar:  { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Stacked Bar'        },
  line:         { bg: 'bg-emerald-100',text: 'text-emerald-700',label: 'Line Chart'         },
  area:         { bg: 'bg-teal-100',   text: 'text-teal-700',   label: 'Area Chart'         },
  pie:          { bg: 'bg-violet-100', text: 'text-violet-700', label: 'Pie Chart'          },
  donut:        { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Donut Chart'        },
  scatter:      { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Scatter Plot'       },
  heatmap:      { bg: 'bg-rose-100',   text: 'text-rose-700',   label: 'Heatmap'            },
  funnel:       { bg: 'bg-amber-100',  text: 'text-amber-700',  label: 'Funnel Chart'       },
  waterfall:    { bg: 'bg-cyan-100',   text: 'text-cyan-700',   label: 'Waterfall Chart'    },
  treemap:      { bg: 'bg-lime-100',   text: 'text-lime-700',   label: 'Treemap'            },
  box:          { bg: 'bg-pink-100',   text: 'text-pink-700',   label: 'Box Plot'           },
  violin:       { bg: 'bg-fuchsia-100',text: 'text-fuchsia-700',label: 'Violin Plot'        },
  dynamic:      { bg: 'bg-slate-100',  text: 'text-slate-700',  label: 'Chart'              },
};

function getChartBadge(type?: string) {
  return CHART_BADGE[type ?? ''] ?? CHART_BADGE['dynamic'];
}

// ── Pipeline steps ────────────────────────────────────────────────────────────

const PIPELINE_STEPS = [
  'Inspecting dataset schema…',
  'Interpreting query prompt…',
  'Synthesizing visualization script…',
  'Executing Python environment…',
  'Rendering chart & insights…',
];

const GraphSkeleton: React.FC = () => {
  const [stepIdx, setStepIdx] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setStepIdx((prev) => Math.min(prev + 1, PIPELINE_STEPS.length - 1));
    }, 850);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-panel p-5 animate-pulse-soft space-y-4 border border-sky-200/80 bg-white">
      <div className="w-full h-64 bg-gradient-to-br from-slate-50 to-sky-50/50 rounded-xl flex items-center justify-center border border-slate-200/60">
        <div className="flex flex-col items-center gap-2 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
          <span className="text-xs font-semibold text-slate-700">Generating Custom Graph…</span>
        </div>
      </div>

      <div className="space-y-1.5 max-w-sm mx-auto">
        {PIPELINE_STEPS.map((step, i) => (
          <div
            key={step}
            className={`flex items-center gap-2 text-xs transition-all duration-300 ${
              i < stepIdx
                ? 'text-emerald-700 font-medium'
                : i === stepIdx
                ? 'text-sky-700 font-semibold'
                : 'text-slate-400'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold ${
                i < stepIdx
                  ? 'bg-emerald-100 text-emerald-700'
                  : i === stepIdx
                  ? 'bg-sky-500 text-white animate-pulse'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              {i < stepIdx ? '✓' : i + 1}
            </div>
            <span className="text-[11px]">{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export const CustomGraphPage: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GraphResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showSchemaModal, setShowSchemaModal] = useState(false);
  const [selectedImageModal, setSelectedImageModal] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = useCallback(
    async (customPrompt?: string) => {
      const finalPrompt = (customPrompt ?? prompt).trim();
      if (!finalPrompt) return;

      setLoading(true);
      setError(null);
      setResult(null);
      if (customPrompt) setPrompt(customPrompt);

      try {
        const res = await generateCustomGraph(finalPrompt);
        setResult(res);
        setHistory((prev) => [
          {
            id: Date.now().toString(),
            prompt: finalPrompt,
            result: res,
            timestamp: new Date(),
          },
          ...prev.slice(0, 19),
        ]);
      } catch (err: any) {
        setError(
          err?.response?.data?.detail ??
            err?.message ??
            'Failed to generate custom graph. Please refine your query.'
        );
      } finally {
        setLoading(false);
      }
    },
    [prompt]
  );

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleGenerate();
  };

  const handleDownload = () => {
    if (!result?.image_base64) return;
    const a = document.createElement('a');
    a.href = result.image_base64;
    a.download = `graph_${Date.now()}.png`;
    a.click();
  };

  const copyPromptText = () => {
    if (!result?.prompt) return;
    navigator.clipboard.writeText(result.prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const restoreFromHistory = (entry: HistoryEntry) => {
    setResult(entry.result);
    setPrompt(entry.prompt);
    setError(null);
    setShowHistory(false);
  };

  const badge = getChartBadge(result?.chart_type);

  return (
    <div className="space-y-4">
      {/* Streamlined Header Banner */}
      <div className="glass-panel p-4 sm:p-5 bg-gradient-to-r from-white via-sky-50/40 to-indigo-50/30 border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-sky-600 to-indigo-600 rounded-xl text-white flex-shrink-0 shadow-sm shadow-sky-500/20">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-100 text-sky-700 uppercase tracking-wider">
                  Graph Studio
                </span>
                <span className="text-[11px] text-slate-400">Natural Language Visualization</span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 mt-0.5">
                Custom Graph Studio
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate instant charts and statistical insights using natural language.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={() => setShowSchemaModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-all"
            >
              <TableProperties className="w-3.5 h-3.5 text-sky-600" />
              <span>Columns</span>
            </button>

            {history.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-all"
              >
                <History className="w-3.5 h-3.5 text-indigo-600" />
                <span>History ({history.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: History Drawer + Studio Content */}
      <div className="flex gap-4 items-start">
        {/* History Sidebar */}
        {showHistory && (
          <aside className="w-64 glass-panel p-3.5 flex-shrink-0 space-y-2.5 animate-in fade-in duration-200 border border-slate-200 bg-white">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <History className="w-3.5 h-3.5 text-sky-600" />
                <span>Recent Charts</span>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
              {history.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => restoreFromHistory(entry)}
                  className="w-full text-left p-2 rounded-lg border border-slate-200 hover:border-sky-300 hover:bg-sky-50/40 transition-all group"
                >
                  {entry.result.image_base64 && (
                    <img
                      src={entry.result.image_base64}
                      alt={entry.prompt}
                      className="w-full h-16 object-cover rounded border border-slate-100 mb-1"
                    />
                  )}
                  <p className="text-xs font-medium text-slate-700 line-clamp-2 group-hover:text-sky-700">
                    {entry.prompt}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </button>
              ))}
            </div>
          </aside>
        )}

        {/* Studio Center Panel */}
        <div className="flex-1 space-y-4 min-w-0">
          {/* Prompt Form & Preset Suggestions */}
          <div className="glass-panel p-4 space-y-3 border border-slate-200 bg-white">
            <form onSubmit={handleFormSubmit} className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., Monthly revenue trend over time as a line chart…"
                  disabled={loading}
                  className="w-full pl-3.5 pr-8 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:bg-white disabled:opacity-60 transition-all"
                />
                {prompt && !loading && (
                  <button
                    type="button"
                    onClick={() => {
                      setPrompt('');
                      inputRef.current?.focus();
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="px-4 sm:px-5 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing…</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Generate</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Preset Chips */}
            <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                <span>Quick Presets:</span>
                <button
                  type="button"
                  onClick={() => setShowSchemaModal(true)}
                  className="text-sky-600 hover:underline font-medium"
                >
                  View Columns →
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                {PROMPT_SUGGESTIONS.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleGenerate(item.prompt)}
                      disabled={loading}
                      className="text-left flex items-center justify-between p-2 rounded-lg bg-slate-50/70 hover:bg-sky-50/50 hover:border-sky-200 border border-slate-200 text-xs text-slate-700 transition-all group"
                    >
                      <div className="flex items-center space-x-1.5 min-w-0 pr-1">
                        <Icon className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
                        <span className="truncate group-hover:text-sky-800 font-medium text-[11px]">
                          {item.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="glass-panel p-3.5 border border-rose-200 bg-rose-50/80 space-y-1.5">
              <div className="flex items-start gap-2.5">
                <div className="p-1 bg-rose-100 rounded-lg flex-shrink-0 text-rose-600">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-rose-800">Generation Notice</h4>
                  <p className="text-xs text-rose-700 mt-0.5 break-words">{error}</p>
                </div>
                <button
                  onClick={() => handleGenerate()}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-800 bg-rose-200/80 hover:bg-rose-200 rounded-lg transition-all"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              </div>
            </div>
          )}

          {/* Loading Animation */}
          {loading && <GraphSkeleton />}

          {/* Rendered Graph Result */}
          {!loading && result?.image_base64 && (
            <div className="glass-panel p-4 sm:p-5 space-y-3.5 border border-slate-200 bg-white">
              {/* Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-sky-50 text-sky-600 rounded-lg">
                    <BarChart2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 sm:text-sm">
                        Visualization Result
                      </span>
                      {result.chart_type && (
                        <span
                          className={`text-[9px] font-bold px-2 py-0.2 rounded-full ${badge.bg} ${badge.text}`}
                        >
                          {badge.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSelectedImageModal(result.image_base64)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span>Expand</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-2xs transition-all"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </button>
                </div>
              </div>

              {/* Main Chart Image Container */}
              <div
                className="rounded-xl overflow-hidden border border-slate-200/90 bg-white p-1.5 flex items-center justify-center cursor-pointer group relative"
                onClick={() => setSelectedImageModal(result.image_base64)}
              >
                <img
                  src={result.image_base64}
                  alt={`Generated chart: ${result.prompt}`}
                  className="w-full h-auto object-contain max-h-[480px] rounded-lg group-hover:scale-[1.005] transition-transform"
                />
              </div>

              {/* Executed Prompt Box */}
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Executed Prompt
                  </span>
                  <p className="text-xs font-semibold text-slate-800 truncate">"{result.prompt}"</p>
                </div>
                <button
                  onClick={copyPromptText}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-200 transition-colors flex-shrink-0"
                  title="Copy Prompt"
                >
                  {copiedPrompt ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* AI Insights & Summary */}
              {result.insights && (
                <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-lg space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="text-xs font-bold text-indigo-900">
                      Summary & Insights
                    </span>
                  </div>
                  <div className="text-xs text-indigo-950 leading-relaxed space-y-0.5">
                    {result.insights.split('\n').map((line, i) => (
                      <p
                        key={i}
                        dangerouslySetInnerHTML={{
                          __html: line
                            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                            .replace(/`(.+?)`/g, '<code class="bg-indigo-100 text-indigo-800 px-1 rounded text-[10px]">$1</code>'),
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {!loading && !result && !error && (
            <div className="glass-panel p-8 flex flex-col items-center justify-center text-center space-y-2.5 border border-slate-200 bg-white">
              <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl">
                <BarChart2 className="w-6 h-6" />
              </div>
              <div className="max-w-sm space-y-0.5">
                <h3 className="text-sm font-bold text-slate-800">
                  Ready to Generate Visualizations
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Type any natural language prompt or pick a preset above to create charts in seconds.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dataset Schema Reference Modal */}
      {showSchemaModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowSchemaModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-xl w-full max-h-[80vh] flex flex-col shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <TableProperties className="w-4 h-4 text-sky-600" />
                <h3 className="text-xs font-bold text-slate-800">Available Dataset Schema</h3>
              </div>
              <button
                onClick={() => setShowSchemaModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 overflow-y-auto space-y-1.5 flex-1 text-xs">
              <p className="text-slate-500 text-[11px] mb-2">
                Click any column to include it in your query:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {DATASET_COLUMNS.map((col) => (
                  <div
                    key={col.name}
                    onClick={() => {
                      setPrompt((prev) => (prev ? `${prev} by ${col.name}` : `Show ${col.name}`));
                      setShowSchemaModal(false);
                      inputRef.current?.focus();
                    }}
                    className="p-2 rounded-lg border border-slate-200 hover:border-sky-400 hover:bg-sky-50/50 cursor-pointer transition-all flex flex-col justify-between group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 font-mono text-[11px] group-hover:text-sky-700">
                        {col.name}
                      </span>
                      <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-slate-100 text-slate-600">
                        {col.type}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">{col.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* High-Res Image Modal */}
      {selectedImageModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedImageModal(null)}
        >
          <div
            className="relative bg-white rounded-2xl p-3.5 max-w-4xl max-h-[90vh] overflow-auto shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-700">Plot View</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg"
                >
                  <Download className="w-3 h-3" /> Download
                </button>
                <button
                  onClick={() => setSelectedImageModal(null)}
                  className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <img
              src={selectedImageModal}
              alt="High resolution graph"
              className="w-full h-auto rounded-lg object-contain max-h-[72vh]"
            />
          </div>
        </div>
      )}
    </div>
  );
};
