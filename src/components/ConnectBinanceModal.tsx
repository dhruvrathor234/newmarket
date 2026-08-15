
import React, { useState } from 'react';
import { X, Key, ShieldCheck, Info, ExternalLink, Lock, Server } from 'lucide-react';

interface ConnectBinanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConnect: (apiKey: string, apiSecret: string, server?: string) => void;
    initialApiKey?: string;
    initialApiSecret?: string;
    initialServer?: string;
    type?: 'BINANCE' | 'METATRADER';
}

const ConnectBinanceModal: React.FC<ConnectBinanceModalProps> = ({ isOpen, onClose, onConnect, initialApiKey, initialApiSecret, initialServer, type = 'BINANCE' }) => {
    const [apiKey, setApiKey] = useState(initialApiKey || '');
    const [apiSecret, setApiSecret] = useState(initialApiSecret || '');
    const [server, setServer] = useState(initialServer || '');
    const [showSecret, setShowSecret] = useState(false);

    React.useEffect(() => {
        if (isOpen) {
            setApiKey(initialApiKey || '');
            setApiSecret(initialApiSecret || '');
            setServer(initialServer || '');
        }
    }, [isOpen, initialApiKey, initialApiSecret, initialServer]);

    if (!isOpen) return null;

    const isBinance = type === 'BINANCE';

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-[#121418] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isBinance ? 'bg-yellow-500/10 text-yellow-500' : 'bg-blue-500/10 text-blue-500'}`}>
                            <ShieldCheck size={20} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-white uppercase tracking-widest">{isBinance ? 'Connect Binance API' : 'Link MetaTrader Account'}</h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Real Account Integration</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className={`p-4 rounded-xl border space-y-2 ${isBinance ? 'bg-yellow-500/5 border-yellow-500/10' : 'bg-blue-500/5 border-blue-500/10'}`}>
                        <div className={`flex items-center gap-2 ${isBinance ? 'text-yellow-500' : 'text-blue-400'}`}>
                            <Info size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Setup Instructions</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                            {isBinance ? (
                                <>Create a new API Key on Binance with <span className="text-emerald-500 font-bold">Enable Spot Trading</span> checked. Ensure <span className="text-rose-500 font-bold">Enable Withdrawals</span> is <span className="underline">unchecked</span>.</>
                            ) : (
                                <>Enter your MetaTrader <span className="text-blue-400 font-bold">Account ID</span> and <span className="text-blue-400 font-bold">Investor Password</span>. This allows the AI to synchronize your <span className="text-emerald-500">Real-Time Balance</span> while keeping your account secure.</>
                            )}
                        </p>
                        {isBinance && (
                            <a 
                                href="https://www.binance.com/en/my/settings/api-management" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[10px] font-bold text-blue-500 hover:text-blue-400 transition-colors mt-2"
                            >
                                Binance API Management <ExternalLink size={10} />
                            </a>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{isBinance ? 'API Key' : 'Account ID'}</label>
                            <div className="relative">
                                <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                                <input 
                                    type="text" 
                                    value={apiKey}
                                    onChange={e => setApiKey(e.target.value)}
                                    placeholder={isBinance ? "Enter your Binance API Key" : "Enter MT Account ID"}
                                    className={`w-full bg-black/40 border border-white/5 rounded-xl h-12 pl-10 pr-4 text-white text-xs font-mono outline-none transition-all ${isBinance ? 'focus:border-yellow-500/50' : 'focus:border-blue-500/50'}`}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{isBinance ? 'Secret Key' : 'Master Password'}</label>
                            <div className="relative">
                                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                                <input 
                                    type={showSecret ? "text" : "password"}
                                    value={apiSecret}
                                    onChange={e => setApiSecret(e.target.value)}
                                    placeholder={isBinance ? "Enter your Binance Secret Key" : "Enter MT Investor Password"}
                                    className={`w-full bg-black/40 border border-white/5 rounded-xl h-12 pl-10 pr-12 text-white text-xs font-mono outline-none transition-all ${isBinance ? 'focus:border-yellow-500/50' : 'focus:border-blue-500/50'}`}
                                />
                                <button 
                                    onClick={() => setShowSecret(!showSecret)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors"
                                >
                                    <Info size={16} />
                                </button>
                            </div>
                        </div>

                        {!isBinance && (
                            <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Broker Server</label>
                                <div className="relative">
                                    <Server size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                                    <input 
                                        type="text" 
                                        value={server}
                                        onChange={e => setServer(e.target.value)}
                                        placeholder="e.g. IC-Markets-Real2"
                                        className="w-full bg-black/40 border border-white/5 rounded-xl h-12 pl-10 pr-4 text-white text-xs font-mono outline-none focus:border-blue-500/50 transition-all"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-4">
                        <button 
                            onClick={() => onConnect(apiKey, apiSecret, server)}
                            disabled={!apiKey || !apiSecret || (!isBinance && !server)}
                            className={`w-full py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[11px] transition-all shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:grayscale ${isBinance ? 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-yellow-900/20' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20'}`}
                        >
                            {isBinance ? 'Connect Binance' : 'Synchronize Account'}
                        </button>
                    </div>
                </div>

                <div className="p-4 bg-black/40 border-t border-white/5 flex items-center justify-center gap-2">
                    <ShieldCheck size={12} className="text-emerald-500" />
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">End-to-End Encrypted Connection</span>
                </div>
            </div>
        </div>
    );
};

export default ConnectBinanceModal;
