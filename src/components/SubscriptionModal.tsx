import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, X, CheckCircle, AlertTriangle, Cpu, CreditCard, ChevronRight, Loader2 } from 'lucide-react';
import { apiRequest } from '../services/apiClient';
import { CASHFREE_CONFIG } from '../config/payments';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (plan: { name: string, price: number, method: string, periodEnd?: string | null }) => void;
}

interface CashfreeSDK {
  checkout: (options: { paymentSessionId: string; redirectTarget?: string | HTMLElement }) => Promise<any>;
}

/**
 * Dynamically loads the Cashfree Web SDK (v3) from their CDN so the checkout
 * popup can be opened. The SDK is only needed when a user actually pays.
 */
const loadCashfreeSDK = (): Promise<(options: { mode: string }) => CashfreeSDK> => {
  return new Promise((resolve, reject) => {
    const existing = (window as any).Cashfree;
    if (existing) return resolve(existing);
    const script = document.createElement('script');
    script.src = CASHFREE_CONFIG.SDK_URL;
    script.async = true;
    script.onload = () => resolve((window as any).Cashfree);
    script.onerror = () => reject(new Error('Failed to load the Cashfree SDK. Please check your connection.'));
    document.head.appendChild(script);
  });
};

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState<'SELECT' | 'PAYING' | 'VERIFYING' | 'SUCCESS'>('SELECT');
  const [selectedPlan, setSelectedPlan] = useState<{ name: string, price: number, cycle: 'WEEKLY' | 'MONTHLY' | '6MONTHS' | 'YEARLY' } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);

  // Prices are in Indian Rupees (INR). Conversion: ~₹95 per USD.
  // cycle must match the server's plan catalog (server/routes/payments.ts).
  const PLANS = [

    { name: 'Starter Pro', price: 95, cycle: 'WEEKLY' as const, desc: 'Essential Access' },
    { name: 'Expert Weekly', price: 950, cycle: 'WEEKLY' as const, desc: 'Weekly Sub' },
    { name: 'Neural Monthly', price: 3299, cycle: 'MONTHLY' as const, desc: 'Most Popular' },
    { name: 'Pro 6-Months', price: 18999, cycle: '6MONTHS' as const, desc: 'Neural Saver' },
    { name: 'Ultimate Annual', price: 32999, cycle: 'YEARLY' as const, desc: 'Yearly Access' }
  ];

  const handleSelectPlan = (plan: typeof PLANS[0]) => {
    setSelectedPlan(plan);
    setPlanError(null);
    setVerificationError(null);
  };

  const handleStartCashfree = () => {
    if (!selectedPlan) {
      setPlanError('Select a plan above to continue.');
      return;
    }
    setVerificationError(null);
    setStep('PAYING');
  };

  const handleCashfreePay = async () => {
    if (!selectedPlan || isProcessing) return;
    setIsProcessing(true);
    setVerificationError(null);

    try {
      // 1. Create the order server-side (the secret key never reaches the browser).
      const response = await apiRequest('/api/payments/cashfree/create-order', {
        method: 'POST',
        body: JSON.stringify({ planName: selectedPlan.name, amountInr: selectedPlan.price, billingCycle: selectedPlan.cycle }),
      });
      const data = await response.json().catch(() => ({ error: `Server error (${response.status}). Please verify server configuration.` }));
      if (!response.ok) throw new Error(data.error || 'Order creation failed.');

      // 2. Open the Cashfree hosted checkout (sandbox test mode) in a popup.
      setStep('VERIFYING');
      const cashfreeFactory = await loadCashfreeSDK();
      const cashfree = cashfreeFactory({ mode: CASHFREE_CONFIG.MODE });
      const result = await cashfree.checkout({
        paymentSessionId: data.paymentSessionId,
        redirectTarget: '_modal',
      });

      // 3. Payment attempt finished — confirm the order status server-side.
      if (result?.paymentDetails) {
        const statusRes = await apiRequest('/api/payments/cashfree/order-status', {
          method: 'POST',
          body: JSON.stringify({ orderId: data.orderId, planName: selectedPlan.name }),
        });
        const status = await statusRes.json().catch(() => ({ error: `Server error (${statusRes.status})` }));
        if (!statusRes.ok) throw new Error(status.error || 'Order status check failed.');

        if (status.orderStatus === 'PAID') {
          setStep('SUCCESS');
          setTimeout(() => {
            onSuccess({
              name: selectedPlan.name,
              price: selectedPlan.price,
              method: 'CASHFREE',
              periodEnd: status.subscription?.periodEnd ?? null,
            });
          }, 2000);
        } else {
          setStep('PAYING');
          setVerificationError('Payment not completed yet. Please try again.');
        }
      } else {
        setStep('PAYING');
        setVerificationError(result?.error?.message || 'The payment window was closed before completing. Please try again.');
      }
    } catch (error: any) {
      setStep('PAYING');
      setVerificationError(error.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          className="bg-zinc-950 border border-white/10 rounded-[32px] w-full max-w-lg overflow-hidden shadow-[0_0_80px_-20px_rgba(59,130,246,0.3)]"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-blue-600/20 via-transparent to-transparent">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                <ShieldCheck className="w-7 h-7 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Nebula Activation</h2>
                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Connect your neural terminal</p>
              </div>
            </div>
            {step !== 'VERIFYING' && (
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-500" />
              </button>
            )}
          </div>

          <div className="p-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
            {step === 'SELECT' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  {PLANS.map((plan, idx) => (
                    <button
                      key={plan.name}
                      onClick={() => handleSelectPlan(plan)}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-2 relative overflow-hidden group
                        ${idx === 4 ? 'col-span-2' : ''}
                        ${selectedPlan?.name === plan.name
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-white/5 bg-white/5 hover:border-white/20'}`}
                    >
                      {selectedPlan?.name === plan.name && (
                        <div className="absolute top-2 right-2 bg-blue-500 rounded-full p-1">
                          <CheckCircle className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                      {planError && !selectedPlan && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute inset-0 rounded-2xl border-2 border-amber-500/70 pointer-events-none"
                        />
                      )}
                      <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest leading-none">{plan.desc}</span>
                      <span className="text-[11px] font-black text-white uppercase tracking-tight leading-none">{plan.name}</span>
                      <div className="text-xl font-black text-white leading-none mt-1">
                        <span className="text-[10px] text-zinc-500 tracking-tighter mr-0.5">₹</span>{plan.price.toLocaleString('en-IN')}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Payment Method</p>

                  {planError && !selectedPlan && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-[10px] text-amber-400 font-black uppercase tracking-widest text-center animate-pulse flex items-center justify-center gap-2"
                    >
                      <AlertTriangle size={12} /> {planError}
                    </motion.p>
                  )}

                  <button
                    onClick={handleStartCashfree}
                    className="w-full p-4 bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 rounded-2xl flex items-center gap-4 transition-all group text-left"
                  >
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                      <CreditCard className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-white uppercase">Pay with Cashfree</p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{selectedPlan ? 'UPI • Cards • Net Banking (Test Mode)' : 'Select a plan above to continue'}</p>
                    </div>
                    <ChevronRight size={16} className="text-slate-600 group-hover:text-white transition-colors shrink-0" />
                  </button>
                </div>
              </div>
            )}

            {step === 'PAYING' && (
              <div className="space-y-6">
                <div className="bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-blue-400/80 uppercase">Order Summary</span>
                    <div className="text-right">
                      <p className="text-xl font-black text-white">₹{selectedPlan?.price.toLocaleString('en-IN')}</p>
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mt-1">{selectedPlan?.name}</p>
                    </div>
                  </div>
                  <p className="text-[9px] text-zinc-500 font-bold uppercase leading-tight text-center pt-2 border-t border-blue-500/10 mt-3 animate-pulse">
                    You will be redirected to the Cashfree secure checkout (Test Mode)
                  </p>
                </div>

                {verificationError && (
                  <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest text-center animate-pulse flex items-center justify-center gap-2">
                    <AlertTriangle size={12} /> {verificationError}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('SELECT')}
                    disabled={isProcessing}
                    className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all disabled:opacity-30"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCashfreePay}
                    disabled={isProcessing}
                    className="flex-[2] py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-30 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <><Loader2 size={14} className="animate-spin" /> Connecting...</>
                    ) : (
                      <>Pay Now — Secure Checkout</>
                    )}
                  </button>
                </div>
              </div>
            )}

            {step === 'VERIFYING' && (
              <div className="py-16 text-center space-y-8">
                <div className="relative w-36 h-36 mx-auto">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 border-t-2 border-blue-500 rounded-full"
                  />
                  <div className="absolute inset-0 border-2 border-white/5 rounded-full" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Cpu className="w-12 h-12 text-blue-400 animate-pulse" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Secure Payment In Progress</h3>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.1em] max-w-[260px] mx-auto leading-relaxed">
                    Complete the payment in the Cashfree window. We are confirming your transaction...
                  </p>
                </div>
              </div>
            )}

            {step === 'SUCCESS' && (
              <div className="py-16 text-center space-y-8">
                <div className="w-28 h-28 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="bg-emerald-500 rounded-full p-3"
                  >
                    <CheckCircle className="w-10 h-10 text-white" />
                  </motion.div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight">Access Unlocked</h3>
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">Neural Link Synchronized</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SubscriptionModal;
