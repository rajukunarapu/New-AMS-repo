import React, { useState } from 'react';
import { Card } from '../Common/Card';
import { EmptyState } from '../Common/EmptyState';
import { Package, Search } from 'lucide-react';

interface TopProductsChartProps {
  data?: Array<{ product: string; units: number; revenue: number }> | null;
}

export const TopProductsChart: React.FC<TopProductsChartProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const rawData = data ?? [];
  const isEmpty = rawData.length === 0;
  const maxRevenue = Math.max(...rawData.map((d) => d.revenue ?? 0), 1);

  const filteredData = rawData.filter((item) =>
    (item.product || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card
      title="Top Performing Products Leaderboard"
      subtitle="Highest revenue generators by unit volume & margin"
      action={
        <div className="relative w-48 sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={isEmpty}
            placeholder="Filter product names..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100/80 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all disabled:opacity-50"
          />
        </div>
      }
    >
      {isEmpty ? (
        <EmptyState
          compact
          icon={Package}
          title="No Products Data Available"
          description="Product sales leaderboard is currently empty or loading from backend."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider bg-slate-50/70 text-[10px]">
                <th className="py-3 pl-4 w-12 text-center">Rank</th>
                <th className="py-3 px-3">Product Name</th>
                <th className="py-3 text-right px-4">Units Sold</th>
                <th className="py-3 text-right pr-4">Total Net Revenue</th>
                <th className="py-3 px-4 w-36">Revenue Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No products matched "{searchTerm}"
                  </td>
                </tr>
              ) : (
                filteredData.map((item, idx) => {
                  const rev = item.revenue ?? 0;
                  const units = item.units ?? 0;
                  const barWidth = (rev / maxRevenue) * 100;

                  return (
                    <tr
                      key={idx}
                      className="hover:bg-sky-50/50 transition-colors group"
                    >
                      {/* Rank Badge */}
                      <td className="py-3 pl-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-[10px] ${
                            idx === 0
                              ? 'bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs'
                              : idx === 1
                              ? 'bg-slate-200 text-slate-700 shadow-2xs'
                              : idx === 2
                              ? 'bg-orange-100 text-orange-800 shadow-2xs'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {idx + 1}
                        </span>
                      </td>

                      {/* Product Name */}
                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600 group-hover:bg-sky-100 group-hover:text-sky-700 transition-colors flex-shrink-0">
                            <Package className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-slate-800 font-semibold group-hover:text-sky-700 transition-colors">
                            {item.product || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Units */}
                      <td className="py-3 text-right px-4 font-mono text-slate-600 font-medium">
                        {units.toLocaleString()}
                      </td>

                      {/* Revenue */}
                      <td className="py-3 text-right pr-4 font-bold text-sky-700 font-mono">
                        ${(rev / 1000000).toFixed(2)}M
                      </td>

                      {/* Visual Bar */}
                      <td className="py-3 px-4">
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60 p-0.5">
                          <div
                            style={{ width: `${Math.min(100, Math.max(barWidth, 4))}%` }}
                            className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 rounded-full group-hover:brightness-110 transition-all duration-300"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};

