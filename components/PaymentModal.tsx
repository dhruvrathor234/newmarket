import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Smartphone, Bitcoin, X, CheckCircle, AlertTriangle, Copy, ExternalLink } from 'lucide-react';
import { billingService } from '../services/billingService';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  amount: number;
  tradeCount: number;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, userId, amount, tradeCount }) => {
  const [step, setStep] = useState<'SELECT' | 'PAYING' | 'SUCCESS'>('SELECT');
  const [method, setMethod] = useState<'UPI' | 'CARD' | 'CRYPTO' | 'NETBANKING' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    setIsProcessing(true);
    // Simulate payment gateway delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      const transactionId = `TXN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      await billingService.processPayment(userId, amount, method || 'UPI', transactionId);
      setStep('SUCCESS');
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast here
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="p-6 border-bottom border-white/5 flex justify-between items-center bg-gradient-to-r from-emerald-500/10 to-transparent">
            <div>
              <h2 className="text-xl font-bold text-white">Service Charge Payment</h2>
              <p className="text-xs text-slate-400 mt-1">20% Profit Share (After {tradeCount} trades)</p>
            </div>
            {step !== 'PAYING' && (
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            )}
          </div>

          <div className="p-6">
            {step === 'SELECT' && (
              <div className="space-y-6">
                <div className="bg-black/40 rounded-xl p-4 border border-white/5 flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Amount Due</span>
                  <span className="text-2xl font-mono font-bold text-emerald-400">${amount.toFixed(2)}</span>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Select Payment Method</p>
                  
                  <button 
                    onClick={() => { setMethod('UPI'); setStep('PAYING'); }}
                    className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl flex items-center gap-4 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Smartphone className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-white">UPI / Local Methods</p>
                      <p className="text-[10px] text-slate-500">GPay, PhonePe, Paytm (India)</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => { setMethod('CARD'); setStep('PAYING'); }}
                    className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl flex items-center gap-4 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <CreditCard className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-white">Credit / Debit Card</p>
                      <p className="text-[10px] text-slate-500">Visa, Mastercard, RuPay</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => { setMethod('CRYPTO'); setStep('PAYING'); }}
                    className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl flex items-center gap-4 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Bitcoin className="w-5 h-5 text-orange-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-white">Crypto Payment</p>
                      <p className="text-[10px] text-slate-500">USDT (TRC20), BTC, ETH</p>
                    </div>
                  </button>
                </div>

                <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-yellow-500/80 leading-relaxed">
                    Trading and indicators are currently paused. Services will resume immediately after payment confirmation.
                  </p>
                </div>
              </div>
            )}

            {step === 'PAYING' && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <p className="text-slate-400 text-sm">Paying via {method}</p>
                  <p className="text-3xl font-mono font-bold text-white">${amount.toFixed(2)}</p>
                </div>

                {method === 'UPI' && (
                  <div className="bg-black/40 border border-white/5 rounded-xl p-6 space-y-4 text-center">
                    <div className="w-32 h-32 bg-white mx-auto rounded-lg p-2">
                      {/* Placeholder for QR Code */}
                      <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                        <Smartphone className="w-12 h-12 text-slate-400" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] text-slate-500 uppercase font-bold">UPI ID</p>
                      <div className="flex items-center justify-center gap-2">
                        <code className="bg-white/5 px-2 py-1 rounded text-emerald-400 text-sm">nebulamarket@upi</code>
                        <button onClick={() => copyToClipboard('nebulamarket@upi')} className="p-1 hover:bg-white/10 rounded">
                          <Copy className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {method === 'CRYPTO' && (
                  <div className="bg-black/40 border border-white/5 rounded-xl p-6 space-y-4">
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <p className="text-[10px] text-slate-500 uppercase font-bold">USDT Address (TRC20)</p>
                        <div className="flex items-center gap-2 bg-white/5 p-2 rounded border border-white/5">
                          <code className="text-[10px] text-orange-400 break-all">TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t</code>
                          <button onClick={() => copyToClipboard('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t')} className="p-1 hover:bg-white/10 rounded shrink-0">
                            <Copy className="w-4 h-4 text-slate-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {method === 'CARD' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-500 uppercase font-bold px-1">Card Number</label>
                      <input type="text" placeholder="**** **** **** ****" className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-emerald-500 outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] text-slate-500 uppercase font-bold px-1">Expiry</label>
                        <input type="text" placeholder="MM/YY" className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-emerald-500 outline-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-slate-500 uppercase font-bold px-1">CVV</label>
                        <input type="password" placeholder="***" className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-emerald-500 outline-none" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button 
                    onClick={() => setStep('SELECT')}
                    disabled={isProcessing}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button 
                    onClick={handlePayment}
                    disabled={isProcessing}
                    className="flex-[2] py-3 bg-emerald-500 hover:bg-emerald-600 text-black rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    ) : (
                      <>Confirm Payment</>
                    )}
                  </button>
                </div>
              </div>
            )}

            {step === 'SUCCESS' && (
              <div className="py-8 text-center space-y-6">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-10 h-10 text-emerald-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-white">Payment Successful</h3>
                  <p className="text-slate-400 text-sm">Your services have been reactivated.</p>
                </div>
                <button 
                  onClick={onClose}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-black rounded-xl font-bold transition-all"
                >
                  Return to Terminal
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PaymentModal;
