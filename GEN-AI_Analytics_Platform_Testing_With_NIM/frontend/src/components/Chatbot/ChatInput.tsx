import React, { useState, useRef } from 'react';
import { Send, X, Sparkles } from 'lucide-react';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput('');
  };

  const handleQuickTag = (tagPrefix: string) => {
    setInput((prev) => (prev ? `${prev} ${tagPrefix}` : tagPrefix));
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-2">
      {/* Quick Scaffold Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[10px] text-slate-500">
        <span className="font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 flex-shrink-0">
          <Sparkles className="w-3 h-3 text-indigo-500" />
          <span>Prefix:</span>
        </span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleQuickTag('Generate a bar chart of')}
          className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-sky-50 text-slate-600 hover:text-sky-700 border border-slate-200 transition-colors whitespace-nowrap"
        >
          📊 Bar Chart
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleQuickTag('Plot monthly revenue trend')}
          className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-sky-50 text-slate-600 hover:text-sky-700 border border-slate-200 transition-colors whitespace-nowrap"
        >
          📈 Revenue Trend
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleQuickTag('Lookup Order SO-')}
          className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border border-slate-200 transition-colors whitespace-nowrap"
        >
          🔍 Order Lookup
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleQuickTag('Analyze gross margin % for')}
          className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-violet-50 text-slate-600 hover:text-violet-700 border border-slate-200 transition-colors whitespace-nowrap"
        >
          💡 Margin Breakdown
        </button>
      </div>

      {/* Input Bar Form */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="relative flex-1 group">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question or request a chart (e.g., 'Bar chart of Net Revenue by Region')..."
            disabled={disabled}
            className="w-full pl-3.5 pr-9 py-2.5 text-xs sm:text-sm bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60 transition-all shadow-2xs group-hover:border-slate-300"
          />
          {input && !disabled && (
            <button
              type="button"
              onClick={() => {
                setInput('');
                inputRef.current?.focus();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 transition-all"
              title="Clear input"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={!input.trim() || disabled}
          className="px-4 sm:px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          {disabled ? (
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">{disabled ? 'Thinking…' : 'Send'}</span>
        </button>
      </form>
    </div>
  );
};
