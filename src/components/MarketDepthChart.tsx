import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, BarChart, Bar } from 'recharts';
import { ArrowDownRight, ArrowUpRight, ShieldCheck, TrendingUp, Users, Activity, BarChart2 } from 'lucide-react';

interface MarketDepthChartProps {
  symbol: string; // e.g., 'BTCUSDT' | 'ETHUSDT' | 'SOLUSDT'
}

interface OrderBookItem {
  price: number;
  amount: number;
  total: number;
  percentage: number;
}

export const MarketDepthChart: React.FC<MarketDepthChartProps> = ({ symbol }) => {
  // Determine base mid-prices
  const basePrice = useMemo(() => {
    switch (symbol) {
      case 'BTCUSDT': return 64250;
      case 'ETHUSDT': return 3450;
      case 'SOLUSDT': return 145;
      case 'ADAUSDT': return 0.45;
      case 'XRPUSDT': return 0.52;
      case 'DOTUSDT': return 5.85;
      case 'DOGEUSDT': return 0.14;
      case 'LINKUSDT': return 15.30;
      case 'LTCUSDT': return 82.50;
      case 'BNBUSDT': return 580.00;
      default: return 64250;
    }
  }, [symbol]);

  const priceStep = useMemo(() => {
    switch (symbol) {
      case 'BTCUSDT': return 5;
      case 'ETHUSDT': return 0.5;
      case 'SOLUSDT': return 0.05;
      case 'ADAUSDT': return 0.0001;
      case 'XRPUSDT': return 0.0001;
      case 'DOTUSDT': return 0.001;
      case 'DOGEUSDT': return 0.0001;
      case 'LINKUSDT': return 0.005;
      case 'LTCUSDT': return 0.02;
      case 'BNBUSDT': return 0.1;
      default: return 0.05;
    }
  }, [symbol]);

  const decimals = useMemo(() => {
    switch (symbol) {
      case 'ADAUSDT':
      case 'XRPUSDT':
      case 'DOGEUSDT':
        return 4;
      case 'DOTUSDT':
        return 3;
      case 'SOLUSDT':
      case 'LINKUSDT':
      case 'LTCUSDT':
        return 2;
      case 'ETHUSDT':
      case 'BNBUSDT':
        return 1;
      case 'BTCUSDT':
      default:
        return 0;
    }
  }, [symbol]);

  const [midPrice, setMidPrice] = useState<number>(basePrice);
  const [spread, setSpread] = useState<number>(priceStep * 1.5);

  // Periodically fluctuate the price and spread for ultra-realistic feed simulation
  useEffect(() => {
    setMidPrice(basePrice);
    setSpread(priceStep * (1 + Math.random()));
  }, [basePrice, priceStep]);

  useEffect(() => {
    const timer = setInterval(() => {
      setMidPrice(prev => {
        const change = (Math.random() - 0.5) * priceStep * 1.2;
        return Number((prev + change).toFixed(decimals));
      });
      setSpread(prev => {
        const target = priceStep * (1 + Math.random() * 0.8);
        return Number((prev * 0.8 + target * 0.2).toFixed(decimals || 1));
      });
    }, 2500);
    return () => clearInterval(timer);
  }, [symbol, priceStep, decimals]);

  // Generate 12 Bid and Ask orderbook rows around midPrice
  const orderBookData = useMemo(() => {
    const bids: OrderBookItem[] = [];
    const asks: OrderBookItem[] = [];
    
    let bidSum = 0;
    let askSum = 0;

    // Create bids (lower than mid price)
    for (let i = 1; i <= 10; i++) {
      const price = Number((midPrice - spread/2 - (i * priceStep)).toFixed(decimals));
      // Random amounts, slightly larger amounts deeper in book
      const amount = Number((Math.random() * (4.5 / i) + (Math.random() * 0.2 + 0.05) * i).toFixed(symbol === 'BTCUSDT' ? 4 : symbol === 'ETHUSDT' ? 2 : 1));
      bidSum += amount;
      bids.push({ price, amount, total: bidSum, percentage: 0 });
    }

    // Create asks (higher than mid price)
    for (let i = 1; i <= 10; i++) {
      const price = Number((midPrice + spread/2 + (i * priceStep)).toFixed(decimals));
      const amount = Number((Math.random() * (4.5 / i) + (Math.random() * 0.2 + 0.05) * i).toFixed(symbol === 'BTCUSDT' ? 4 : symbol === 'ETHUSDT' ? 2 : 1));
      askSum += amount;
      asks.push({ price, amount, total: askSum, percentage: 0 });
    }

    // Calculate depth percentages
    const maxTotal = Math.max(bidSum, askSum) || 1;
    bids.forEach(b => b.percentage = Math.min((b.total / maxTotal) * 100, 100));
    asks.forEach(a => a.percentage = Math.min((a.total / maxTotal) * 100, 100));

    return { bids, asks };
  }, [midPrice, spread, priceStep, symbol]);

  // Generate chart data for Recharts, sorted from lowest bid price to highest ask price
  const chartData = useMemo(() => {
    const points: any[] = [];
    const reversedBids = [...orderBookData.bids].reverse();

    // Standardize bid points for cumulative graph
    reversedBids.forEach(b => {
      points.push({
        price: b.price,
        depthPrice: b.price.toLocaleString(undefined, { minimumFractionDigits: decimals }),
        Bids: Number(b.total.toFixed(2)),
        Asks: null,
        BidVolume: Number(b.amount.toFixed(2)),
        AskVolume: null,
      });
    });

    // Add empty mid-price point for natural division
    const trueMidPrice = Number((midPrice).toFixed(decimals));
    points.push({
      price: trueMidPrice,
      depthPrice: trueMidPrice.toLocaleString(undefined, { minimumFractionDigits: decimals }),
      Bids: 0,
      Asks: 0,
      BidVolume: null,
      AskVolume: null,
    });

    // Standardize ask points
    orderBookData.asks.forEach(a => {
      points.push({
        price: a.price,
        depthPrice: a.price.toLocaleString(undefined, { minimumFractionDigits: decimals }),
        Bids: null,
        Asks: Number(a.total.toFixed(2)),
        BidVolume: null,
        AskVolume: Number(a.amount.toFixed(2)),
      });
    });

    return points;
  }, [orderBookData, midPrice, symbol, decimals]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-5 bg-zinc-950 border-t border-white/5 font-sans">
      
      {/* Visual Cumulative Depth Chart Area */}
      <div className="lg:col-span-8 flex flex-col justify-between bg-zinc-900/40 border border-white/5 rounded-2xl p-4 overflow-hidden min-h-[440px]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-100">Market Order Depth</h4>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-zinc-400 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-1.5 bg-emerald-500/20 border border-emerald-500/40 rounded-sm" />
              Bids (Buy Orders)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-1.5 bg-rose-500/20 border border-rose-500/40 rounded-sm" />
              Asks (Sell Orders)
            </span>
          </div>
        </div>

        {/* Recharts Area depth chart */}
        <div className="w-full h-[180px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 5, left: -25, bottom: 5 }}
            >
              <defs>
                <linearGradient id="colorBids" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="colorAsks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="price" 
                tick={{ fill: '#71717a', fontSize: 9, fontFamily: 'monospace' }}
                axisLine={false}
                tickLine={false}
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(val) => `$${val.toLocaleString(undefined, { maximumFractionDigits: decimals })}`}
              />
              <YAxis 
                tick={{ fill: '#71717a', fontSize: 9, fontFamily: 'monospace' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const isBid = data.Bids !== null && data.Bids !== undefined && data.Bids > 0;
                    const value = isBid ? data.Bids : data.Asks;
                    return (
                      <div className="bg-zinc-900 border border-white/10 rounded-xl p-2.5 shadow-2xl text-[10px] font-mono">
                        <p className="text-zinc-400 mb-1">Price: <span className="text-white font-bold">${data.price.toLocaleString()}</span></p>
                        <p className={isBid ? "text-emerald-400" : "text-rose-400"}>
                          Cumulative Vol: <span className="font-bold">{value?.toFixed(2)} {symbol.replace('USDT', '')}</span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine x={midPrice} stroke="#71717a hover:#ffffff" strokeDasharray="3 3" />
              <Area 
                type="step" 
                dataKey="Bids" 
                stroke="#10b981" 
                strokeWidth={1.5}
                fillOpacity={1} 
                fill="url(#colorBids)" 
                connectNulls={false}
              />
              <Area 
                type="step" 
                dataKey="Asks" 
                stroke="#f43f5e" 
                strokeWidth={1.5}
                fillOpacity={1} 
                fill="url(#colorAsks)" 
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-950/95 border border-white/5 rounded-2xl px-3 py-1.5 flex flex-col items-center pointer-events-none shadow-xl">
            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Spread Index</span>
            <span className="text-xs font-semibold font-mono text-zinc-100">${midPrice.toLocaleString()}</span>
            <span className="text-[8px] font-mono font-bold text-zinc-400 mt-0.5">Spread: ${spread}</span>
          </div>
        </div>

        {/* Real-time Orderbook Volume Histogram */}
        <div className="border-t border-white/5 mt-4 pt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-300">Limit Order Volume Distribution</span>
            </div>
            <span className="text-[9px] font-mono text-zinc-500 uppercase">Per Price Level</span>
          </div>
          <div className="w-full h-[90px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 5, right: 5, left: -25, bottom: 5 }}
              >
                <XAxis 
                  dataKey="price" 
                  tick={{ fill: '#71717a', fontSize: 8, fontFamily: 'monospace' }}
                  axisLine={false}
                  tickLine={false}
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(val) => `$${val.toLocaleString(undefined, { maximumFractionDigits: decimals })}`}
                />
                <YAxis 
                  tick={{ fill: '#71717a', fontSize: 8, fontFamily: 'monospace' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const hasBidVolume = data.BidVolume !== null && data.BidVolume !== undefined && data.BidVolume > 0;
                      const hasAskVolume = data.AskVolume !== null && data.AskVolume !== undefined && data.AskVolume > 0;
                      const value = hasBidVolume ? data.BidVolume : (hasAskVolume ? data.AskVolume : 0);
                      const isBid = hasBidVolume;
                      return (
                        <div className="bg-zinc-900 border border-white/10 rounded-xl p-2 shadow-2xl text-[10px] font-mono">
                          <p className="text-zinc-400 mb-0.5">Price Level: <span className="text-white font-bold">${data.price.toLocaleString()}</span></p>
                          <p className={isBid ? "text-emerald-400" : (hasAskVolume ? "text-rose-400" : "text-zinc-400")}>
                            {isBid ? "Bid Size: " : (hasAskVolume ? "Ask Size: " : "Volume: ")}
                            <span className="font-bold">{value?.toFixed(2)} {symbol.replace('USDT', '')}</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine x={midPrice} stroke="#71717a" strokeDasharray="3 3" />
                <Bar 
                  dataKey="BidVolume" 
                  fill="#10b981" 
                  radius={[1.5, 1.5, 0, 0]} 
                  opacity={0.8}
                  maxBarSize={12}
                />
                <Bar 
                  dataKey="AskVolume" 
                  fill="#f43f5e" 
                  radius={[1.5, 1.5, 0, 0]} 
                  opacity={0.8}
                  maxBarSize={12}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex justify-between text-[9px] text-zinc-500 font-medium px-1 mt-2">
          <span>{symbol} Bid Liquidity Cluster</span>
          <span>{symbol} Ask Liquidity Cluster</span>
        </div>
      </div>

      {/* Numerical Live Order Book Column */}
      <div className="lg:col-span-4 bg-zinc-900/40 border border-white/5 rounded-2xl p-4 flex flex-col justify-between min-h-[280px]">
        <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-100">Order Book Feed</h4>
          </div>
          <span className="text-[9px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 px-2 py-0.5 rounded-md uppercase">
            Live
          </span>
        </div>

        {/* Side-by-side or combined bids/asks list */}
        <div className="grid grid-cols-2 gap-3 flex-1 overflow-hidden pointer-events-none">
          {/* Bids Column */}
          <div className="flex flex-col h-full justify-between">
            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1.5">Bids</span>
            <div className="space-y-1">
              {orderBookData.bids.slice(0, 6).map((bid, i) => (
                <div 
                  key={i} 
                  className="relative flex items-center justify-between text-[10px] font-mono py-1 px-1.5 rounded overflow-hidden"
                >
                  <div 
                    className="absolute inset-y-0 left-0 bg-emerald-500/5" 
                    style={{ width: `${bid.percentage}%` }}
                  />
                  <span className="text-emerald-400 font-bold relative z-10">${bid.price.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</span>
                  <span className="text-zinc-300 relative z-10">{bid.amount}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Asks Column */}
          <div className="flex flex-col h-full justify-between">
            <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1.5">Asks</span>
            <div className="space-y-1">
              {orderBookData.asks.slice(0, 6).map((ask, i) => (
                <div 
                  key={i} 
                  className="relative flex items-center justify-between text-[10px] font-mono py-1 px-1.5 rounded overflow-hidden"
                >
                  <div 
                    className="absolute inset-y-0 right-0 bg-rose-500/5" 
                    style={{ width: `${ask.percentage}%` }}
                  />
                  <span className="text-rose-400 font-bold relative z-10">${ask.price.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</span>
                  <span className="text-zinc-300 relative z-10">{ask.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-2.5 border-t border-white/5 mt-3 flex items-center justify-between text-[9px] text-zinc-500 font-mono">
          <span>Updates matched with Binance Depth</span>
          <span>Feed: 2.5s jitter</span>
        </div>
      </div>

    </div>
  );
};
