
import React, { useState } from 'react';
import { CreditCard, CheckCircle2, Zap, Shield, Clock, ArrowRight, Activity, Crown, Star } from 'lucide-react';
import { auth } from '../../firebase';
import { UserStats } from '../../types';

interface SubscriptionViewProps {
  userStats: UserStats | null;
  onSuccess: () => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

const SubscriptionView: React.FC<SubscriptionViewProps> = ({ userStats, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Create order on backend
      const orderRes = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!orderRes.ok) throw new Error('Failed to create order');
      const order = await orderRes.ok ? await orderRes.json() : null;

      if (!order) throw new Error('Invalid order response');

      // 2. Open Razorpay Checkout
      const options = {
        key: 'rzp_live_SVUMHcTC82q1XW', // Frontend Key ID
        amount: order.amount,
        currency: order.currency,
        name: "Nebula Market",
        description: "Pro Subscription (30 Days)",
        image: "https://ais-dev-zdduqj7kbh2ivpseh4m4qo-124103716360.asia-southeast1.run.app/logo.png",
        order_id: order.id,
        handler: async function (response: any) {
          try {
            // 3. Verify payment on backend
            const verifyRes = await fetch('/api/razorpay/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...response,
                userId: auth.currentUser?.uid
              })
            });

            const result = await verifyRes.json();
            if (result.status === 'success') {
              onSuccess();
            } else {
              setError('Payment verification failed. Please contact support.');
            }
          } catch (err) {
            setError('Verification protocol error.');
          }
        },
        prefill: {
          email: auth.currentUser.email,
        },
        theme: {
          color: "#3b82f6"
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setError(err.message || 'Payment initialization failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrial = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/subscription/start-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: auth.currentUser.uid })
      });
      
      if (!res.ok) throw new Error('Failed to start trial');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Trial initialization failed.');
    } finally {
      setLoading(false);
    }
  };

  const isTrialActive = userStats ? new Date() < new Date(userStats.trialEnd) : false;
  const trialUsed = userStats ? new Date(userStats.trialEnd).getTime() > new Date(userStats.trialStart).getTime() + 1000 : false;
  const daysRemaining = userStats ? Math.ceil((new Date(userStats.trialEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 animate-fade-in">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Side: Benefits */}
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-blue-500">
              <Crown size={32} />
              <h1 className="text-4xl font-black uppercase tracking-tighter">Nebula <span className="text-white">Pro</span></h1>
            </div>
            <p className="text-slate-400 text-lg leading-relaxed">
              Unlock the full power of AI-driven market intelligence. Join 10,000+ traders executing smart strategies with built-in precision.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: <Zap size={20} />, title: "Neural Core Access", desc: "Full access to Gemini-powered market analysis." },
              { icon: <Activity size={20} />, title: "Real-time Execution", desc: "Connect Binance for instant trade execution." },
              { icon: <Shield size={20} />, title: "Advanced Risk Engine", desc: "Automated SL/TP and hedging protocols." },
              { icon: <Star size={20} />, title: "Nebula V6 Beta", desc: "Early access to our next-gen trading algorithms." }
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                  {item.icon}
                </div>
                <div>
                  <h3 className="font-bold text-white uppercase text-sm tracking-widest">{item.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Pricing Card */}
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-20 animate-pulse"></div>
          <div className="relative glass-panel rounded-2xl border border-white/10 p-8 flex flex-col h-full bg-black/40 backdrop-blur-xl">
            <div className="flex justify-between items-start mb-8">
              <div>
                <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
                  Monthly Plan
                </span>
                <div className="flex items-baseline gap-2 mt-4">
                  <span className="text-5xl font-black text-white">₹1</span>
                  <span className="text-slate-500 font-bold uppercase text-xs tracking-widest">/ 30 Days</span>
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                <Zap size={24} className="text-blue-500" />
              </div>
            </div>

            <div className="space-y-4 mb-10">
              <div className="flex items-center gap-3 text-slate-300">
                <CheckCircle2 size={18} className="text-blue-500" />
                <span className="text-sm font-medium">Unlimited AI Market Analysis</span>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <CheckCircle2 size={18} className="text-blue-500" />
                <span className="text-sm font-medium">Neural Assistant Access</span>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <CheckCircle2 size={18} className="text-blue-500" />
                <span className="text-sm font-medium">Priority Cloud Sync</span>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <CheckCircle2 size={18} className="text-blue-500" />
                <span className="text-sm font-medium">24/7 Neural Support</span>
              </div>
            </div>

            <div className="mt-auto space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-bold text-center uppercase tracking-widest">
                  {error}
                </div>
              )}

              <button
                onClick={handlePayment}
                disabled={loading}
                className={`w-full py-5 rounded-xl font-black uppercase tracking-[0.3em] text-xs transition-all flex items-center justify-center gap-3
                  ${loading 
                    ? 'bg-slate-800 text-slate-500 cursor-wait' 
                    : 'bg-blue-600 text-white hover:bg-blue-500 hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]'
                  }`}
              >
                {loading ? 'Initializing Secure Link...' : (
                  <>
                    Initialize Subscription
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              {!isTrialActive && !trialUsed && (
                <button
                  onClick={handleStartTrial}
                  disabled={loading}
                  className={`w-full py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] transition-all border border-white/10 hover:bg-white/5 text-slate-400
                    ${loading ? 'opacity-50 cursor-wait' : ''}`}
                >
                  Start 3-Day Free Trial
                </button>
              )}

              <button
                onClick={() => onSuccess()}
                disabled={loading}
                className="w-full py-3 rounded-xl font-black uppercase tracking-[0.2em] text-[9px] transition-all text-slate-500 hover:text-white hover:bg-white/5"
              >
                Continue with Free Version (Terminal Only)
              </button>

              {isTrialActive ? (
                <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                  <Clock size={12} />
                  Trial Active: {daysRemaining} Days Remaining
                </div>
              ) : (
                <p className="text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  Secure checkout powered by Razorpay
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionView;
