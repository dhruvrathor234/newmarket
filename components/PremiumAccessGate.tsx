import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Zap, Lock, CreditCard, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { databaseService } from '../services/databaseService';
import { auth } from '../firebase';

interface PremiumAccessGateProps {
  children: React.ReactNode;
  hasAccess: boolean;
  title: string;
  description: string;
}

declare global {
  interface Window {
    Cashfree?: any;
  }
}

const PremiumAccessGate: React.FC<PremiumAccessGateProps> = ({ children, hasAccess, title, description }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (hasAccess) {
    return <>{children}</>;
  }

  const handlePayment = async () => {
    if (!auth.currentUser) {
      setError("Please login to proceed.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // 1. Create Order on our backend
      const response = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: auth.currentUser.uid,
          userEmail: auth.currentUser.email,
          userName: auth.currentUser.displayName || "Nebula Trader",
          userPhone: "9999999999" // Fallback or collect from user
        })
      });

      const orderData = await response.json();
      if (!response.ok) throw new Error(orderData.error || "Order creation failed");

      // 2. Handle simulated payment for development if credentials missing
      if (orderData.is_simulated) {
        console.log("[Payments] Simulation mode: auto-approving in 2 seconds...");
        await new Promise(r => setTimeout(r, 2000));
        await databaseService.setPremiumAccess(auth.currentUser.uid, true);
        window.location.reload(); // Refresh to gain access
        return;
      }

      // 3. Initialize Cashfree SDK and checkout
      if (!window.Cashfree) {
        throw new Error("Cashfree SDK not loaded. Check your internet connection.");
      }

      const cashfree = new window.Cashfree({
        mode: orderData.order_id.includes('dev') ? "sandbox" : "production"
      });

      await cashfree.checkout({
        paymentSessionId: orderData.payment_session_id,
        redirectTarget: "_self" // Or _modal
      });

    } catch (err: any) {
      console.error("[Payments] Payment Flow Error:", err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full bg-[#121418] border border-blue-500/20 rounded-3xl overflow-hidden shadow-2xl shadow-blue-500/5"
      >
        <div className="grid md:grid-cols-2">
          {/* Left: Marketing */}
          <div className="p-8 bg-gradient-to-br from-blue-600/10 via-transparent to-transparent">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-6">
              <Shield className="w-6 h-6 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Unlock Neural Core Access</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              To access advanced {title}, our neural core requires a one-time activation. This ensures high-performance dedicated resources for your account.
            </p>
            
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="mt-1"><CheckCircle2 className="w-4 h-4 text-emerald-400" /></div>
                <div className="text-xs text-slate-300 font-medium">Real-time Gemini 2.0 Sentiment Analysis</div>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1"><CheckCircle2 className="w-4 h-4 text-emerald-400" /></div>
                <div className="text-xs text-slate-300 font-medium">Deep Market Logic Evaluation</div>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1"><CheckCircle2 className="w-4 h-4 text-emerald-400" /></div>
                <div className="text-xs text-slate-300 font-medium">Unrestricted Intelligence Subroutines</div>
              </li>
            </ul>
          </div>

          {/* Right: Payment Action */}
          <div className="p-8 bg-zinc-900/50 border-l border-white/5 flex flex-col justify-center text-center">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 mb-4">
                <Zap className="w-3 h-3 text-blue-400" />
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Limited Offer</span>
              </div>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-slate-500 text-sm">₹</span>
                <span className="text-5xl font-black text-white">1</span>
                <span className="text-slate-500 text-sm">.00</span>
              </div>
              <p className="text-slate-500 text-[10px] mt-2 uppercase font-bold tracking-tighter">One-Time Activation Fee</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center gap-2 text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <button
              onClick={handlePayment}
              disabled={isProcessing}
              className="w-full py-4 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-black font-black rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-3 group"
            >
              {isProcessing ? (
                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  <span>ACTIVATE NOW</span>
                  <Sparkles className="w-4 h-4 group-hover:animate-pulse" />
                </>
              )}
            </button>

            <p className="text-[10px] text-slate-600 mt-6 leading-relaxed">
              Securely processed via <span className="font-bold">Cashfree Payments</span>.<br/>Instant activation upon verification.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PremiumAccessGate;
