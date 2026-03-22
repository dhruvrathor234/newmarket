
import React, { useState } from 'react';
import { X, Settings, Sliders, Target, Check } from 'lucide-react';
import { NebulaV5Settings } from '../types';

interface NebulaV5SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: NebulaV5Settings;
  onSave: (settings: NebulaV5Settings) => void;
}

const NebulaV5SettingsModal: React.FC<NebulaV5SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState<NebulaV5Settings>(settings);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <div className="glass-card rounded-[32px] border border-blue-500/20 max-w-lg w-full p-8 relative animate-in fade-in zoom-in duration-200 bg-zinc-950/90 shadow-2xl">
        <button onClick={onClose} className="absolute top-6 right-6 text-zinc-500 hover:text-white"><X size={20}/></button>
        
        <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                <Settings size={24} className="text-blue-500" />
            </div>
            <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Nebula V5 Bot Engine</h2>
                <p className="text-[10px] text-blue-500/60 font-mono uppercase tracking-widest mt-1">Algorithmic Configuration</p>
            </div>
        </div>

        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block ml-1">MA Type</label>
                    <select 
                        value={localSettings.basisType}
                        onChange={(e) => setLocalSettings({...localSettings, basisType: e.target.value as any})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-xs text-white outline-none focus:border-blue-500/50"
                    >
                        <option value="ALMA">Arnaud Legoux (ALMA)</option>
                        <option value="TEMA">Triple Exponential (TEMA)</option>
                        <option value="HullMA">Hull Moving Average (HMA)</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block ml-1">MA Period</label>
                    <input 
                        type="number" 
                        value={localSettings.basisLen}
                        onChange={(e) => setLocalSettings({...localSettings, basisLen: parseInt(e.target.value)})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-xs text-white font-mono outline-none focus:border-blue-500/50"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block ml-1">Pivot Period</label>
                    <input 
                        type="number" 
                        value={localSettings.pivotPeriod}
                        onChange={(e) => setLocalSettings({...localSettings, pivotPeriod: parseInt(e.target.value)})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-xs text-white font-mono outline-none focus:border-blue-500/50"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block ml-1">Timeframe</label>
                    <select 
                        value={localSettings.timeframe}
                        onChange={(e) => setLocalSettings({...localSettings, timeframe: e.target.value})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-xs text-white outline-none focus:border-blue-500/50"
                    >
                        <option value="1m">1m</option>
                        <option value="5m">5m</option>
                        <option value="15m">15m</option>
                        <option value="1h">1h</option>
                    </select>
                </div>
            </div>

            {localSettings.basisType === 'ALMA' && (
                <div className="grid grid-cols-2 gap-6 p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-blue-500/60 uppercase tracking-widest block">ALMA Offset</label>
                        <input 
                            type="number" step="0.01"
                            value={localSettings.offsetALMA}
                            onChange={(e) => setLocalSettings({...localSettings, offsetALMA: parseFloat(e.target.value)})}
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-xs text-white font-mono"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-blue-500/60 uppercase tracking-widest block">ALMA Sigma</label>
                        <input 
                            type="number" 
                            value={localSettings.offsetSigma}
                            onChange={(e) => setLocalSettings({...localSettings, offsetSigma: parseInt(e.target.value)})}
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-xs text-white font-mono"
                        />
                    </div>
                </div>
            )}

            <button 
                onClick={handleSave}
                className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
                <Check size={16} /> Save Bot Settings
            </button>
        </div>
      </div>
    </div>
  );
};

export default NebulaV5SettingsModal;
