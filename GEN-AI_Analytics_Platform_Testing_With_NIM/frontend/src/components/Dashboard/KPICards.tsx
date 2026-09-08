import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Percent,
  Globe2,
  Minus,
} from 'lucide-react';
import type { KPICard } from '../../services/dashboard';

interface KPICardsProps {
  cards: KPICard[];
}

export const KPICards: React.FC<KPICardsProps> = ({ cards }) => {
  const meta = [
    { icon: DollarSign, color: 'from-sky-500 to-blue-600', shadow: 'shadow-sky-500/20', bg: 'bg-sky-50', text: 'text-sky-600' },
    { icon: ShoppingBag, color: 'from-blue-600 to-indigo-600', shadow: 'shadow-indigo-500/20', bg: 'bg-indigo-50', text: 'text-indigo-600' },
    { icon: Percent, color: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20', bg: 'bg-emerald-50', text: 'text-emerald-600' },
    { icon: Globe2, color: 'from-purple-500 to-violet-600', shadow: 'shadow-purple-500/20', bg: 'bg-purple-50', text: 'text-purple-600' },
  ];

  const defaultCards: KPICard[] = [
    { title: 'Total Net Revenue', value: '$0', change: '0.0%', trend: 'neutral' },
    { title: 'Total Quantity Sold', value: '0', change: '0.0%', trend: 'neutral' },
    { title: 'Gross Margin', value: '0.0%', change: '0.0%', trend: 'neutral' },
    { title: 'Active Countries', value: '0', change: '0.0%', trend: 'neutral' },
  ];

  const displayCards = cards && cards.length > 0 ? cards : defaultCards;
  const isAllEmpty = !cards || cards.length === 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {displayCards.map((card, idx) => {
        const itemMeta = meta[idx % meta.length];
        const Icon = itemMeta.icon;
        const isUp = card.trend === 'up';
        const isDown = card.trend === 'down';
        const displayValue = card.value ?? '0';
        const displayChange = (!card.change || card.change === 'null') ? '0.0%' : card.change;

        return (
          <div
            key={idx}
            className={`glass-panel p-5 relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-lg transition-all border border-slate-200/90 ${
              isAllEmpty ? 'opacity-80' : ''
            }`}
          >
            {/* Top Row: Label & Icon */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {card.title}
              </span>
              <div
                className={`p-2.5 rounded-xl ${itemMeta.bg} ${itemMeta.text} group-hover:scale-110 transition-transform`}
              >
                <Icon className="w-4 h-4" />
              </div>
            </div>

            {/* Middle Row: Main Metric & Trend Badge */}
            <div className="mt-3 flex items-baseline justify-between">
              <h3 className={`text-2xl font-extrabold tracking-tight ${isAllEmpty || displayValue === '—' ? 'text-slate-400 font-mono' : 'text-slate-900'}`}>
                {displayValue}
              </h3>
              <span
                className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${
                  isUp
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : isDown
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                }`}
              >
                {isUp && <TrendingUp className="w-3 h-3 mr-1" />}
                {isDown && <TrendingDown className="w-3 h-3 mr-1" />}
                {!isUp && !isDown && <Minus className="w-3 h-3 mr-1 text-slate-400" />}
                {displayChange}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
