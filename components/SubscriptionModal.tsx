import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Smartphone, Bitcoin, X, CheckCircle, AlertTriangle, Copy, Upload, Camera, CreditCard, ChevronRight, Info, Cpu } from 'lucide-react';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (plan: { name: string, price: number, method: string }) => void;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState<'SELECT' | 'PAYING' | 'VERIFYING' | 'SUCCESS'>('SELECT');
  const [selectedPlan, setSelectedPlan] = useState<{ name: string, price: number } | null>(null);
  const [method, setMethod] = useState<'UPI' | 'USDT_TRC20' | 'USDT_ERC20' | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number>(93.5); // Default buffer rate
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch live exchange rate
  React.useEffect(() => {
    const fetchRate = async () => {
      try {
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await res.json();
        if (data.rates && data.rates.INR) {
          // Add a small buffer for platform/p2p rates
          setExchangeRate(Math.ceil(data.rates.INR + 0.5));
        }
      } catch (err) {
        console.error("Exchange rate fetch failed, using fallback:", err);
      }
    };
    if (isOpen) fetchRate();
  }, [isOpen]);

  const PLANS = [
    { name: 'Starter Pro', price: 1.00, desc: 'Essential Access' },
    { name: 'Expert Weekly', price: 10.00, desc: 'Weekly Sub' },
    { name: 'Neural Monthly', price: 35.00, desc: 'Most Popular' },
    { name: 'Pro 6-Months', price: 200.00, desc: 'Neural Saver' },
    { name: 'Ultimate Annual', price: 350.00, desc: 'Yearly Access' }
  ];

  const handleSelectPlan = (plan: typeof PLANS[0]) => {
    setSelectedPlan(plan);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshot(reader.result as string);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!screenshot || !selectedPlan || !method) return;
    setStep('VERIFYING');
    
    // Simulate AI Verification
    await new Promise(resolve => setTimeout(resolve, 3500));
    
    setStep('SUCCESS');
    setTimeout(() => {
      onSuccess({ name: selectedPlan.name, price: selectedPlan.price, method });
    }, 2000);
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
                      <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest leading-none">{plan.desc}</span>
                      <span className="text-[11px] font-black text-white uppercase tracking-tight leading-none">{plan.name}</span>
                      <div className="text-xl font-black text-white leading-none mt-1">
                        <span className="text-[10px] text-zinc-500 tracking-tighter mr-0.5">$</span>{plan.price}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Network Protocol</p>
                  
                  <button 
                    disabled={!selectedPlan}
                    onClick={() => { setMethod('UPI'); setStep('PAYING'); }}
                    className="w-full p-4 bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 rounded-2xl flex items-center justify-between transition-all group disabled:opacity-20"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20">
                        <Smartphone className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black text-white uppercase tracking-tight">UPI Transfer</p>
                        <p className="text-[9px] text-slate-500 font-medium">Fast Local Processing</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-700" />
                  </button>

                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      disabled={!selectedPlan}
                      onClick={() => { setMethod('USDT_TRC20'); setStep('PAYING'); }}
                      className="p-4 bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 rounded-2xl flex flex-col gap-2 transition-all group disabled:opacity-20"
                    >
                      <Bitcoin className="w-6 h-6 text-orange-400" />
                      <p className="text-[10px] font-black text-white uppercase">USDT (TRC-20)</p>
                    </button>
                    <button 
                      disabled={!selectedPlan}
                      onClick={() => { setMethod('USDT_ERC20'); setStep('PAYING'); }}
                      className="p-4 bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 rounded-2xl flex flex-col gap-2 transition-all group disabled:opacity-20"
                    >
                      <Bitcoin className="w-6 h-6 text-blue-400" />
                      <p className="text-[10px] font-black text-white uppercase">USDT (ERC-20)</p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {step === 'PAYING' && (
              <div className="space-y-6">
                <div className="bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-blue-400/80 uppercase">Total Due</span>
                    <div className="text-right">
                      <p className="text-xl font-black text-white">${selectedPlan?.price} USD</p>
                      {method === 'UPI' && (
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mt-1">
                          ≈ ₹{Math.round((selectedPlan?.price || 0) * exchangeRate)} INR
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-[9px] text-zinc-500 font-bold uppercase leading-tight animate-pulse text-center pt-2 border-t border-blue-500/10">
                    {method === 'UPI' 
                      ? `Send exactly ₹${Math.round((selectedPlan?.price || 0) * exchangeRate)} to the UPI ID below & upload screenshot`
                      : 'Send exact same amount on this address & upload screenshot'}
                  </p>
                </div>

                <div className="bg-black/60 border border-white/10 rounded-2xl p-6 space-y-5 text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
                  
                  <div className="space-y-2">
                    <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Target Identifier</p>
                    <div className="bg-white/5 px-4 py-4 rounded-xl border border-white/5 flex items-center justify-between gap-3">
                      <code className="text-blue-400 text-xs font-mono break-all text-left">
                        {method === 'UPI' ? 'nebulamarket92-1@okicici' : 
                         method === 'USDT_ERC20' ? '0xf725af6ad4bd8340b3e9e39758d9ef6f7cfcc371' : 
                         'TEbdmue8iCNho6ChGmbXTv8f9btXcXMkWo'}
                      </code>
                      <button 
                        onClick={() => copyToClipboard(
                          method === 'UPI' ? 'nebulamarket92-1@okicici' : 
                          method === 'USDT_ERC20' ? '0xf725af6ad4bd8340b3e9e39758d9ef6f7cfcc371' : 
                          'TEbdmue8iCNho6ChGmbXTv8f9btXcXMkWo'
                        )} 
                        className="p-2.5 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors shrink-0"
                      >
                        <Copy className="w-4 h-4 text-blue-400" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                   <button 
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full py-6 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2
                                ${screenshot ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10 hover:border-blue-500/40 bg-white/[0.02]'}`}
                   >
                     {screenshot ? (
                        <>
                          <CheckCircle className="w-6 h-6 text-emerald-400" />
                          <span className="text-[10px] font-black text-emerald-400 uppercase">Screenshot Captured</span>
                        </>
                     ) : (
                        <>
                          <Camera className="w-6 h-6 text-slate-500" />
                          <span className="text-[10px] font-black text-slate-400 uppercase">Upload Payment SS</span>
                          <span className="text-[8px] text-slate-600 font-bold uppercase tracking-widest text-center px-10">Upload and wait for approve your transaction</span>
                        </>
                     )}
                   </button>
                   <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep('SELECT')} className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all">Back</button>
                  <button 
                    disabled={!screenshot}
                    onClick={handleSubmit}
                    className="flex-[2] py-4 bg-blue-500 hover:bg-blue-600 disabled:opacity-20 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all"
                  >
                    Confirm Payment
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
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">AI Audit In Progress</h3>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.1em] max-w-[260px] mx-auto leading-relaxed">
                    Analyzing transmission metadata and validating wallet network signatures...
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
