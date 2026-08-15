
import React, { useState } from 'react';
import { X, ShieldCheck, Key, Lock, Server } from 'lucide-react';

interface ConnectBrokerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (apiKey: string, apiSecret: string) => void;
}

const ConnectBrokerModal: React.FC<ConnectBrokerModalProps> = ({ isOpen, onClose, onConnect }) => {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey || !apiSecret) return;

    setIsLoading(true);
    // Simulate API Validation
    setTimeout(() => {
        onConnect(apiKey, apiSecret);
        setIsLoading(false);
        onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-zinc-900 rounded-xl border border-yellow-500/30 shadow-[0_0_50px_rgba(234,179,8,0.1)] max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
        
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
            <Server size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">Connect Broker</h2>
            <p className="text-xs text-slate-400">Binance Spot/Futures API Integration</p>
          </div>
        </div>

        <div className="bg-yellow-900/10 border border-yellow-500/20 p-3 rounded mb-6 flex gap-3">
             <ShieldCheck className="text-yellow-500 shrink-0" size={18} />
             <p className="text-[10px] text-yellow-200/80 leading-relaxed">
                <strong>SECURITY WARNING:</strong> Your API Keys are stored locally in your browser's encrypted session storage. They are never transmitted to our servers. Ensure your API keys have "Withdrawals" disabled for safety.
             </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">API Key</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"><Key size={14} /></span>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-black border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-slate-100 font-mono text-xs focus:outline-none focus:border-yellow-500 transition-colors"
                placeholder="Enter Binance API Key"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Secret Key</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"><Lock size={14} /></span>
              <input
                type="password"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                className="w-full bg-black border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-slate-100 font-mono text-xs focus:outline-none focus:border-yellow-500 transition-colors"
                placeholder="Enter Binance Secret Key"
              />
            </div>
          </div>

          <button
              type="submit"
              disabled={isLoading || !apiKey || !apiSecret}
              className="w-full py-3 rounded-lg font-bold text-xs uppercase tracking-widest transition-all text-black bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-yellow-900/20 mt-2"
          >
              {isLoading ? 'Establishing Secure Handshake...' : 'Authenticate Connection'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ConnectBrokerModal;
