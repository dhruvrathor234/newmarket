
import React, { useState, useEffect } from 'react';
import { X, Settings, Shield, Zap, TrendingUp, Clock, Activity } from 'lucide-react';
import { HFTBotSettings } from '../types';

interface HFTBotSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: HFTBotSettings;
  onSave: (settings: HFTBotSettings) => void;
}

const HFTBotSettingsModal: React.FC<HFTBotSettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState<HFTBotSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-[#121418] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400">
              <Zap size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-widest">HFT Bot Configuration</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">High-Frequency Trading Protocol v1.0</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {/* General Settings */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-blue-400">
              <Settings size={14} />
              <h3 className="text-[10px] font-black uppercase tracking-widest">General Settings</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Magic Number</label>
                <input 
                  type="number" 
                  value={localSettings.magicNumber}
                  onChange={e => setLocalSettings({...localSettings, magicNumber: parseInt(e.target.value)})}
                  className="w-full bg-black/40 border border-white/5 rounded-lg h-10 px-4 text-white font-mono text-sm outline-none focus:border-blue-500/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Slippage</label>
                <input 
                  type="number" 
                  value={localSettings.slippage}
                  onChange={e => setLocalSettings({...localSettings, slippage: parseInt(e.target.value)})}
                  className="w-full bg-black/40 border border-white/5 rounded-lg h-10 px-4 text-white font-mono text-sm outline-none focus:border-blue-500/50"
                />
              </div>
            </div>
          </section>

          {/* Time Settings */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-amber-400">
              <Clock size={14} />
              <h3 className="text-[10px] font-black uppercase tracking-widest">Time Settings</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Start Hour (UTC)</label>
                <input 
                  type="number" min="0" max="23"
                  value={localSettings.startHour}
                  onChange={e => setLocalSettings({...localSettings, startHour: parseInt(e.target.value)})}
                  className="w-full bg-black/40 border border-white/5 rounded-lg h-10 px-4 text-white font-mono text-sm outline-none focus:border-blue-500/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">End Hour (UTC)</label>
                <input 
                  type="number" min="0" max="24"
                  value={localSettings.endHour}
                  onChange={e => setLocalSettings({...localSettings, endHour: parseInt(e.target.value)})}
                  className="w-full bg-black/40 border border-white/5 rounded-lg h-10 px-4 text-white font-mono text-sm outline-none focus:border-blue-500/50"
                />
              </div>
            </div>
          </section>

          {/* Money Management */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-400">
              <Shield size={14} />
              <h3 className="text-[10px] font-black uppercase tracking-widest">Money Management</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Lot Type</label>
                <select 
                  value={localSettings.lotType}
                  onChange={e => setLocalSettings({...localSettings, lotType: e.target.value as any})}
                  className="w-full bg-black/40 border border-white/5 rounded-lg h-10 px-4 text-white text-[10px] font-bold uppercase outline-none focus:border-blue-500/50"
                >
                  <option value="FIXED">Fixed Lots</option>
                  <option value="BALANCE_PCT">% of Balance</option>
                  <option value="EQUITY_PCT">% of Equity</option>
                  <option value="FREE_MARGIN_PCT">% of Free Margin</option>
                </select>
              </div>
              {localSettings.lotType === 'FIXED' ? (
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Fixed Lot Size</label>
                  <input 
                    type="number" step="0.01"
                    value={localSettings.fixedLot}
                    onChange={e => setLocalSettings({...localSettings, fixedLot: parseFloat(e.target.value)})}
                    className="w-full bg-black/40 border border-white/5 rounded-lg h-10 px-4 text-white font-mono text-sm outline-none focus:border-blue-500/50"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Risk Percentage</label>
                  <input 
                    type="number" step="0.1"
                    value={localSettings.riskPercent}
                    onChange={e => setLocalSettings({...localSettings, riskPercent: parseFloat(e.target.value)})}
                    className="w-full bg-black/40 border border-white/5 rounded-lg h-10 px-4 text-white font-mono text-sm outline-none focus:border-blue-500/50"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Trade Settings */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-rose-400">
              <Activity size={14} />
              <h3 className="text-[10px] font-black uppercase tracking-widest">Trade Settings (Points)</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Delta (Order Distance)</label>
                <input 
                  type="number" 
                  value={localSettings.delta}
                  onChange={e => setLocalSettings({...localSettings, delta: parseInt(e.target.value)})}
                  className="w-full bg-black/40 border border-white/5 rounded-lg h-10 px-4 text-white font-mono text-sm outline-none focus:border-blue-500/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Max Order Distance</label>
                <input 
                  type="number" 
                  value={localSettings.maxDistance}
                  onChange={e => setLocalSettings({...localSettings, maxDistance: parseInt(e.target.value)})}
                  className="w-full bg-black/40 border border-white/5 rounded-lg h-10 px-4 text-white font-mono text-sm outline-none focus:border-blue-500/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Stop Loss</label>
                <input 
                  type="number" 
                  value={localSettings.stopLoss}
                  onChange={e => setLocalSettings({...localSettings, stopLoss: parseInt(e.target.value)})}
                  className="w-full bg-black/40 border border-white/5 rounded-lg h-10 px-4 text-white font-mono text-sm outline-none focus:border-blue-500/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Max Trailing</label>
                <input 
                  type="number" 
                  value={localSettings.maxTrailing}
                  onChange={e => setLocalSettings({...localSettings, maxTrailing: parseInt(e.target.value)})}
                  className="w-full bg-black/40 border border-white/5 rounded-lg h-10 px-4 text-white font-mono text-sm outline-none focus:border-blue-500/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Max Spread</label>
                <input 
                  type="number" 
                  value={localSettings.maxSpread}
                  onChange={e => setLocalSettings({...localSettings, maxSpread: parseInt(e.target.value)})}
                  className="w-full bg-black/40 border border-white/5 rounded-lg h-10 px-4 text-white font-mono text-sm outline-none focus:border-blue-500/50"
                />
              </div>
            </div>
          </section>
        </div>

        <div className="p-6 border-t border-white/5 bg-black/40 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-white/5 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/40"
          >
            Deploy HFT Protocol
          </button>
        </div>
      </div>
    </div>
  );
};

export default HFTBotSettingsModal;
