import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Coins, 
  ShieldAlert, 
  Info, 
  CheckCircle,
  TrendingUp,
  Sliders,
  Wallet,
  Zap
} from 'lucide-react';
import { cn } from '../lib/utils';

interface ManualTradePanelProps {
  user: any;
  profile: any;
  balances: Record<string, any>;
  simulatedPrices: Record<string, number>;
  placeManualTrade: (
    symbol: string,
    side: 'buy' | 'sell',
    stopLoss?: number,
    takeProfit?: number,
    customAmount?: number,
    leverageVal?: number,
    orderType?: 'market' | 'limit',
    limitPriceVal?: number
  ) => Promise<any>;
  theme?: 'light' | 'dark';
  selectedSymbol?: string;
  onSelectedSymbolChange?: (symbol: string) => void;
  tradingType?: 'spot' | 'futures';
  setTradingType?: (type: 'spot' | 'futures') => void;
}

export const ManualTradePanel: React.FC<ManualTradePanelProps> = ({
  user,
  profile,
  balances,
  simulatedPrices,
  placeManualTrade,
  theme = 'dark',
  selectedSymbol,
  onSelectedSymbolChange,
  tradingType,
  setTradingType
}) => {
  // Tradable Assets (expanded to include all 10 coins matching TradingView charts)
  const assets = ['BTC', 'ETH', 'SOL', 'ADA', 'XRP', 'DOT', 'DOGE', 'LINK', 'LTC', 'BNB'];
  
  // States
  const [selectedAsset, setSelectedAsset] = useState<string>(() => {
    if (selectedSymbol) {
      return selectedSymbol.split('/')[0];
    }
    return 'BTC';
  });

  // Keep selected asset in sync when parent selectedSymbol changes
  useEffect(() => {
    if (selectedSymbol) {
      const parentAsset = selectedSymbol.split('/')[0];
      if (assets.includes(parentAsset)) {
        setSelectedAsset(parentAsset);
      }
    }
  }, [selectedSymbol]);

  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [amountType, setAmountType] = useState<'coin' | 'usdt'>('coin');
  const [amountInput, setAmountInput] = useState<string>('');
  const [limitPrice, setLimitPrice] = useState<string>('');
  const [leverage, setLeverage] = useState<number>(10);
  const [enableTPSL, setEnableTPSL] = useState<boolean>(false);
  const [stopLossPercent, setStopLossPercent] = useState<string>('2.0');
  const [takeProfitPercent, setTakeProfitPercent] = useState<string>('6.0');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Derive current trading state
  const symbol = `${selectedAsset}/USDT`;
  const livePrice = simulatedPrices[symbol] || (
    selectedAsset === 'BTC' ? 64250 : 
    selectedAsset === 'ETH' ? 3450 : 
    selectedAsset === 'SOL' ? 145 : 
    selectedAsset === 'ADA' ? 0.45 :
    selectedAsset === 'XRP' ? 0.52 :
    selectedAsset === 'DOT' ? 5.85 :
    selectedAsset === 'DOGE' ? 0.14 :
    selectedAsset === 'LINK' ? 15.30 :
    selectedAsset === 'LTC' ? 82.50 :
    580.00 // BNB
  );
  
  const activeExchange = profile?.exchanges ? Object.keys(profile.exchanges)[0] : 'binance';
  const activeConfig = profile?.exchanges?.[activeExchange];
  const tradingMode = tradingType || activeConfig?.tradingType || 'spot'; // 'spot' or 'futures'
  const isSandbox = !activeConfig || activeConfig.apiKey === 'test' || activeConfig.apiKey === 'demo';

  // Set default limit price when asset changes
  useEffect(() => {
    setLimitPrice(String(livePrice));
  }, [selectedAsset]);

  // Handle asset changing to reset calculated inputs
  useEffect(() => {
    setAmountInput('');
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [selectedAsset, side, orderType]);

  // Calculate Available Balance
  const usdtBalance = Number(balances?.USDT) || 0;
  const assetBalance = Number(balances?.[selectedAsset]) || 0;
  const availableBuyPower = usdtBalance;
  
  // Calculate PnL / Estimations
  const inputNum = parseFloat(amountInput) || 0;
  const priceNum = orderType === 'limit' ? (parseFloat(limitPrice) || livePrice) : livePrice;
  
  let coinQty = 0;
  let totalCostUsdt = 0;

  if (amountType === 'usdt') {
    totalCostUsdt = inputNum;
    coinQty = priceNum > 0 ? (inputNum / priceNum) : 0;
  } else {
    coinQty = inputNum;
    totalCostUsdt = inputNum * priceNum;
  }

  // Margins & Leverage calculations for futures
  const marginRequired = tradingMode === 'futures' ? (totalCostUsdt / leverage) : totalCostUsdt;

  // Stop Loss & Take Profit absolute triggers
  const stopLossPercentNum = parseFloat(stopLossPercent) || 0;
  const takeProfitPercentNum = parseFloat(takeProfitPercent) || 0;

  // Liquidation estimate (isolated leverage futures)
  let liquidationPriceEstimate = 0;
  if (tradingMode === 'futures') {
    const maintenanceMargin = 0.005; // 0.5%
    if (side === 'buy') {
      liquidationPriceEstimate = priceNum * (1 - (1 / leverage) + maintenanceMargin);
    } else {
      liquidationPriceEstimate = priceNum * (1 + (1 / leverage) - maintenanceMargin);
    }
  }

  // Pre-calculated execution trigger targets for helper text
  const slTriggerPrice = side === 'buy'
    ? priceNum * (1 - stopLossPercentNum / 100)
    : priceNum * (1 + stopLossPercentNum / 100);

  const tpTriggerPrice = side === 'buy'
    ? priceNum * (1 + takeProfitPercentNum / 100)
    : priceNum * (1 - takeProfitPercentNum / 100);

  // Shortcut percentages
  const applyPercent = (pct: number) => {
    setErrorMsg(null);
    if (side === 'buy') {
      // Percentage of available USDT
      const totalToSpend = (usdtBalance * pct);
      setAmountType('usdt');
      setAmountInput(totalToSpend.toLocaleString(undefined, { useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    } else {
      // Percentage of available asset tokens
      const totalToSell = (assetBalance * pct);
      setAmountType('coin');
      setAmountInput(totalToSell.toLocaleString(undefined, { useGrouping: false, minimumFractionDigits: 4, maximumFractionDigits: 6 }));
    }
  };

  // Submit Order Handle
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (coinQty <= 0) {
      setErrorMsg("Please specify a valid trade amount.");
      return;
    }

    // Balance validations
    if (side === 'buy') {
      if (marginRequired > usdtBalance) {
        setErrorMsg(`Insufficient USDT balance. Required: $${marginRequired.toFixed(2)}, Available: $${usdtBalance.toFixed(2)}`);
        return;
      }
    } else {
      // Spot Sell requires having the coin
      if (tradingMode === 'spot' && coinQty > assetBalance) {
        setErrorMsg(`Insufficient ${selectedAsset} balance. Required: ${coinQty.toFixed(4)}, Available: ${assetBalance.toFixed(4)}`);
        return;
      }
      // Futures Short requires margin too
      if (tradingMode === 'futures' && marginRequired > usdtBalance) {
        setErrorMsg(`Insufficient USDT balance for short margin. Required: $${marginRequired.toFixed(2)}, Available: $${usdtBalance.toFixed(2)}`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Execute manual trade trigger
      const result = await placeManualTrade(
        symbol,
        side,
        enableTPSL ? stopLossPercentNum : undefined,
        enableTPSL ? takeProfitPercentNum : undefined,
        coinQty,
        tradingMode === 'futures' ? leverage : 1,
        orderType,
        orderType === 'limit' ? priceNum : undefined
      );

      setSuccessMsg(`🚀 Manual Order successfully executed! Created order of ${coinQty.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${selectedAsset} at $${priceNum.toLocaleString()}.`);
      setAmountInput('');
    } catch (err: any) {
      console.error("Manual order failure:", err);
      setErrorMsg(err?.message || "Internal gateway rejection. Check API configuration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Color theme selectors based on Trade side
  const accentBorderColor = side === 'buy' ? 'focus-within:border-emerald-500/55 focus-within:ring-emerald-500/10' : 'focus-within:border-rose-500/55 focus-within:ring-rose-500/10';
  const accentButtonColor = side === 'buy' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20 text-white animate-fade-in' : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20 text-white animate-fade-in';

  return (
    <div className="flex flex-col space-y-5">
      {/* Coin Selector Panel */}
      <div className="grid grid-cols-4 gap-2">
        {assets.map((coin) => {
          const coinSym = `${coin}/USDT`;
          const coinPrice = simulatedPrices[coinSym] || 0;
          const isActive = selectedAsset === coin;
          return (
            <button
              key={coin}
              type="button"
              onClick={() => {
                setSelectedAsset(coin);
                if (onSelectedSymbolChange) {
                  onSelectedSymbolChange(coin + '/USDT');
                }
              }}
              className={cn(
                "flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all duration-200 outline-none",
                isActive 
                  ? (theme === 'light' ? "bg-zinc-900 border-zinc-900 shadow-md text-white scale-[1.03]" : "bg-white/10 border-white/20 shadow-lg scale-[1.03] text-white") 
                  : (theme === 'light' ? "bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200/50" : "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/7 hover:border-white/10")
              )}
            >
              <span className="text-xs font-black tracking-wider">{coin}</span>
              <span className={cn("text-[9px] font-mono mt-0.5 font-semibold", isActive ? (theme === 'light' ? "text-zinc-300" : "text-zinc-400") : "text-zinc-500")}>
                ${coinPrice > 0 ? coinPrice.toLocaleString() : '---'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Trading Mode Select Button (Spot vs Futures) */}
      <div className="space-y-1.5 animate-fade-in">
        <div className="flex items-center justify-between px-1">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Manual Order Type Mode</label>
          <span className={cn(
            "text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-md",
            tradingMode === 'futures' ? "bg-yellow-500/10 text-yellow-500" : "bg-emerald-500/10 text-emerald-400"
          )}>
            Active: {tradingMode}
          </span>
        </div>
        <div className={cn("grid grid-cols-2 gap-2 p-1 rounded-2xl border", theme === 'light' ? "bg-zinc-100 border-zinc-250/70" : "bg-white/5 border border-white/5")}>
          <button
            type="button"
            onClick={() => {
              if (setTradingType) {
                setTradingType('spot');
              }
            }}
            className={cn(
              "py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer",
              tradingMode === 'spot'
                ? (theme === 'light' ? "bg-zinc-900 border-zinc-900 shadow-md text-white font-bold" : "bg-white text-zinc-950 shadow-lg font-black")
                : (theme === 'light' ? "text-zinc-600 hover:text-zinc-900" : "text-zinc-450 hover:text-white hover:bg-white/5")
            )}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Spot Mode
          </button>
          
          <button
            type="button"
            onClick={() => {
              if (setTradingType) {
                setTradingType('futures');
              }
            }}
            className={cn(
              "py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer",
              tradingMode === 'futures'
                ? (theme === 'light' ? "bg-yellow-500 text-black shadow-md font-bold" : "bg-yellow-500 text-black shadow-lg font-black")
                : (theme === 'light' ? "text-zinc-600 hover:text-zinc-900" : "text-zinc-450 hover:text-white hover:bg-white/5")
            )}
          >
            <Zap className="w-3.5 h-3.5 fill-current text-current" />
            Futures Mode
          </button>
        </div>
      </div>

      {/* Side Selectors Buy vs Sell */}
      <div className={cn("grid grid-cols-2 gap-2 p-1 rounded-2xl border", theme === 'light' ? "bg-zinc-100 border-zinc-250/70" : "bg-white/5 border border-white/5")}>
        <button
          type="button"
          onClick={() => setSide('buy')}
          className={cn(
            "py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5",
            side === 'buy' 
              ? (theme === 'light' ? "bg-emerald-600 text-white shadow-sm border border-emerald-500/10 font-bold" : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25") 
              : (theme === 'light' ? "text-zinc-600 hover:text-zinc-900" : "text-zinc-500 hover:text-zinc-300")
          )}
        >
          <ArrowUpRight className="w-4 h-4" />
          {tradingMode === 'futures' ? 'Buy / Long' : 'Spot Buy'}
        </button>
        <button
          type="button"
          onClick={() => setSide('sell')}
          className={cn(
            "py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5",
            side === 'sell' 
              ? (theme === 'light' ? "bg-rose-600 text-white shadow-sm border border-rose-500/10 font-bold" : "bg-rose-500/15 text-rose-400 border border-rose-500/25") 
              : (theme === 'light' ? "text-zinc-600 hover:text-zinc-900" : "text-zinc-500 hover:text-zinc-300")
          )}
        >
          <ArrowDownRight className="w-4 h-4" />
          {tradingMode === 'futures' ? 'Sell / Short' : 'Spot Sell'}
        </button>
      </div>

      <form onSubmit={handleSubmitOrder} className="space-y-4">
        {/* Order Type Toggle */}
        <div className={cn("flex justify-between items-center p-1 rounded-2xl border animate-fade-in", theme === 'light' ? "bg-zinc-100 border-zinc-200" : "bg-white/5 border border-white/5")}>
          <button
            type="button"
            onClick={() => setOrderType('market')}
            className={cn(
              "flex-1 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-widest transition-all border",
              orderType === 'market' 
                ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 font-black shadow-[0_2px_10px_-3px_rgba(6,182,212,0.25)]" 
                : (theme === 'light' ? "border-transparent text-zinc-500 hover:text-zinc-800" : "border-transparent text-zinc-500 hover:text-zinc-300")
            )}
          >
            Market Order ⚡
          </button>
          <button
            type="button"
            onClick={() => setOrderType('limit')}
            className={cn(
              "flex-1 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-widest transition-all border",
              orderType === 'limit' 
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400 font-black shadow-[0_2px_10px_-3px_rgba(245,158,11,0.25)]" 
                : (theme === 'light' ? "border-transparent text-zinc-500 hover:text-zinc-800" : "border-transparent text-zinc-500 hover:text-zinc-300")
            )}
          >
            Limit Order ⏳
          </button>
        </div>

        {/* Limit Price Input if type is Limit */}
        <AnimatePresence>
          {orderType === 'limit' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-1.5 overflow-hidden"
            >
              <label className={cn("text-[10px] font-bold uppercase tracking-wider block", theme === 'light' ? "text-zinc-600" : "text-zinc-500")}>Limit Price (USDT)</label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  required
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  className={cn(
                    "w-full rounded-2xl p-4 text-xs font-bold tabular-nums pr-12 focus:outline-none focus:ring-1 transition-all transition-colors",
                    theme === 'light' 
                      ? "bg-zinc-100 border border-zinc-200 text-zinc-900 focus:border-zinc-400 focus:ring-zinc-300"
                      : "bg-white/5 border border-white/5 focus:border-amber-500/40 focus:ring-amber-500/10 text-white"
                  )}
                  placeholder="0.00"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-mono font-black text-amber-500/60">USDT</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Amount Section */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className={cn("text-[10px] font-bold uppercase tracking-wider block", theme === 'light' ? "text-zinc-600" : "text-zinc-500")}>Order Amount</label>
            <button
              type="button"
              onClick={() => setAmountType(amountType === 'coin' ? 'usdt' : 'coin')}
              className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors"
            >
              <Coins className="w-3.5 h-3.5" />
              Switch to {amountType === 'coin' ? 'USDT' : selectedAsset}
            </button>
          </div>

          <div className={cn(
            "relative flex rounded-2xl items-center p-2.5 transition-all duration-200 border", 
            accentBorderColor, 
            theme === 'light' ? "bg-zinc-100 border-zinc-200" : "bg-white/5 border border-white/5"
          )}>
            <input
              type="number"
              step="any"
              required
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className={cn(
                "flex-1 bg-transparent border-0 focus:ring-0 focus:outline-none p-2 font-bold font-mono tabular-nums text-sm outline-none",
                theme === 'light' ? "text-zinc-900" : "text-white"
              )}
              placeholder={`0.00 (${amountType === 'coin' ? selectedAsset : 'USDT'})`}
            />
            <span className={cn("px-3 py-1.5 rounded-xl text-[10px] font-black uppercase select-none font-mono border",
              theme === 'light' ? "bg-white border-zinc-200 text-zinc-700" : "bg-white/5 border border-white/5 text-zinc-300"
            )}>
              {amountType === 'coin' ? selectedAsset : 'USDT'}
            </span>
          </div>

          {/* Quick Percent Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {[0.25, 0.50, 0.75, 1.0].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => applyPercent(pct)}
                className={cn(
                  "py-1.5 rounded-xl text-[10px] font-black tracking-widest transition-all duration-200 border",
                  theme === 'light' 
                    ? "bg-zinc-100 border-zinc-200 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-950 font-bold" 
                    : "bg-white/5 border border-white/5 text-zinc-400 hover:bg-white/10 hover:border-white/20 hover:text-white"
                )}
              >
                {pct * 100}%
              </button>
            ))}
          </div>

          {/* Wallet Balance Info */}
          <div className={cn("flex justify-between items-center px-2 py-1.5 rounded-xl text-[10px] font-semibold font-mono border",
            theme === 'light' ? "bg-zinc-50 border-zinc-200 text-zinc-600" : "bg-white/[0.02] border border-white/5 text-zinc-400"
          )}>
            <span className="flex items-center gap-1 text-zinc-500">
              <Wallet className="w-3 h-3 text-zinc-500" />
              SPOT Balance:
            </span>
            <span className={cn("font-bold", theme === 'light' ? "text-zinc-800" : "text-zinc-300")}>
              {side === 'buy' 
                ? `$${usdtBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`
                : `${assetBalance.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })} ${selectedAsset}`
              }
            </span>
          </div>
        </div>

        {/* Leverage slider - only if Futures Mode */}
        {tradingMode === 'futures' && (
          <div className={cn("space-y-2 p-4 rounded-2xl relative overflow-hidden border",
            theme === 'light' ? "bg-zinc-50 border-zinc-200" : "bg-white/5 border border-white/5"
          )}>
            <div className="flex justify-between items-center">
              <span className={cn("text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5", theme === 'light' ? "text-zinc-600" : "text-zinc-400")}>
                <Sliders className="w-3.5 h-3.5 text-zinc-500" />
                Leverage Multiplier
              </span>
              <span className={cn("text-xs font-black font-mono px-2 py-0.5 rounded-lg", 
                leverage > 50 ? "bg-rose-500/10 text-rose-500" : leverage > 20 ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-550"
              )}>
                {leverage}x
              </span>
            </div>
            
            <input
              type="range"
              min="1"
              max="100"
              value={leverage}
              onChange={(e) => setLeverage(parseInt(e.target.value))}
              className={cn("w-full h-1 rounded-lg appearance-none cursor-pointer outline-none",
                theme === 'light' ? "accent-zinc-800 bg-zinc-200" : "accent-white bg-white/10"
              )}
            />
            
            <div className="flex justify-between text-[8px] font-bold text-zinc-500 font-mono">
              <span>1x (SAFE)</span>
              <span>50x (MEDIUM)</span>
              <span>100x (HIGH RISK)</span>
            </div>

            {leverage > 50 && (
              <div className="flex items-center gap-1.5 text-[9px] font-bold text-rose-500 mt-1 animate-pulse">
                <ShieldAlert className="w-3.5 h-3.5" />
                WARNING: Excessive liquidation risk at current leverage level!
              </div>
            )}
          </div>
        )}

        {/* Take Profit & Stop Loss Switched Inputs */}
        <div className={cn("space-y-3 p-4 rounded-2xl border", theme === 'light' ? "bg-zinc-50 border-zinc-200/80" : "bg-white/5 border border-white/5")}>
          <label className="flex items-center justify-between cursor-pointer select-none">
            <span className={cn("text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5", theme === 'light' ? "text-zinc-600" : "text-zinc-400")}>
              <TrendingUp className="w-3.5 h-3.5 text-zinc-500" />
              Take Profit / Stop Loss
            </span>
            <div className="relative">
              <input 
                type="checkbox" 
                checked={enableTPSL} 
                onChange={(e) => setEnableTPSL(e.target.checked)}
                className="sr-only" 
              />
              <div className={cn("w-8 h-4.5 rounded-full transition-colors", enableTPSL ? "bg-emerald-500" : (theme === 'light' ? "bg-zinc-250" : "bg-white/10"))} />
              <div className={cn("absolute top-0.5 left-0.5 bg-white w-3.5 h-3.5 rounded-full transition-transform", enableTPSL && "translate-x-3.5")} />
            </div>
          </label>

          <AnimatePresence>
            {enableTPSL && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={cn("space-y-3 pt-2 border-t overflow-hidden", theme === 'light' ? "border-zinc-200" : "border-white/5")}
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <span className={cn("text-[9px] font-bold uppercase tracking-wide block", theme === 'light' ? "text-zinc-600" : "text-zinc-500")}>Stop Loss (%)</span>
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      required
                      value={stopLossPercent}
                      onChange={(e) => setStopLossPercent(e.target.value)}
                      className={cn(
                        "w-full rounded-xl p-3 text-xs font-bold tabular-nums border focus:outline-none focus:ring-1 focus:ring-rose-500/10",
                        theme === 'light' 
                          ? "bg-white border-zinc-200 text-zinc-900 focus:border-rose-500/30" 
                          : "bg-white/5 border border-white/5 text-white focus:border-rose-500/30"
                      )}
                      placeholder="SL %"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <span className={cn("text-[9px] font-bold uppercase tracking-wide block", theme === 'light' ? "text-zinc-600" : "text-zinc-500")}>Take Profit (%)</span>
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      required
                      value={takeProfitPercent}
                      onChange={(e) => setTakeProfitPercent(e.target.value)}
                      className={cn(
                        "w-full rounded-xl p-3 text-xs font-bold tabular-nums border focus:outline-none focus:ring-1 focus:ring-emerald-500/10",
                        theme === 'light' 
                          ? "bg-white border-zinc-200 text-zinc-900 focus:border-emerald-500/30" 
                          : "bg-white/5 border border-white/5 text-white focus:border-emerald-500/30"
                      )}
                      placeholder="TP %"
                    />
                  </div>
                </div>

                <div className={cn("text-[9px] space-y-1 p-2.5 rounded-xl border font-mono",
                  theme === 'light' ? "bg-zinc-100/50 border-zinc-200/80 text-zinc-600" : "bg-black/20 border-white/5 text-zinc-500"
                )}>
                  <div className="flex justify-between">
                    <span>Est. STOP LOSS Price:</span>
                    <span className={cn("font-bold", theme === 'light' ? "text-zinc-900" : "text-zinc-300")}>${slTriggerPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Est. TAKE PROFIT Price:</span>
                    <span className={cn("font-bold", theme === 'light' ? "text-zinc-900" : "text-zinc-300")}>${tpTriggerPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Dynamic Trade Projections Info Summary */}
        <div className={cn("p-4 rounded-2xl text-xs space-y-2.5 font-mono border",
          theme === 'light' ? "bg-zinc-50 border-zinc-200 text-zinc-700" : "bg-zinc-950/60 border border-white/5 text-zinc-400"
        )}>
          <div className={cn("flex justify-between items-center text-[10px] pb-2 border-b", theme === 'light' ? "border-zinc-200" : "border-white/5")}>
            <span className={cn("font-bold uppercase", theme === 'light' ? "text-zinc-600" : "text-zinc-500")}>Transaction Summary</span>
            <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase border", 
              isSandbox 
                ? (theme === 'light' ? "bg-emerald-500/5 text-emerald-700 border-emerald-500/10" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20") 
                : (theme === 'light' ? "bg-indigo-50 text-indigo-700 border-indigo-500/10" : "bg-blue-500/10 text-blue-400 border border-blue-500/20")
            )}>
              {isSandbox ? 'Sandbox Simulation' : `${activeExchange} Live`}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-zinc-500">Position Size:</span>
            <span className={cn("font-bold", theme === 'light' ? "text-zinc-950" : "text-white")}>{coinQty.toLocaleString(undefined, { maximumFractionDigits: 6 })} {selectedAsset}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-zinc-500">Notional/Order Value:</span>
            <span className={cn("font-bold", theme === 'light' ? "text-zinc-950" : "text-white")}>${totalCostUsdt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</span>
          </div>

          {tradingMode === 'futures' ? (
            <>
              <div className="flex justify-between text-indigo-600 dark:text-indigo-400">
                <span className={theme === 'light' ? "text-indigo-650" : "text-indigo-400/75"}>Required Margin ({leverage}x):</span>
                <span className="font-bold">${marginRequired.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</span>
              </div>
              <div className={cn("flex justify-between border-t pt-2 text-rose-500 dark:text-rose-450", theme === 'light' ? "border-zinc-200" : "border-white/5")}>
                <span>Est. Liquidation Price:</span>
                <span className="font-bold">${liquidationPriceEstimate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
              <span className={theme === 'light' ? "text-emerald-700" : "text-emerald-400/75"}>Required Capital:</span>
              <span className="font-black">${totalCostUsdt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</span>
            </div>
          )}
        </div>

        {/* Error / Success Alerts */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-4 bg-rose-500/10 border border-rose-500/25 rounded-2xl flex items-start gap-2.5 text-xs text-rose-500 dark:text-rose-400"
            >
              <ShieldAlert className="w-5 h-5 flex-shrink-0 animate-bounce" />
              <div>
                <p className="font-black uppercase tracking-wide">Order Failed</p>
                <p className="mt-0.5 text-[11px] leading-relaxed select-all">{errorMsg}</p>
              </div>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-655 dark:text-emerald-400"
            >
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-black uppercase tracking-wide">Placed Order</p>
                <p className="mt-0.5 text-[11px] leading-relaxed">{successMsg}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Place Order Trigger Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "w-full p-4 rounded-2xl font-black uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50",
            accentButtonColor
          )}
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Transmitting Order...</span>
            </>
          ) : (
            <>
              <span>Execute {side === 'buy' ? (tradingMode === 'futures' ? 'BUY / LONG' : 'SPOT BUY') : (tradingMode === 'futures' ? 'SELL / SHORT' : 'SPOT SELL')}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
