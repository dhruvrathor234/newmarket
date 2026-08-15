
import React, { useState } from 'react';
import { X, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

interface WalletModalProps {
  isOpen: boolean;
  type: 'deposit' | 'withdraw';
  currentBalance: number;
  onClose: () => void;
  onConfirm: (amount: number) => void;
}

const WalletModal: React.FC<WalletModalProps> = ({ isOpen, type, currentBalance, onClose, onConfirm }) => {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setError('Invalid Amount');
      return;
    }
    if (type === 'withdraw' && val > currentBalance) {
      setError('Insufficient Liquidity');
      return;
    }

    onConfirm(val);
    setAmount('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <div className="glass-card rounded-[32px] border border-blue-500/20 max-w-md w-full p-8 relative animate-in fade-in zoom-in duration-200 bg-zinc-950/90 shadow-[0_0_80px_rgba(59,130,246,0.15)]">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
        
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
            {type === 'deposit' ? <ArrowDownCircle size={32} className="text-blue-500" /> : <ArrowUpCircle size={32} className="text-blue-500" />}
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
              {type === 'deposit' ? 'Asset Injection' : 'Capital Withdrawal'}
          </h2>
          <p className="text-[10px] text-blue-500/60 font-mono uppercase tracking-[0.2em] mt-1">
              Nebula Market Protocol
          </p>
        </div>

        <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4 mb-8 flex flex-col items-center">
            <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-1">Available Margin</span>
            <span className="text-xl font-black text-white font-mono">
                ${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
        <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Transaction Value (USD)</label>
            <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 font-mono text-lg">$</span>
            <input
                type="number"
                value={amount}
                onChange={(e) => {
                    setAmount(e.target.value);
                    setError('');
                }}
                className="w-full bg-black/60 border border-white/10 rounded-2xl py-4 pl-10 pr-4 text-white font-mono text-xl focus:outline-none focus:border-blue-500/40 transition-all placeholder:text-zinc-800"
                placeholder="0.00"
                step="0.01"
                autoFocus
            />
            </div>
            {error && <p className="text-rose-500 text-[10px] uppercase font-bold tracking-wider mt-2 text-center">{error}</p>}
        </div>

        <div className="flex gap-4 pt-2">
            <button
                type="button"
                onClick={onClose}
                className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-zinc-500 bg-white/5 hover:bg-white/10 transition-all border border-white/5"
            >
                Cancel
            </button>
            <button
                type="submit"
                className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all text-white bg-blue-600 hover:bg-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.3)]"
            >
                Confirm {type}
            </button>
        </div>
        </form>
      </div>
    </div>
  );
};

export default WalletModal;
