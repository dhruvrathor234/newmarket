import React, { useState } from 'react';
import { UserStats } from '../types';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, TrendingUp, AlertCircle, CheckCircle, CreditCard, ArrowRight } from 'lucide-react';

interface NebulaFeeDashboardProps {
  stats: UserStats;
  onPaySuccess: () => void;
}

const NebulaFeeDashboard: React.FC<NebulaFeeDashboardProps> = ({ stats, onPaySuccess }) => {
  const [isPaying, setIsPaying] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSimulatePayment = async () => {
    setIsPaying(true);
    try {
      // Simulate payment gateway delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      const statsRef = doc(db, 'user_stats', stats.userId);
      const newTotalPaid = stats.totalFeesPaid + stats.amountOwed;
      
      await updateDoc(statsRef, {
        totalFeesPaid: newTotalPaid,
        amountOwed: 0,
        isLocked: false,
        lastUpdated: Date.now()
      });

      setShowSuccess(true);
      onPaySuccess();
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Payment failed:", error);
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Profit */}
        <div className="bg-black/40 border border-white/5 rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Total Net Profit</p>
            <p className="text-xl font-mono font-bold text-emerald-500">${stats.totalProfit.toFixed(2)}</p>
          </div>
        </div>

        {/* Total Fees Owed (20%) */}
        <div className="bg-black/40 border border-white/5 rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Nebula Share (20%)</p>
            <p className="text-xl font-mono font-bold text-indigo-500">${stats.totalFeesOwed.toFixed(2)}</p>
          </div>
        </div>

        {/* Current Outstanding */}
        <div className={`bg-black/40 border rounded-xl p-5 flex items-center gap-4 transition-colors ${stats.isLocked ? 'border-red-500/30' : 'border-white/5'}`}>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stats.isLocked ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
            {stats.isLocked ? <AlertCircle className="w-6 h-6 text-red-500" /> : <CreditCard className="w-6 h-6 text-amber-500" />}
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Amount Owed</p>
            <p className={`text-xl font-mono font-bold ${stats.isLocked ? 'text-red-500' : 'text-amber-500'}`}>${stats.amountOwed.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Lock Status Warning */}
      <AnimatePresence>
        {stats.isLocked && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-red-500 uppercase tracking-wider">Account Soft-Locked</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your outstanding fees exceed the $5.00 threshold. Auto-trading and premium indicators have been disabled. 
                Please settle your balance to restore full functionality. Manual trading remains available.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Section */}
      <div className="bg-black/40 border border-white/5 rounded-xl p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">Settle Your Balance</h3>
            <p className="text-sm text-slate-400 max-w-md">
              Nebula operates on a success-only model. We only earn when you do. 
              Settle your 20% profit share to keep the protocol running smoothly.
            </p>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="text-center">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Total to Pay</p>
              <p className="text-3xl font-mono font-bold text-white">${stats.amountOwed.toFixed(2)}</p>
            </div>

            <button
              onClick={handleSimulatePayment}
              disabled={isPaying || stats.amountOwed <= 0}
              className={`
                relative overflow-hidden group px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center gap-2 transition-all
                ${stats.amountOwed > 0 
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                  : 'bg-white/5 text-slate-500 cursor-not-allowed'}
              `}
            >
              {isPaying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : showSuccess ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Paid Successfully
                </>
              ) : (
                <>
                  Pay Now
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="flex flex-wrap justify-center gap-8 pt-4 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
            <CheckCircle className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest">Secure Payment</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
            <CheckCircle className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest">Verified Trades</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
            <CheckCircle className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest">20% Success Share</span>
        </div>
      </div>
    </div>
  );
};

export default NebulaFeeDashboard;
