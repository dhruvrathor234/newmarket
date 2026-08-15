
import React, { useState } from 'react';
import { X, Settings, Shield, Target, Check, Layers, Zap } from 'lucide-react';
import { HedgingBotSettings } from '../types';

interface HedgingBotSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: HedgingBotSettings;
  onSave: (settings: HedgingBotSettings) => void;
}

const HedgingBotSettingsModal: React.FC<HedgingBotSettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState<HedgingBotSettings>(settings);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <div className="glass-card rounded-[32px] border border-blue-500/20 max-w-lg w-full p-8 relative animate-in fade-in zoom-in duration-200 bg-zinc-950/90 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
        <button onClick={onClose} className="absolute top-6 right-6 text-zinc-500 hover:text-white"><X size={20}/></button>
        
        <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                <Shield size={24} className="text-blue-500" />
            </div>
            <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Hedging Bot Engine</h2>
                <p className="text-[10px] text-blue-500/60 font-mono uppercase tracking-widest mt-1">Martingale & Hedge Configuration</p>
            </div>
        </div>

        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block ml-1">Initial Lot</label>
                    <input 
                        type="number" step="0.01"
                        value={localSettings.initialLot}
                        onChange={(e) => setLocalSettings({...localSettings, initialLot: parseFloat(e.target.value)})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-xs text-white font-mono outline-none focus:border-blue-500/50"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block ml-1">Lot Multiplier</label>
                    <input 
                        type="number" step="0.1"
                        value={localSettings.lotMultiplier}
                        onChange={(e) => setLocalSettings({...localSettings, lotMultiplier: parseFloat(e.target.value)})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-xs text-white font-mono outline-none focus:border-blue-500/50"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block ml-1">Distance (Pips)</label>
                    <input 
                        type="number" 
                        value={localSettings.distancePips}
                        onChange={(e) => setLocalSettings({...localSettings, distancePips: parseInt(e.target.value)})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-xs text-white font-mono outline-none focus:border-blue-500/50"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block ml-1">Cooldown (Sec)</label>
                    <input 
                        type="number" 
                        value={localSettings.waitAfterCloseSec}
                        onChange={(e) => setLocalSettings({...localSettings, waitAfterCloseSec: parseInt(e.target.value)})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-xs text-white font-mono outline-none focus:border-blue-500/50"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block ml-1">Take Profit (Pips)</label>
                    <input 
                        type="number" 
                        value={localSettings.takeProfitPips}
                        onChange={(e) => setLocalSettings({...localSettings, takeProfitPips: parseInt(e.target.value)})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-xs text-white font-mono outline-none focus:border-blue-500/50"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block ml-1">Stop Loss (Pips)</label>
                    <input 
                        type="number" 
                        value={localSettings.stopLossPips}
                        onChange={(e) => setLocalSettings({...localSettings, stopLossPips: parseInt(e.target.value)})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-xs text-white font-mono outline-none focus:border-blue-500/50"
                    />
                </div>
            </div>

            <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <Target size={14} className="text-blue-500" />
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Profit Target Exit</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-blue-500/60 uppercase tracking-widest block">Min Trades</label>
                        <input 
                            type="number" 
                            value={localSettings.netProfitTriggerAfterTrades}
                            onChange={(e) => setLocalSettings({...localSettings, netProfitTriggerAfterTrades: parseInt(e.target.value)})}
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-xs text-white font-mono"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-blue-500/60 uppercase tracking-widest block">Target (USD)</label>
                        <input 
                            type="number" step="0.1"
                            value={localSettings.profitTargetUSD}
                            onChange={(e) => setLocalSettings({...localSettings, profitTargetUSD: parseFloat(e.target.value)})}
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-xs text-white font-mono"
                        />
                    </div>
                </div>
            </div>

            <button 
                onClick={handleSave}
                className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
                <Check size={16} /> Save Hedging Strategy
            </button>
        </div>
      </div>
    </div>
  );
};

export default HedgingBotSettingsModal;
