import React, { useState, useEffect } from 'react';
import { X, Check, Copy, ArrowUpRight, ArrowDownRight, ArrowLeftRight, Loader2, AlertCircle, Info, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  exchangeId: string;
  balances: Record<string, any>;
  simulatedPrices: Record<string, number>;
  onSuccess: (newBalances: any, msg: string) => void;
}

// ---------------- DEPOSIT MODAL ----------------
export const DepositModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  userId,
  exchangeId,
  balances,
  simulatedPrices,
  onSuccess,
}) => {
  const [selectedAsset, setSelectedAsset] = useState('USDT');
  const [amount, setAmount] = useState('1000');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mockAddresses: Record<string, string> = {
    USDT: 'T9yD14Nj9yD14Nj9yD14Nj9yD14NjTxUSDT',
    BTC: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivBTC',
    ETH: '0x71C7656EC7ab88b098defB751B7401B5fETH',
    SOL: 'HN7cABviGo3K2sr6L79H2S879vSOL',
    ADA: 'Ae2tdPxUAua5g3srH2y9S4D7ADA',
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(mockAddresses[selectedAsset] || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/wallet/operation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          exchangeId,
          operationType: 'deposit',
          details: {
            asset: selectedAsset,
            amount,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to simulation deposit.');
      }

      onSuccess(data.balances, data.message);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Deposit simulation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="bg-zinc-950 border border-white/5 rounded-3xl w-full max-w-md overflow-hidden relative shadow-2xl"
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <ArrowDownRight className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider">Deposit Funds</h3>
              </div>
              <button type="button" onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSimulateDeposit} className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Select Asset</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {['USDT', 'BTC', 'ETH', 'SOL', 'ADA'].map((asset) => (
                    <button
                      type="button"
                      key={asset}
                      onClick={() => setSelectedAsset(asset)}
                      className={`py-2 text-xs font-black rounded-xl border transition-all ${
                        selectedAsset === asset
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                          : 'bg-white/5 border-white/5 text-zinc-400 hover:border-white/10'
                      }`}
                    >
                      {asset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">Deposit Address ({selectedAsset})</span>
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 text-white/40 uppercase font-mono">Sandbox Mock</span>
                </div>
                <div className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-xl p-3">
                  <span className="text-xs text-zinc-400 font-mono select-all truncate flex-1">{mockAddresses[selectedAsset]}</span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="p-1 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors shrink-0"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="border-t border-dashed border-white/5 pt-4 space-y-4">
                <div className="flex items-center gap-2 text-yellow-500/80">
                  <Info className="w-4 h-4 shrink-0" />
                  <p className="text-[10px] leading-relaxed">
                    You are in <span className="text-white font-bold">Simulator mode</span>. Deposit simulated crypto into your ledger instantly to power trading routines below.
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Amount to Sim-Deposit</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-white/5 border border-white/5 focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/50 focus:outline-none rounded-2xl p-4 text-sm font-bold text-white tabular-nums pr-16 transition-all duration-200"
                      placeholder="Enter amount..."
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-zinc-400">{selectedAsset}</span>
                  </div>
                </div>

                {error && (
                  <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/10 p-3.5 rounded-2xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white p-4 rounded-2xl font-black uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating Tokens...
                    </>
                  ) : (
                    'Credit Simulation Balance'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};



// ---------------- WITHDRAW MODAL ----------------
export const WithdrawModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  userId,
  exchangeId,
  balances,
  simulatedPrices,
  onSuccess,
}) => {
  const [selectedAsset, setSelectedAsset] = useState('USDT');
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [network, setNetwork] = useState('TRC20');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentAvailable = balances[selectedAsset] || 0;
  const networkFee = selectedAsset === 'USDT' ? 1.0 : selectedAsset === 'BTC' ? 0.0005 : selectedAsset === 'ETH' ? 0.003 : 0.01;

  const handleMax = () => {
    if (currentAvailable > networkFee) {
      setAmount(String(currentAvailable));
    } else {
      setAmount('0');
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const valAmount = parseFloat(amount);
    if (!address) {
      setError('Please specify a valid destination address');
      setIsSubmitting(false);
      return;
    }
    if (valAmount <= 0 || isNaN(valAmount)) {
      setError('Withdrawal amount must be greater than 0');
      setIsSubmitting(false);
      return;
    }
    if (valAmount > currentAvailable) {
      setError(`Insufficient available balance of ${selectedAsset}. Max: ${currentAvailable}`);
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/wallet/operation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          exchangeId,
          operationType: 'withdraw',
          details: {
            asset: selectedAsset,
            amount,
            address,
            network,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to simulation withdrawal.');
      }

      onSuccess(data.balances, data.message);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Withdrawal simulation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="bg-zinc-950 border border-white/5 rounded-3xl w-full max-w-md overflow-hidden relative shadow-2xl"
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider">Withdraw Assets</h3>
              </div>
              <button type="button" onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleWithdraw} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Select Asset</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {['USDT', 'BTC', 'ETH', 'SOL', 'ADA'].map((asset) => (
                    <button
                      type="button"
                      key={asset}
                      onClick={() => setSelectedAsset(asset)}
                      className={`py-2 text-xs font-black rounded-xl border transition-all ${
                        selectedAsset === asset
                          ? 'bg-rose-500/10 border-rose-500 text-rose-400'
                          : 'bg-white/5 border-white/5 text-zinc-400 hover:border-white/10'
                      }`}
                    >
                      {asset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider mb-2">
                  <span className="text-zinc-500">Destination Address</span>
                  <span className="text-zinc-500">Network Fee: <span className="text-zinc-300 font-mono">{networkFee} {selectedAsset}</span></span>
                </div>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 focus:border-rose-500/50 focus:ring-4 focus:ring-rose-500/10 focus:outline-none rounded-2xl p-4 text-xs font-mono text-zinc-200 transition-all duration-200"
                  placeholder={`Enter destination ${selectedAsset} address...`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Network Protocol</label>
                  <select
                    value={network}
                    onChange={(e) => setNetwork(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/5 focus:border-white/20 focus:outline-none rounded-2xl p-4 text-xs text-white"
                  >
                    {selectedAsset === 'USDT' ? (
                      <>
                        <option value="TRC20">TRC20 (Tron)</option>
                        <option value="ERC20">ERC20 (Ethereum)</option>
                        <option value="BSC">BEP20 (Binance)</option>
                      </>
                    ) : selectedAsset === 'BTC' ? (
                      <option value="BTC">Bitcoin Native</option>
                    ) : selectedAsset === 'ETH' ? (
                      <option value="ERC20">ERC20 Network</option>
                    ) : selectedAsset === 'SOL' ? (
                      <option value="Solana">Solana Native</option>
                    ) : (
                      <option value="Cardano">Cardano Native</option>
                    )}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-bold uppercase mb-2">
                    <span className="text-zinc-500">Amount</span>
                    <button type="button" onClick={handleMax} className="text-rose-400 hover:text-rose-300 font-black transition-colors">MAX</button>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-white/5 border border-white/5 focus:border-rose-500/50 focus:ring-4 focus:ring-rose-500/10 focus:outline-none rounded-2xl p-4 text-xs font-bold text-white tabular-nums pr-12 transition-all duration-200"
                      placeholder="0.00"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black pointer-events-none text-zinc-500">{selectedAsset}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between p-4 bg-white/5 rounded-2xl text-[10px] font-bold text-zinc-500 uppercase">
                <span>Available Balance:</span>
                <span className="text-white font-mono">{currentAvailable.toLocaleString()} {selectedAsset}</span>
              </div>

              {error && (
                <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/10 p-3.5 rounded-2xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white p-4 rounded-2xl font-black uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4.5 h-4.5 animate-spin text-zinc-950" />
                    Broadcasting tx...
                  </>
                ) : (
                  'Submit Withdrawal'
                )}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};



// ---------------- SWAP MODAL ----------------
export const SwapModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  userId,
  exchangeId,
  balances,
  simulatedPrices,
  onSuccess,
}) => {
  const [fromAsset, setFromAsset] = useState('USDT');
  const [toAsset, setToAsset] = useState('BTC');
  const [fromAmount, setFromAmount] = useState('100');
  const [toAmount, setToAmount] = useState('0.00155');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assetPrices: Record<string, number> = {
    USDT: 1.0,
    BTC: simulatedPrices['BTC/USDT'] || 64250,
    ETH: simulatedPrices['ETH/USDT'] || 3450,
    SOL: simulatedPrices['SOL/USDT'] || 145,
    ADA: 0.45,
  };

  const getExchangeRate = () => {
    const pFrom = assetPrices[fromAsset] || 1;
    const pTo = assetPrices[toAsset] || 1;
    return pFrom / pTo;
  };

  // Convert whenever amounts or selections shift
  useEffect(() => {
    const parsed = parseFloat(fromAmount);
    if (!isNaN(parsed) && parsed > 0) {
      const rate = getExchangeRate();
      setToAmount((parsed * rate).toFixed(6));
    } else {
      setToAmount('0.00');
    }
  }, [fromAmount, fromAsset, toAsset, simulatedPrices]);

  const currentFromAvailable = balances[fromAsset] || 0;

  const handleFlip = () => {
    const temp = fromAsset;
    setFromAsset(toAsset);
    setToAsset(temp);
  };

  const handleSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const fAmtVal = parseFloat(fromAmount);
    const tAmtVal = parseFloat(toAmount);

    if (fromAsset === toAsset) {
      setError('Source and Destination assets must be different');
      setIsSubmitting(false);
      return;
    }
    if (fAmtVal <= 0 || isNaN(fAmtVal)) {
      setError('Please input a valid amount to swap');
      setIsSubmitting(false);
      return;
    }
    if (fAmtVal > currentFromAvailable) {
      setError(`Insufficient available balance of ${fromAsset}. Max: ${currentFromAvailable}`);
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/wallet/operation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          exchangeId,
          operationType: 'swap',
          details: {
            fromAsset,
            toAsset,
            fromAmount: fromAmount,
            toAmount: toAmount,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to simulation swap.');
      }

      onSuccess(data.balances, data.message);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Swap simulation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="bg-zinc-950 border border-white/5 rounded-3xl w-full max-w-sm overflow-hidden relative shadow-2xl"
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider">Instant Asset Swap</h3>
              </div>
              <button type="button" onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSwap} className="p-6 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">You Swap</label>
                  <span className="text-[10px] font-bold text-zinc-500">Available: <span className="text-zinc-300 font-mono">{currentFromAvailable.toLocaleString()}</span></span>
                </div>
                <div className="flex bg-white/5 border border-white/5 focus-within:border-indigo-500/50 focus-within:ring-4 focus-within:ring-indigo-500/10 rounded-2xl items-center p-2.5 transition-all duration-200">
                  <input
                    type="number"
                    step="any"
                    required
                    value={fromAmount}
                    onChange={(e) => setFromAmount(e.target.value)}
                    className="bg-transparent border-0 focus:outline-none flex-1 p-2 text-sm font-bold text-white tabular-nums"
                    placeholder="0.00"
                  />
                  <select
                    value={fromAsset}
                    onChange={(e) => setFromAsset(e.target.value)}
                    className="bg-zinc-900 border border-white/5 focus:outline-none font-bold rounded-xl py-2 px-3 text-xs text-white"
                  >
                    {['USDT', 'BTC', 'ETH', 'SOL', 'ADA'].map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-center -my-1 relative z-10">
                <button
                  type="button"
                  onClick={handleFlip}
                  className="p-3 bg-zinc-90 w-11 h-11 border border-white/5 rounded-full hover:bg-zinc-900 text-indigo-400 hover:scale-115 active:scale-95 transition-all flex items-center justify-center shadow-lg"
                >
                  <ArrowLeftRight className="w-4 h-4 rotate-90" />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">You Recieve (Est.)</label>
                  <span className="text-[10px] font-bold text-zinc-500">Rate: <span className="text-zinc-300 font-mono">1 {fromAsset} = {getExchangeRate().toLocaleString(undefined, { maximumFractionDigits: 6 })} {toAsset}</span></span>
                </div>
                <div className="flex bg-white/5 border border-white/5 rounded-2xl items-center p-2.5 opacity-90">
                  <input
                    type="text"
                    readOnly
                    value={toAmount}
                    className="bg-transparent border-0 focus:outline-none flex-1 p-2 text-sm font-bold text-zinc-400 tabular-nums"
                    placeholder="0.00"
                  />
                  <select
                    value={toAsset}
                    onChange={(e) => setToAsset(e.target.value)}
                    className="bg-zinc-900 border border-white/5 focus:outline-none font-bold rounded-xl py-2 px-3 text-xs text-white"
                  >
                    {['USDT', 'BTC', 'ETH', 'SOL', 'ADA'].map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>

              {error && (
                <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/10 p-3.5 rounded-2xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex gap-2">
                <ShieldCheck className="w-4.5 h-4.5 text-indigo-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-indigo-300/80 leading-relaxed font-medium">This transaction executes instantly within your secure sandboxed ledger workspace without slippery network front-running or slippage.</p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50 p-4 rounded-2xl font-black uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                    Executing Swap...
                  </>
                ) : (
                  'Confirm Instant Swap'
                )}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

