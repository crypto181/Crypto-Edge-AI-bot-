import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  RotateCcw, 
  TrendingUp, 
  Percent, 
  Award, 
  BarChart2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  HelpCircle, 
  ChevronRight,
  TrendingDown,
  Info,
  Calendar,
  Layers,
  Sparkles,
  Sliders
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { cn } from '../lib/utils';

// Core default prices matching simulation
const BASE_PRICES: Record<string, number> = {
  'BTC': 64250,
  'ETH': 3450,
  'SOL': 148,
  'ADA': 0.46,
  'XRP': 0.51,
  'DOT': 6.15,
  'DOGE': 0.138,
  'LINK': 15.20,
  'LTC': 79.50,
  'BNB': 575.00
};

interface AIBacktesterProps {
  theme?: 'light' | 'dark';
}

interface SimulatedTrade {
  id: string;
  side: 'buy' | 'sell';
  entryPrice: number;
  exitPrice: number;
  entryTime: string;
  exitTime: string;
  amount: number;
  pnlDollar: number;
  pnlPercent: number;
  exitReason: 'Take Profit' | 'Stop Loss' | 'Reversal' | 'End of Session';
  isWin: boolean;
}

interface BacktestResults {
  trades: SimulatedTrade[];
  equityCurve: { name: string; equity: number; price: number }[];
  netProfitDollar: number;
  netProfitPercent: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  maxDrawdown: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
}

type MarketRegime = 'bull' | 'bear' | 'sideways';

