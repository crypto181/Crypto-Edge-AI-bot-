import React, { useState, useEffect } from 'react';
import { AreaChart, TrendingUp, BarChart2, Calendar, ShieldCheck, Eye, EyeOff, ChevronUp, ChevronDown, Activity } from 'lucide-react';
import { MarketDepthChart } from './MarketDepthChart';

// Helper to format trade timestamps safely whether they are Firebase Timestamp, date objects or strings
const formatTradeTime = (ts: any) => {
  if (!ts) return '';
  try {
    if (typeof ts.toDate === 'function') {
      return ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    if (ts.seconds) {
      return new Date(ts.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch (e) {
    return String(ts);
  }
};

interface TradingViewChartProps {
  defaultSymbol?: string;
  trades?: any[];
  onSymbolSelect?: (symbol: string) => void;
  theme?: 'light' | 'dark';
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({ defaultSymbol = 'BTC/USDT', trades = [], onSymbolSelect, theme = 'dark' }) => {
  const pairs = [
    { label: 'BTC/USDT', value: 'BTCUSDT', desc: 'Bitcoin' },
    { label: 'ETH/USDT', value: 'ETHUSDT', desc: 'Ethereum' },
    { label: 'SOL/USDT', value: 'SOLUSDT', desc: 'Solana' },
    { label: 'ADA/USDT', value: 'ADAUSDT', desc: 'Cardano' },
    { label: 'XRP/USDT', value: 'XRPUSDT', desc: 'Ripple' },
    { label: 'DOT/USDT', value: 'DOTUSDT', desc: 'Polkadot' },
    { label: 'DOGE/USDT', value: 'DOGEUSDT', desc: 'Dogecoin' },
    { label: 'LINK/USDT', value: 'LINKUSDT', desc: 'Chainlink' },
    { label: 'LTC/USDT', value: 'LTCUSDT', desc: 'Litecoin' },
    { label: 'BNB/USDT', value: 'BNBUSDT', desc: 'BNB' },
  ];

  const cleanDefault = defaultSymbol.replace('/', '');
  const initialPair = pairs.some(p => p.value === cleanDefault) ? cleanDefault : 'BTCUSDT';

  const [selectedPair, setSelectedPair] = useState<string>(initialPair);
  const [interval, setInterval] = useState<string>('60'); // Minutes (60 = 1h, D = 1 Day)
  const [showExecutions, setShowExecutions] = useState<boolean>(true);
  const [hoveredTradeId, setHoveredTradeId] = useState<string | null>(null);

  // Sync selectedPair when parent's defaultSymbol updates
  useEffect(() => {
    const cleanProp = defaultSymbol.replace('/', '');
    if (pairs.some(p => p.value === cleanProp)) {
      setSelectedPair(cleanProp);
    }
  }, [defaultSymbol]);

  const intervals = [
    { label: '1m', value: '1' },
    { label: '15m', value: '15' },
    { label: '1h', value: '60' },
    { label: '4h', value: '240' },
    { label: 'Daily', value: 'D' },
  ];

  // Map pairs to Binance symbols for TradingView Widget
  const tvSymbol = `BINANCE:${selectedPair}`;

  // Filter recent session trades matching the currently selected active crypto asset
  const currentSymbolTrades = (trades || []).filter(
    (t) => t.symbol.replace('/', '') === selectedPair
  );

  // Build the customized TradingView Widget URL
  const iframeSrc = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=${encodeURIComponent(
    tvSymbol
  )}&interval=${interval}&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=${theme === 'light' ? 'f8fafc' : '18181b'}&studies=%5B%5D&theme=${theme}&style=1&timezone=Etc%2FUTC&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=en&utm_source=cryptoedge&utm_medium=widget&utm_campaign=chart`;

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 rounded-3xl border border-white/5 overflow-hidden">
      {/* Chart Control Header */}
      <div className="p-4 bg-zinc-900/40 border-b border-white/5 flex flex-col lg:flex-row items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-2 max-w-full w-full lg:w-auto min-w-0">
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 overflow-x-auto max-w-full [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden gap-1 select-none border-box min-w-0">
            {pairs.map((pair) => (
              <button
                key={pair.value}
                onClick={() => {
                  setSelectedPair(pair.value);
                  if (onSymbolSelect) {
                    onSymbolSelect(pair.label);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedPair === pair.value
                    ? 'bg-white text-black shadow-lg shadow-white/5 font-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {pair.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 text-[10px] font-bold">
            {intervals.map((int) => (
              <button
                key={int.value}
                onClick={() => setInterval(int.value)}
                className={`px-2.5 py-1.5 rounded-xl transition-all font-black uppercase ${
                  interval === int.value
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {int.label}
              </button>
            ))}
          </div>

          <span className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-400 px-2 py-1.5 bg-emerald-500/10 rounded-xl border border-emerald-500/10 uppercase">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            Live Feed
          </span>
        </div>
      </div>

      {/* Embedded High-Performance TradingView Iframe Widget */}
      <div className="relative flex-1 min-h-[300px] md:min-h-[380px] w-full bg-zinc-950 flex overflow-hidden">
        {/* Iframe Viewport Container */}
        <div className="relative flex-1 h-full w-full">
          <iframe
            src={iframeSrc}
            className="w-full h-full border-0 absolute inset-0"
            title="CryptoEdge Dynamic TradingView Chart"
            allowFullScreen
            loading="lazy"
          />
        </div>

        {/* Floating Toggle Controls Over Iframe Workspace */}
        <div className="absolute top-4 right-4 z-30 flex items-center gap-2 select-none">
          <button
            onClick={() => setShowExecutions(!showExecutions)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-widest leading-none bg-zinc-900/95 border hover:bg-zinc-800 border-white/10 text-white transition-all shadow-xl backdrop-blur-md`}
          >
            {showExecutions ? <EyeOff className="w-3 h-3 text-emerald-400" /> : <Eye className="w-3 h-3 text-zinc-500" />}
            {showExecutions ? 'Hide Execution Trace' : 'Show Execution Trace'}
          </button>
        </div>

        {/* Horizontal Laser measurement lines triggered by hovering individual nodes */}
        {showExecutions && hoveredTradeId && (
          <div className="absolute inset-x-0 h-0.5 bg-white/10 border-t border-dashed border-white/20 top-1/2 pointer-events-none z-10 animate-pulse flex items-center justify-end px-4">
            <span className="bg-zinc-900/95 border border-white/10 text-[8px] font-mono text-zinc-300 rounded px-1 -translate-y-[1px] leading-none uppercase font-bold">
              Execution Level Tagged
            </span>
          </div>
        )}

        {/* Sidebar Overlay Pane: Session Ledgers (Desktop Detail) */}
        {showExecutions && currentSymbolTrades.length > 0 && (
          <div className="absolute right-4 top-14 bottom-22 w-72 bg-zinc-950/95 backdrop-blur-md rounded-2xl border border-white/10 p-4 shadow-2xl flex flex-col gap-3 z-20 animate-in fade-in slide-in-from-right duration-200 lg:flex hidden">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping shrink-0" />
                <span className="text-[10px] font-black uppercase text-zinc-300 tracking-wider">Session Trades Ledger</span>
              </div>
              <span className="text-[9px] bg-white/5 border border-white/5 text-zinc-400 px-2 py-0.5 rounded-lg font-bold font-mono">
                {currentSymbolTrades.length} Trades
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {currentSymbolTrades.map((trade) => {
                const isBuy = trade.side === 'buy';
                const time = formatTradeTime(trade.timestamp);
                return (
                  <div
                    key={trade.id}
                    className={`p-2.5 rounded-xl border ${
                      isBuy
                        ? 'bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/30'
                        : 'bg-red-500/5 border-red-500/10 hover:border-red-500/30'
                    } flex flex-col gap-1 hover:bg-zinc-900/50 transition-all duration-200`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                        isBuy ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {trade.side.toUpperCase()}
                      </span>
                      <span className="text-[9px] font-mono text-zinc-500">{time}</span>
                    </div>

                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="text-white font-bold">
                        ${trade.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-zinc-400 font-semibold">{trade.amount} {trade.symbol.split('/')[0]}</span>
                    </div>

                    <div className="flex items-center justify-between text-[8px] text-zinc-500 font-bold tracking-wider mt-0.5">
                      <span>TYPE: <span className="text-zinc-400">{trade.type.toUpperCase()}</span></span>
                      <span>ORDER: <span className="text-zinc-400 uppercase">{trade.orderType || 'MARKET'}</span></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Horizontal conveyor Roadmap banner at bottom of frame */}
        {showExecutions && currentSymbolTrades.length > 0 && (
          <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-col gap-1 select-none pointer-events-auto">
            <div className="bg-zinc-950/90 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl p-3 flex flex-col gap-1.5 lg:max-w-[calc(100%-19rem)]">
              <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold border-b border-white/5 pb-1">
                <span className="flex items-center gap-1.5 uppercase tracking-wider text-[9px]">
                  <Activity className="w-3 h-3 text-emerald-400" />
                  Execution Points (Buy / Sell Timeline)
                </span>
                <span className="text-[8px] font-mono text-zinc-500 font-bold uppercase tracking-wider">
                  Hover to tag level
                </span>
              </div>

              <div className="flex gap-2 overflow-x-auto py-1 px-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {currentSymbolTrades.map((trade) => {
                  const isBuy = trade.side === 'buy';
                  const timestampStr = formatTradeTime(trade.timestamp);
                  const isHovered = hoveredTradeId === trade.id;

                  return (
                    <div
                      key={trade.id}
                      onMouseEnter={() => setHoveredTradeId(trade.id)}
                      onMouseLeave={() => setHoveredTradeId(null)}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all duration-300 cursor-pointer shrink-0 ${
                        isHovered
                          ? isBuy
                            ? 'bg-emerald-500/20 border-emerald-400 shadow-md shadow-emerald-500/10 scale-[1.03]'
                            : 'bg-red-500/20 border-red-400 shadow-md shadow-red-500/10 scale-[1.03]'
                          : isBuy
                          ? 'bg-emerald-950/20 border-emerald-500/20 hover:border-emerald-500/40'
                          : 'bg-red-950/20 border-red-500/20 hover:border-red-500/40'
                      }`}
                    >
                      <div className={`p-1 rounded-lg leading-none ${isBuy ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isBuy ? (
                          <ChevronUp className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-mono font-bold text-white">
                          ${trade.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[8px] font-mono text-zinc-500 font-semibold leading-tight">
                          {trade.amount} {trade.symbol.split('/')[0]} • {timestampStr}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Market Order Depth Chart Panel */}
      <MarketDepthChart symbol={selectedPair} />

      {/* Dynamic Info Footer */}
      <div className="px-5 py-3.5 bg-zinc-900/60 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-zinc-400" />
          <span>Feed Symbol: <span className="text-zinc-300 font-bold">{tvSymbol}</span></span>
        </div>
        <div className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-500/80 font-bold">TradingView Analytics Verified</span>
        </div>
      </div>
    </div>
  );
};