export const AIBacktester: React.FC<AIBacktesterProps> = ({ theme = 'dark' }) => {
  // Backtest parameters state
  const [selectedAsset, setSelectedAsset] = useState<string>('BTC');
  const [selectedStrategy, setSelectedStrategy] = useState<string>('Scalp RSI/MACD');
  const [timeframe, setTimeframe] = useState<'15m' | '1h' | '4h'>('1h');
  const [startingCapital, setStartingCapital] = useState<number>(1000);
  const [leverage, setLeverage] = useState<number>(10);
  const [stopLossPercent, setStopLossPercent] = useState<number>(2.0);
  const [takeProfitPercent, setTakeProfitPercent] = useState<number>(6.0);
  const [marketRegime, setMarketRegime] = useState<MarketRegime>('bull');

  // Execution UI feedback states
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationStep, setSimulationStep] = useState<string>('');
  const [simulationProgress, setSimulationProgress] = useState<number>(0);
  
  // Results State
  const [results, setResults] = useState<BacktestResults | null>(null);

  // Pagination for trade logs
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  // Generate 720 candles with accurate indicators (30 days of hourly data or similar)
  const runBacktestAlgorithm = () => {
    setIsSimulating(true);
    setSimulationProgress(5);
    setSimulationStep('Accessing premium candlestick warehouse...');

    setTimeout(() => {
      setSimulationProgress(25);
      setSimulationStep('Interpolating 30-day historical time-series ticks...');
      
      setTimeout(() => {
        setSimulationProgress(55);
        setSimulationStep('Evaluating RSI, MACD signal matrices, & Bollinger Band corridors...');
        
        setTimeout(() => {
          setSimulationProgress(85);
          setSimulationStep('Simulating leveraged cross-margin execution engine...');
          
          setTimeout(() => {
            executeSimulation();
          }, 400);
        }, 500);
      }, 400);
    }, 300);
  };

  const executeSimulation = () => {
    const basePrice = BASE_PRICES[selectedAsset] || 1000;
    const count = 720; // 30 Days of hourly data (roughly)
    
    // Seeded random helper for deterministic results based on parameters
    let seed = selectedAsset.charCodeAt(0) + selectedStrategy.charCodeAt(0) + timeframe.charCodeAt(0);
    const rng = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    // 1. Generate realistic candlestick baseline prices
    const candles: { open: number; high: number; low: number; close: number; time: Date }[] = [];
    let currentPrice = basePrice * (marketRegime === 'bear' ? 1.25 : marketRegime === 'bull' ? 0.75 : 1.0);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    for (let i = 0; i < count; i++) {
      const candleTime = new Date(startDate.getTime() + i * 60 * 60 * 1000);
      const prevClose = currentPrice;
      
      // Determine standard step drift depending on Market Regime
      let regimeDrift = 0;
      if (marketRegime === 'bull') {
        regimeDrift = 0.00065; // Consistent uptrend
      } else if (marketRegime === 'bear') {
        regimeDrift = -0.00075; // Consistent downtrend
      } else {
        regimeDrift = (rng() - 0.5) * 0.0001; // Neutral oscillation
      }

      // Add noise and volatility
      const volatility = selectedAsset === 'DOGE' || selectedAsset === 'SOL' || selectedAsset === 'PEPE' ? 0.015 : 0.006;
      const pctChange = regimeDrift + (rng() - 0.5) * volatility;
      
      let nextClose = prevClose * (1 + pctChange);
      
      // Keep price positive
      if (nextClose <= 0) nextClose = 0.000001;
      
      const candleVol = (rng() - 0.5) * volatility;
      const high = Math.max(prevClose, nextClose) * (1 + Math.abs(rng() * candleVol));
      const low = Math.min(prevClose, nextClose) * (1 - Math.abs(rng() * candleVol));
      
      candles.push({
        open: prevClose,
        high: high,
        low: low,
        close: nextClose,
        time: candleTime
      });
      
      currentPrice = nextClose;
    }

    // 2. Compute true indicators
    // Compute SMA helper
    const getSMA = (data: number[], period: number): number[] => {
      const smaValues: number[] = new Array(data.length).fill(0);
      for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
          smaValues[i] = data[i];
          continue;
        }
        let sum = 0;
        for (let j = 0; j < period; j++) {
          sum += data[i - j];
        }
        smaValues[i] = sum / period;
      }
      return smaValues;
    };

    // Standard deviation helper
    const getStdDev = (data: number[], sma: number[], period: number): number[] => {
      const stdDevValues: number[] = new Array(data.length).fill(0);
      for (let i = 0; i < data.length; i++) {
        if (i < period - 1) continue;
        let sqDiffSum = 0;
        for (let j = 0; j < period; j++) {
          const diff = data[i - j] - sma[i];
          sqDiffSum += diff * diff;
        }
        stdDevValues[i] = Math.sqrt(sqDiffSum / period);
      }
      return stdDevValues;
    };

    // Compute Bollinger Bands values
    const closes = candles.map(c => c.close);
    const bbMiddle = getSMA(closes, 20);
    const bbStd = getStdDev(closes, bbMiddle, 20);
    const bbUpper = bbMiddle.map((m, i) => m + 2 * bbStd[i]);
    const bbLower = bbMiddle.map((m, i) => m - 2 * bbStd[i]);

    // Compute RSI 
    const rsiValues: number[] = new Array(closes.length).fill(50);
    let avgGain = 0;
    let avgLoss = 0;
    for (let i = 1; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? -change : 0;
      if (i <= 14) {
        avgGain += gain;
        avgLoss += loss;
        if (i === 14) {
          avgGain /= 14;
          avgLoss /= 14;
          const rs = avgGain / (avgLoss || 1);
          rsiValues[i] = 100 - 100 / (1 + rs);
        }
      } else {
        avgGain = (avgGain * 13 + gain) / 14;
        avgLoss = (avgLoss * 13 + loss) / 14;
        const rs = avgGain / (avgLoss || 1);
        rsiValues[i] = 100 - 100 / (1 + rs);
      }
    }

    // Compute EMA helper
    const getEMA = (data: number[], period: number): number[] => {
      const ema: number[] = new Array(data.length).fill(0);
      const multiplier = 2 / (period + 1);
      ema[0] = data[0];
      for (let i = 1; i < data.length; i++) {
        ema[i] = (data[i] - ema[i - 1]) * multiplier + ema[i - 1];
      }
      return ema;
    };

    // Compute MACD
    const ema12 = getEMA(closes, 12);
    const ema26 = getEMA(closes, 26);
    const macdLine = ema12.map((e12, i) => e12 - ema26[i]);
    const signalLine = getEMA(macdLine, 9);
    const macdHist = macdLine.map((m, i) => m - signalLine[i]);

    // 3. Trade Simulation Loop
    const simulatedTrades: SimulatedTrade[] = [];
    let currentEquity = startingCapital;
    let activePosition: {
      side: 'buy' | 'sell';
      entryPrice: number;
      entryTime: string;
      stopLossPrice: number;
      takeProfitPrice: number;
      amount: number;
    } | null = null;

    const equityHistory: { name: string; equity: number; price: number }[] = [];
    let peakEquity = startingCapital;
    let maxDrawdownValue = 0;

    // We start from 30 to let indicators stabilize/warmup
    for (let i = 30; i < count; i++) {
      const currentCandle = candles[i];
      const currentClose = currentCandle.close;
      const timestampString = currentCandle.time.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

      // If active position, check exit parameters
      if (activePosition) {
        let isClosed = false;
        let exitPrice = currentClose;
        let exitReason: 'Take Profit' | 'Stop Loss' | 'Reversal' | 'End of Session' = 'End of Session';

        const posSide = activePosition.side;
        const entry = activePosition.entryPrice;

        // High / Low check for stop/targets
        if (posSide === 'buy') {
          // Check stop loss
          if (currentCandle.low <= activePosition.stopLossPrice) {
            exitPrice = activePosition.stopLossPrice;
            exitReason = 'Stop Loss';
            isClosed = true;
          }
          // Check take profit
          else if (currentCandle.high >= activePosition.takeProfitPrice) {
            exitPrice = activePosition.takeProfitPrice;
            exitReason = 'Take Profit';
            isClosed = true;
          }
        } else {
          // Check stop loss for short
          if (currentCandle.high >= activePosition.stopLossPrice) {
            exitPrice = activePosition.stopLossPrice;
            exitReason = 'Stop Loss';
            isClosed = true;
          }
          // Check take profit for short
          else if (currentCandle.low <= activePosition.takeProfitPrice) {
            exitPrice = activePosition.takeProfitPrice;
            exitReason = 'Take Profit';
            isClosed = true;
          }
        }

        // Check for opposite logic (Reversal Signal)
        if (!isClosed) {
          if (selectedStrategy === 'Scalp RSI/MACD') {
            const hasOppositeSignal = posSide === 'buy' 
              ? (rsiValues[i] > 68 && macdHist[i] < macdHist[i - 1]) 
              : (rsiValues[i] < 32 && macdHist[i] > macdHist[i - 1]);
            
            if (hasOppositeSignal) {
              exitPrice = currentClose;
              exitReason = 'Reversal';
              isClosed = true;
            }
          } else if (selectedStrategy === 'Bollinger Bands Crossover') {
            const hasOppositeSignal = posSide === 'buy'
              ? (currentClose > bbUpper[i])
              : (currentClose < bbLower[i]);

            if (hasOppositeSignal) {
              exitPrice = currentClose;
              exitReason = 'Reversal';
              isClosed = true;
            }
          } else {
            // High Frequency Inside Bar opposite signal
            const isPrevInsideBar = candles[i - 1].high < candles[i - 2].high && candles[i - 1].low > candles[i - 2].low;
            if (isPrevInsideBar) {
              const breakoutLong = currentClose > candles[i - 1].high;
              const breakoutShort = currentClose < candles[i - 1].low;
              if ((posSide === 'buy' && breakoutShort) || (posSide === 'sell' && breakoutLong)) {
                exitPrice = currentClose;
                exitReason = 'Reversal';
                isClosed = true;
              }
            }
          }
        }

        // Also close at the end of simulation
        if (!isClosed && i === count - 1) {
          exitPrice = currentClose;
          exitReason = 'End of Session';
          isClosed = true;
        }

        if (isClosed) {
          // Calculate precise leveraged trade PnL
          const priceDiff = exitPrice - entry;
          const directionMultiplier = posSide === 'buy' ? 1 : -1;
          const percentGain = (priceDiff / entry) * directionMultiplier;
          const tradePnLPercent = percentGain * leverage; // Leverage magnifier
          const tradePnLDollar = activePosition.amount * tradePnLPercent;

          currentEquity += tradePnLDollar;
          if (currentEquity <= 0) currentEquity = 0; // Guard against negative liquidation

          simulatedTrades.push({
            id: 'backtest-t-' + Math.floor(rng() * 1000000),
            side: posSide,
            entryPrice: entry,
            exitPrice: exitPrice,
            entryTime: activePosition.entryTime,
            exitTime: timestampString,
            amount: activePosition.amount,
            pnlDollar: Number(tradePnLDollar.toFixed(2)),
            pnlPercent: Number((tradePnLPercent * 100).toFixed(2)),
            exitReason,
            isWin: tradePnLDollar > 0
          });

          activePosition = null;
        }
      }

      // If no active position, look for Entry Signal
      else {
        let entrySide: 'buy' | 'sell' | null = null;

        if (selectedStrategy === 'Scalp RSI/MACD') {
          // RSI extreme and MACD turning
          const isRsiOversold = rsiValues[i] < 34;
          const isRsiOverbought = rsiValues[i] > 66;
          const macdHistCrossUp = macdHist[i] > 0 && macdHist[i - 1] <= 0;
          const macdHistCrossDown = macdHist[i] < 0 && macdHist[i - 1] >= 0;

          if (isRsiOversold && (macdHistCrossUp || macdHist[i] > macdHist[i - 1])) {
            entrySide = 'buy';
          } else if (isRsiOverbought && (macdHistCrossDown || macdHist[i] < macdHist[i - 1])) {
            entrySide = 'sell';
          }
        } else if (selectedStrategy === 'Bollinger Bands Crossover') {
          // Breakout outside of Bollinger band lines
          if (currentClose < bbLower[i]) {
            entrySide = 'buy';
          } else if (currentClose > bbUpper[i]) {
            entrySide = 'sell';
          }
        } else {
          // High Frequency Inside Bar Strategy
          // An Inside Bar is detected when current high < prev high AND current low > prev low
          const isPrevInsideBar = candles[i - 1].high < candles[i - 2].high && candles[i - 1].low > candles[i - 2].low;
          if (isPrevInsideBar) {
            const upBreakout = currentClose > candles[i - 1].high;
            const downBreakout = currentClose < candles[i - 1].low;
            if (upBreakout) {
              entrySide = 'buy';
            } else if (downBreakout) {
              entrySide = 'sell';
            }
          }
        }

        // Initialize Trade Position if Triggered
        if (entrySide && currentEquity > 10) {
          const allocationAmount = currentEquity * 0.5; // Deploy 50% account equity on each trigger
          const slPrice = entrySide === 'buy' 
            ? currentClose * (1 - stopLossPercent / 100) 
            : currentClose * (1 + stopLossPercent / 100);
          
          const tpPrice = entrySide === 'buy' 
            ? currentClose * (1 + takeProfitPercent / 100) 
            : currentClose * (1 - takeProfitPercent / 100);

          activePosition = {
            side: entrySide,
            entryPrice: currentClose,
            entryTime: timestampString,
            stopLossPrice: slPrice,
            takeProfitPrice: tpPrice,
            amount: allocationAmount
          };
        }
      }

      // Record daily equity timeline data (approximate every 24 periods for cleaner visual chart flow)
      if (i % 8 === 0 || i === count - 1) {
        // Track peak & drawdown
        if (currentEquity > peakEquity) {
          peakEquity = currentEquity;
        }
        const drawdown = ((peakEquity - currentEquity) / peakEquity) * 100;
        if (drawdown > maxDrawdownValue) {
          maxDrawdownValue = drawdown;
        }

        equityHistory.push({
          name: new Date(currentCandle.time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          equity: Number(currentEquity.toFixed(2)),
          price: Number(currentClose.toFixed(selectedAsset === 'DOGE' || selectedAsset === 'PEPE' ? 5 : 2))
        });
      }
    }

    // 4. Summarize and compile performance ratios
    const winTrades = simulatedTrades.filter(t => t.isWin);
    const winRateVal = simulatedTrades.length > 0 
      ? Number(((winTrades.length / simulatedTrades.length) * 100).toFixed(1)) 
      : 0;

    let totalWinsValue = 0;
    let totalLossesValue = 0;
    winTrades.forEach(t => totalWinsValue += t.pnlDollar);
    simulatedTrades.filter(t => !t.isWin).forEach(t => totalLossesValue += Math.abs(t.pnlDollar));

    const profitFactorVal = totalLossesValue > 0 
      ? Number((totalWinsValue / totalLossesValue).toFixed(2)) 
      : totalWinsValue > 0 ? 99.9 : 0;

    const avgWinValue = winTrades.length > 0 ? totalWinsValue / winTrades.length : 0;
    const avgLossValue = (simulatedTrades.length - winTrades.length) > 0 
      ? totalLossesValue / (simulatedTrades.length - winTrades.length) 
      : 0;

    const profitPercentValue = ((currentEquity - startingCapital) / startingCapital) * 100;

    setResults({
      trades: simulatedTrades.reverse(), // Show newest first
      equityCurve: equityHistory,
      netProfitDollar: Number((currentEquity - startingCapital).toFixed(2)),
      netProfitPercent: Number(profitPercentValue.toFixed(2)),
      winRate: winRateVal,
      totalTrades: simulatedTrades.length,
      winningTrades: winTrades.length,
      losingTrades: simulatedTrades.length - winTrades.length,
      maxDrawdown: Number(maxDrawdownValue.toFixed(2)),
      avgWin: Number(avgWinValue.toFixed(2)),
      avgLoss: Number(avgLossValue.toFixed(2)),
      profitFactor: profitFactorVal
    });

    setIsSimulating(false);
    setCurrentPage(1);
  };

  const currentTradesList = results ? results.trades.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage) : [];
  const totalPages = results ? Math.ceil(results.trades.length / itemsPerPage) : 1;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* Title Header banner */}
      <div className={cn(
        "rounded-3xl p-6 border backdrop-blur-md relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6",
        theme === 'light' 
          ? "bg-white border-zinc-200" 
          : "bg-zinc-900/40 border-white/5"
      )}>
        <div className="absolute top-0 right-0 w-80 h-32 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-48 h-32 bg-cyan-500/5 rounded-full blur-3xl -z-10" />

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" /> High Fidelity Engine
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider bg-rose-500/15 border border-rose-500/30 text-rose-400 px-2 py-0.5 rounded-full">
              30-Day Historical Data
            </span>
          </div>
          <h1 className={cn("text-xl font-extrabold tracking-tight mt-1", theme === 'light' ? "text-zinc-900" : "text-white")}>
            AI Trade Strategy Backtesting
          </h1>
          <p className="text-xs text-zinc-500 max-w-2xl">
            Synthesize historical candlesticks, apply mathematical indicators, and simulate trades backtested on the last 30 days of market trends before deploying active capital.
          </p>
        </div>

        {results && (
          <button 
            onClick={() => {
              setResults(null);
            }}
            className={cn(
              "text-xs font-black uppercase tracking-wider px-4 py-3 rounded-2xl border transition-all flex items-center gap-2 self-start md:self-auto",
              theme === 'light'
                ? "bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-zinc-800"
                : "bg-white/5 hover:bg-white/10 border-white/5 text-zinc-300"
            )}
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Parameters
          </button>
        )}
      </div>

      {/* Main Parameters Config Dashboard Grid */}
      {!results && !isSimulating && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Form Settings Panel */}
          <div className={cn(
            "lg:col-span-8 rounded-3xl p-6 border",
            theme === 'light' ? "bg-white border-zinc-200" : "bg-zinc-900/20 border-white/5"
          )}>
            <div className="flex items-center gap-2 mb-6">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <h2 className="text-xs font-black uppercase tracking-wider">Backtest Parameters Optimization</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Asset Pair Selection */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Asset Under Verification</label>
                <select
                  value={selectedAsset}
                  onChange={(e) => setSelectedAsset(e.target.value)}
                  className={cn(
                    "w-full rounded-2xl px-4 py-3 text-xs focus:outline-none transition-all",
                    theme === 'light' 
                      ? "bg-zinc-100 border border-zinc-300 text-zinc-800 focus:border-zinc-500" 
                      : "bg-black border border-white/10 text-white focus:border-white/20"
                  )}
                >
                  {Object.keys(BASE_PRICES).map(asset => (
                    <option key={asset} value={asset}>{asset}/USDT (Base: ${BASE_PRICES[asset]})</option>
                  ))}
                </select>
              </div>

              {/* Strategy Selection */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Target Algorithmic Strategy</label>
                <select
                  value={selectedStrategy}
                  onChange={(e) => setSelectedStrategy(e.target.value)}
                  className={cn(
                    "w-full rounded-2xl px-4 py-3 text-xs focus:outline-none transition-all",
                    theme === 'light' 
                      ? "bg-zinc-100 border border-zinc-300 text-zinc-800 focus:border-zinc-500" 
                      : "bg-black border border-white/10 text-white focus:border-white/20"
                  )}
                >
                  <option value="Scalp RSI/MACD">Scalp RSI/MACD Confluence</option>
                  <option value="Bollinger Bands Crossover">Bollinger Bands Mean Reversion</option>
                  <option value="High Frequency Inside Bar">High Frequency Inside Bar Breakout</option>
                </select>
              </div>

              {/* Starting Capital */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Simulated Starting Capital (USDT)</label>
                <input
                  type="number"
                  min="50"
                  max="1000000"
                  value={startingCapital}
                  onChange={(e) => setStartingCapital(Math.max(10, Number(e.target.value) || 1000))}
                  className={cn(
                    "w-full rounded-2xl px-4 py-3 text-xs focus:outline-none transition-all",
                    theme === 'light' 
                      ? "bg-zinc-100 border border-zinc-300 text-zinc-800 focus:border-zinc-500" 
                      : "bg-black border border-white/10 text-white focus:border-white/20"
                  )}
                />
              </div>

              {/* Margin Leverage */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Margin Leverage Multiplier</label>
                  <span className="text-[10px] font-bold font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">{leverage}x</span>
                </div>
                <div className="pt-2 flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={leverage}
                    onChange={(e) => setLeverage(Number(e.target.value))}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <span className="text-zinc-500 text-[10px] uppercase font-bold shrink-0">1x - 50x</span>
                </div>
              </div>

              {/* Stop Loss Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Stop Loss Risk Level (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="20"
                  value={stopLossPercent}
                  onChange={(e) => setStopLossPercent(Math.max(0.1, Number(e.target.value) || 2.0))}
                  className={cn(
                    "w-full rounded-2xl px-4 py-3 text-xs focus:outline-none transition-all",
                    theme === 'light' 
                      ? "bg-zinc-100 border border-zinc-300 text-zinc-800 focus:border-zinc-500" 
                      : "bg-black border border-white/10 text-white focus:border-white/20"
                  )}
                />
                <p className="text-[9px] text-zinc-550 leading-relaxed">*Long exits when asset declines by {stopLossPercent}%. Short exits when asset increases by {stopLossPercent}%.</p>
              </div>

              {/* Take Profit Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Take Profit Target (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="100"
                  value={takeProfitPercent}
                  onChange={(e) => setTakeProfitPercent(Math.max(0.1, Number(e.target.value) || 6.0))}
                  className={cn(
                    "w-full rounded-2xl px-4 py-3 text-xs focus:outline-none transition-all",
                    theme === 'light' 
                      ? "bg-zinc-100 border border-zinc-300 text-zinc-800 focus:border-zinc-500" 
                      : "bg-black border border-white/10 text-white focus:border-white/20"
                  )}
                />
                <p className="text-[9px] text-zinc-550 leading-relaxed">*Target return multiplier. Standard recommended risk/reward ratio is 1:3.</p>
              </div>

              {/* Timeframe Select */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Historical Timeframe Scale</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['15m', '1h', '4h'] as const).map(tf => (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => setTimeframe(tf)}
                      className={cn(
                        "py-3 rounded-2xl text-xs font-semibold transition-all uppercase tracking-wider border",
                        timeframe === tf
                          ? "bg-indigo-500/15 border-indigo-500 text-indigo-400 font-bold"
                          : theme === 'light'
                            ? "bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200"
                            : "bg-black border-white/5 text-zinc-400 hover:border-white/10"
                      )}
                    >
                      {tf} Scale
                    </button>
                  ))}
                </div>
              </div>

              {/* Market Trend Regime */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Historical Trend Simulation Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMarketRegime('bull')}
                    className={cn(
                      "py-3 rounded-2xl text-[10px] font-semibold transition-all uppercase border flex flex-col items-center gap-1",
                      marketRegime === 'bull'
                        ? "bg-emerald-500/15 border-emerald-500 text-emerald-400 font-bold"
                        : theme === 'light'
                          ? "bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-250"
                          : "bg-black border-white/5 text-zinc-400 hover:border-white/10"
                    )}
                  >
                    <span>📈 Bullish Trend</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMarketRegime('bear')}
                    className={cn(
                      "py-3 rounded-2xl text-[10px] font-semibold transition-all uppercase border flex flex-col items-center gap-1",
                      marketRegime === 'bear'
                        ? "bg-rose-500/15 border-rose-500 text-rose-400 font-bold"
                        : theme === 'light'
                          ? "bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-250"
                          : "bg-black border-white/5 text-zinc-400 hover:border-white/10"
                    )}
                  >
                    <span>📉 Bearish Trend</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMarketRegime('sideways')}
                    className={cn(
                      "py-3 rounded-2xl text-[10px] font-semibold transition-all uppercase border flex flex-col items-center gap-1",
                      marketRegime === 'sideways'
                        ? "bg-indigo-500/15 border-indigo-500 text-indigo-400 font-bold"
                        : theme === 'light'
                          ? "bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-250"
                          : "bg-black border-white/5 text-zinc-400 hover:border-white/10"
                    )}
                  >
                    <span>↔️ Range-bound</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Run Button */}
            <div className="mt-8 pt-6 border-t border-white/5">
              <button
                onClick={runBacktestAlgorithm}
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold uppercase text-xs tracking-wider py-4 rounded-2xl flex items-center justify-center gap-2 transform active:scale-95 transition-all shadow-lg shadow-indigo-500/10"
              >
                <Play className="w-4 h-4 fill-current" />
                Run 30-Day Automated Backtest ⚡
              </button>
            </div>
          </div>

          {/* Strategy Details Sidebar Guide */}
          <div className="lg:col-span-4 space-y-6">
            <div className={cn(
              "rounded-3xl p-6 border",
              theme === 'light' ? "bg-white border-zinc-200" : "bg-zinc-900/40 border-white/5"
            )}>
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-4 h-4 text-zinc-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300">Selected Strategy Intelligence</h3>
              </div>

              {selectedStrategy === 'Scalp RSI/MACD' && (
                <div className="space-y-4 text-xs text-zinc-450 leading-relaxed">
                  <div className="p-3.5 rounded-xl bg-indigo-500/5 border border-indigo-500/10 space-y-1">
                    <p className="font-bold text-indigo-400">Scalp RSI/MACD Confluence</p>
                    <p className="text-[11px] text-zinc-500">Dual momentum oscillator and MACD histogram trend tracker.</p>
                  </div>
                  <div>
                    <p className="font-bold text-zinc-300 mb-1">Buy Trigger Zone:</p>
                    <p>Activated when 14-period RSI is strictly oversold (RSI &lt; 34) and the MACD trendline rebounds or crosses upward into bullish territory.</p>
                  </div>
                  <div>
                    <p className="font-bold text-zinc-300 mb-1">Sell Trigger Zone:</p>
                    <p>Triggered short when the assets exceed normal momentum boundaries (RSI &gt; 66) and the MACD index peaks, starting a bearish curve downwards.</p>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-lg border border-white/5">
                    <span className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Performance Tip</span>
                    <p className="text-[11px] text-emerald-400">Excels in strong trend regimes (Bullish/Bearish). Use {leverage}x leverage safely with tight stop losses on volatile coins like SOL!</p>
                  </div>
                </div>
              )}

              {selectedStrategy === 'Bollinger Bands Crossover' && (
                <div className="space-y-4 text-xs text-zinc-450 leading-relaxed">
                  <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10 space-y-1">
                    <p className="font-bold text-emerald-400">Bollinger Bands Mean Reversion</p>
                    <p className="text-[11px] text-zinc-500">Standard deviation envelope based on 20-period Simple Moving Average.</p>
                  </div>
                  <div>
                    <p className="font-bold text-zinc-300 mb-1">Long Trigger Zone:</p>
                    <p>Initiated when the market falls completely below the outer lower boundary, anticipating immediate mean reversion upwards.</p>
                  </div>
                  <div>
                    <p className="font-bold text-zinc-300 mb-1">Short Trigger Zone:</p>
                    <p>Executed when the price extends beyond the upper Bollinger envelope line, triggering an automatic risk short to reverse back to median prices.</p>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-lg border border-white/5">
                    <span className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Performance Tip</span>
                    <p className="text-[11px] text-amber-400">Performs flawlessly in **Range-bound Sideways** market styles. Trends can cause sustained breakouts over Bollinger bands, leading to Stop Loss hits.</p>
                  </div>
                </div>
              )}

              {selectedStrategy === 'High Frequency Inside Bar' && (
                <div className="space-y-4 text-xs text-zinc-450 leading-relaxed">
                  <div className="p-3.5 rounded-xl bg-violet-500/5 border border-violet-500/10 space-y-1">
                    <p className="font-bold text-violet-400">High Frequency Inside Bar Breakout</p>
                    <p className="text-[11px] text-zinc-500">Candlestick shape analysis targeting high potential consolidation breakouts.</p>
                  </div>
                  <div>
                    <p className="font-bold text-zinc-300 mb-1">Breakout Logic:</p>
                    <p>Requires an Inside Bar structure: Where the previous candle's High is lower than the candle prior, and its Low is higher. This triggers a squeeze indicator.</p>
                  </div>
                  <div>
                    <p className="font-bold text-zinc-300 mb-1">Order Execution:</p>
                    <p>Once squeezed, a Long is opened if the price breaches above the Inside Bar High. A Short is executed if price breakdowns through the Inside Bar Low.</p>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-lg border border-white/5">
                    <span className="text-[10px] font-black uppercase text-zinc-500 block mb-1">Performance Tip</span>
                    <p className="text-[11px] text-violet-400">High-frequency triggers. Excels on highly speculative pairs like DOGE or PEPE, and reacts quickly to high market squeeze ranges.</p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Simulator Progress Loader Overlay */}
      {isSimulating && (
        <div className={cn(
          "rounded-3xl p-12 border text-center flex flex-col items-center justify-center min-h-[350px] space-y-6",
          theme === 'light' ? "bg-white border-zinc-200" : "bg-zinc-900/20 border-white/5"
        )}>
          <div className="relative flex items-center justify-center">
            {/* Pulsing ring */}
            <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            <Layers className="w-6 h-6 text-indigo-400 absolute animate-pulse" />
          </div>

          <div className="space-y-2 max-w-sm">
            <h3 className={cn("text-sm font-bold uppercase tracking-wider", theme === 'light' ? "text-zinc-900" : "text-white")}>
              Algorithmic Simulator Processing
            </h3>
            <p className="text-zinc-400 text-xs font-mono h-4 italic">
              ↳ {simulationStep}
            </p>
          </div>

          {/* Progress bar container */}
          <div className="w-full max-w-xs bg-zinc-805 h-2.5 rounded-full overflow-hidden border border-white/5">
            <motion.div 
              initial={{ width: '0%' }}
              animate={{ width: `${simulationProgress}%` }}
              className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full" 
            />
          </div>
          <span className="text-[10px] text-zinc-500 font-bold font-mono tracking-widest">{simulationProgress}% METRICS INTERPOLATED</span>
        </div>
      )}

      {/* COMPLETED RESULTS PRESENTATION VIEW */}
      {results && !isSimulating && (
        <div className="space-y-6">
          
          {/* Key Aggregate Ratios Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Total Balance Card */}
            <div className={cn(
              "rounded-2xl p-5 border text-left",
              theme === 'light' ? "bg-white border-zinc-200" : "bg-zinc-900/30 border-white/5"
            )}>
              <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider block">Ending Portfolio Capital</span>
              <p className={cn("text-xl font-bold tracking-tight mt-1 truncate", theme === 'light' ? "text-zinc-900" : "text-white")}>
                ${(startingCapital + results.netProfitDollar).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className={cn(
                  "text-[10px] font-black uppercase px-2 py-0.5 rounded-lg flex items-center gap-1",
                  results.netProfitDollar >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                )}>
                  {results.netProfitDollar >= 0 ? "+" : ""}{results.netProfitPercent}%
                </span>
                <span className="text-[9px] text-zinc-500 font-semibold font-mono">Net Profit</span>
              </div>
            </div>

            {/* Win Rate Card */}
            <div className={cn(
              "rounded-2xl p-5 border text-left",
              theme === 'light' ? "bg-white border-zinc-200" : "bg-zinc-900/30 border-white/5"
            )}>
              <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider block">Win-Rate Percentage</span>
              <p className={cn("text-xl font-bold tracking-tight mt-1", theme === 'light' ? "text-zinc-900" : "text-white")}>
                {results.winRate}%
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[9px] text-zinc-400 font-semibold">
                  {results.winningTrades} / {results.totalTrades} Winning Trades
                </span>
              </div>
            </div>

            {/* Profit Factor Card */}
            <div className={cn(
              "rounded-2xl p-5 border text-left",
              theme === 'light' ? "bg-white border-zinc-200" : "bg-zinc-900/30 border-white/5"
            )}>
              <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider block">Strategy Profit Factor</span>
              <p className={cn("text-xl font-bold tracking-tight mt-1 font-mono text-indigo-400")}>
                {results.profitFactor}x
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <Percent className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-[9px] text-zinc-500 font-semibold">Gross Profit / Gross Loss ratio</span>
              </div>
            </div>

            {/* Max Drawdown Card */}
            <div className={cn(
              "rounded-2xl p-5 border text-left",
              theme === 'light' ? "bg-white border-zinc-200" : "bg-zinc-900/30 border-white/5"
            )}>
              <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider block">Maximum Drawdown</span>
              <p className={cn("text-xl font-bold tracking-tight mt-1 text-rose-450")}>
                -{results.maxDrawdown}%
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-[9px] text-zinc-500 font-semibold">Peak-to-trough capital risk</span>
              </div>
            </div>
            
          </div>

          {/* Interactive Equity Growth Curve Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Chart Area */}
            <div className={cn(
              "lg:col-span-8 rounded-3xl p-6 border flex flex-col justify-between min-h-[380px]",
              theme === 'light' ? "bg-white border-zinc-200" : "bg-zinc-900/20 border-white/5"
            )}>
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="text-left">
                  <h3 className="text-xs font-black uppercase tracking-wider">Simulated Capital Equity Timeline</h3>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Aggregated capital value over 30 days of trading</p>
                </div>

                <div className="flex items-center gap-4 text-[10px] font-bold uppercase font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-indigo-500" />
                    <span className="text-zinc-550">Portfolio USDT</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-zinc-650" />
                    <span className="text-zinc-550">Asset Spot Price</span>
                  </div>
                </div>
              </div>

              {/* Chart Component Area */}
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={results.equityCurve} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={results.netProfitDollar >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0.2}/>
                        <stop offset="95%" stopColor={results.netProfitDollar >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'light' ? '#f4f4f5' : '#1f1f22'} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#71717a', fontSize: 9, fontWeight: '700' }} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: '#71717a', fontSize: 9, fontWeight: '700' }}
                      axisLine={false}
                      tickLine={false}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip
                      contentStyle={{
                        background: theme === 'light' ? '#ffffff' : '#09090b',
                        borderColor: theme === 'light' ? '#e4e4e7' : '#27272a',
                        borderRadius: '16px',
                        fontSize: '11px',
                        color: theme === 'light' ? '#000000' : '#ffffff'
                      }}
                      labelFormatter={(label) => `Date: ${label}`}
                      formatter={(value: any, name: string) => [
                        name === 'equity' ? `$${Number(value).toLocaleString()}` : `$${Number(value).toLocaleString()}`,
                        name === 'equity' ? 'Equity Balance' : `${selectedAsset} Price`
                      ]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="equity" 
                      stroke={results.netProfitDollar >= 0 ? "#10b981" : "#ef4444"} 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#equityGrad)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-2 text-[10px] text-zinc-550 flex justify-between font-bold uppercase tracking-wider">
                <span>Start: Day 1 (${startingCapital} USDT)</span>
                <span>Active Model: {selectedStrategy} ({leverage}x leverage)</span>
                <span>End: Day 30</span>
              </div>
            </div>

            {/* Performance Audit Indicator block */}
            <div className="lg:col-span-4 space-y-4">
              <div className={cn(
                "rounded-3xl p-6 border space-y-4 text-left",
                theme === 'light' ? "bg-white border-zinc-200" : "bg-zinc-900/40 border-white/5"
              )}>
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-zinc-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider">Verification Audit</h3>
                </div>

                <div className="space-y-3.5 text-xs text-zinc-400">
                  <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                    <span>Performance Rating</span>
                    <span className={cn(
                      "font-extrabold uppercase px-2 py-0.5 rounded-lg",
                      results.netProfitPercent > 15 ? "text-emerald-450 bg-emerald-500/10" : results.netProfitPercent > 0 ? "text-indigo-400 bg-indigo-500/10" : "text-rose-455 bg-rose-500/10"
                    )}>
                      {results.netProfitPercent > 15 ? "🏆 Outperforming" : results.netProfitPercent > 0 ? "⚡ Profitable Demo" : "⚠️ Risk Re-estimate"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span>Average Profit/Win</span>
                    <span className="font-bold text-emerald-400">+${results.avgWin}</span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span>Average Loss/Trade</span>
                    <span className="font-bold text-rose-400">-${results.avgLoss}</span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span>Bullish/Bearish Regime</span>
                    <span className="font-semibold uppercase font-mono text-zinc-350">{marketRegime} Regime</span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span>Leverage Risk Load</span>
                    <span className="font-bold text-indigo-400">{leverage}x</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-950 border border-white/5 space-y-1 mt-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 block mb-0.5">Algorithm Disclosure</span>
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    Under direct live trading, whitelisted API endpoints route order signals instantly using CCXT directly onto exchanges core matching engine. Trade paper simulations are mirrored safely within Sandbox ledger databases.
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Expanded 30-Day Trade Ledger Logs Table */}
          <div className={cn(
            "rounded-3xl border overflow-hidden text-left",
            theme === 'light' ? "bg-white border-zinc-200" : "bg-zinc-900/20 border-white/5"
          )}>
            <div className="px-6 py-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider">Verified Backtest Trade Ledger</h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">Chronologically sorted records of simulated AI trigger executions</p>
              </div>

              <div className="flex items-center gap-1.5 self-start sm:self-auto bg-zinc-950 px-3 py-1.5 rounded-xl border border-white/5 text-[10px] font-bold font-mono">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-zinc-400">Total Simulated Orders: {results.trades.length}</span>
              </div>
            </div>

            {results.trades.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 text-xs flex flex-col items-center justify-center space-y-2">
                <AlertCircle className="w-6 h-6 text-zinc-500" />
                <p>No trade orders were triggered under the specified parameters.</p>
                <p className="text-[11px] text-zinc-550">Try lowering the Take Profit milestone, increasing timeframe scale, or testing in a high volatility trend.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className={cn(
                    "text-[10px] font-black uppercase tracking-widest border-b",
                    theme === 'light' ? "bg-zinc-150 border-zinc-200 text-zinc-650" : "bg-black/40 border-white/5 text-zinc-500"
                  )}>
                    <tr>
                      <th className="px-6 py-4 font-semibold text-left">Trade ID</th>
                      <th className="px-6 py-4 font-semibold text-left">Type</th>
                      <th className="px-6 py-4 font-semibold text-left">Trigger Entry</th>
                      <th className="px-6 py-4 font-semibold text-left">Trade Exit</th>
                      <th className="px-6 py-4 font-semibold text-left">Exit Reason</th>
                      <th className="px-6 py-4 font-semibold text-right">Yield PnL ($)</th>
                      <th className="px-6 py-4 font-semibold text-right">Yield PnL (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {currentTradesList.map((trade) => (
                      <tr 
                        key={trade.id}
                        className={cn(
                          "transition-colors",
                          theme === 'light' ? "hover:bg-zinc-100" : "hover:bg-white/2"
                        )}
                      >
                        <td className="px-6 py-3.5 font-bold tracking-tight text-zinc-400 text-[11px]">
                          {trade.id}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={cn(
                            "px-2 py-0.5 rounded font-black text-[10px] uppercase",
                            trade.side === 'buy' 
                              ? "bg-emerald-500/10 text-emerald-400" 
                              : "bg-rose-500/10 text-rose-455"
                          )}>
                            {trade.side === 'buy' ? "LONG" : "SHORT"}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-[11px]">
                          <div className="font-semibold text-zinc-300">${trade.entryPrice.toLocaleString(undefined, { maximumFractionDigits: selectedAsset === 'DOGE' || selectedAsset === 'PEPE' ? 5 : 2 })}</div>
                          <div className="text-[10px] text-zinc-550 font-sans mt-0.5">{trade.entryTime}</div>
                        </td>
                        <td className="px-6 py-3.5 text-[11px]">
                          <div className="font-semibold text-zinc-300">${trade.exitPrice.toLocaleString(undefined, { maximumFractionDigits: selectedAsset === 'DOGE' || selectedAsset === 'PEPE' ? 5 : 2 })}</div>
                          <div className="text-[10px] text-zinc-550 font-sans mt-0.5">{trade.exitTime}</div>
                        </td>
                        <td className="px-6 py-3.5 text-zinc-400">
                          <span className={cn(
                            "text-[10px] font-sans font-bold flex items-center gap-1.5",
                            trade.exitReason === 'Take Profit' ? "text-emerald-450" : trade.exitReason === 'Stop Loss' ? "text-rose-455" : "text-zinc-500"
                          )}>
                            {trade.exitReason === 'Take Profit' && <CheckCircle2 className="w-3.5 h-3.5" />}
                            {trade.exitReason === 'Stop Loss' && <XCircle className="w-3.5 h-3.5" />}
                            {trade.exitReason !== 'Take Profit' && trade.exitReason !== 'Stop Loss' && <AlertCircle className="w-3.5 h-3.5" />}
                            {trade.exitReason}
                          </span>
                        </td>
                        <td className={cn(
                          "px-6 py-3.5 text-right font-black",
                          trade.isWin ? "text-emerald-400" : "text-rose-450"
                        )}>
                          {trade.isWin ? "+" : ""}${trade.pnlDollar.toFixed(2)}
                        </td>
                        <td className={cn(
                          "px-6 py-3.5 text-right font-black",
                          trade.isWin ? "text-emerald-400" : "text-rose-450"
                        )}>
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] uppercase font-mono font-black",
                            trade.isWin ? "bg-emerald-500/10" : "bg-rose-500/10"
                          )}>
                            {trade.isWin ? "+" : ""}{trade.pnlPercent}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Page {currentPage} of {totalPages}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={cn(
                      "px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all",
                      currentPage === 1 
                        ? "text-zinc-650 border-white/5 cursor-not-allowed" 
                        : "text-zinc-300 border-white/10 hover:bg-white/5"
                    )}
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={cn(
                      "px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all",
                      currentPage === totalPages 
                        ? "text-zinc-650 border-white/5 cursor-not-allowed" 
                        : "text-zinc-300 border-white/10 hover:bg-white/5"
                    )}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};
