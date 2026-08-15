
import React, { useState } from 'react';
import { Cpu, Power, Sparkles, BrainCircuit, Play, ShieldAlert } from 'lucide-react';

interface CustomBotPanelProps {
  isActive: boolean;
  onToggle: () => void;
  logic: string;
  onLogicChange: (val: string) => void;
  onDeploy: () => void;
  isLocked?: boolean;
}

const CustomBotPanel: React.FC<CustomBotPanelProps> = ({ isActive, onToggle, logic, onLogicChange, onDeploy, isLocked }) => {
  const [isDeploying, setIsDeploying] = useState(false);

  const handleDeployClick = () => {
    if (isLocked) return;
    setIsDeploying(true);
    setTimeout(() => {
        setIsDeploying(false);
        onDeploy();
    }, 1000);
  };

  return (
    <div className={`bg-[#121418] border-t border-white/5 flex flex-col p-4 space-y-4 ${isLocked ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
            <BrainCircuit size={16} className="text-blue-500" />
            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Custom AI Bot</span>
        </div>
        <button 
            onClick={() => !isLocked && onToggle()}
            disabled={isLocked}
            className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all ${isActive ? 'bg-blue-600/10 border-blue-500/40 text-blue-400' : 'bg-white/5 border-white/10 text-slate-500'} ${isLocked ? 'border-red-500/20 text-red-500/50' : ''}`}
        >
            <Power size={10} className={isActive ? 'animate-pulse' : ''} />
            <span className="text-[8px] font-black uppercase tracking-widest">{isLocked ? 'Locked' : isActive ? 'Deactivate' : 'Activate'}</span>
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center px-1">
            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Logic Interface (TS/Natural)</span>
            <div className="flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-blue-500 shadow-[0_0_5px_#3b82f6]"></div>
                <span className="text-[8px] text-blue-500 font-mono uppercase">Nebula Compiler v1.2</span>
            </div>
        </div>
        <div className="relative group">
            <div className="absolute inset-0 bg-blue-500/5 blur-[20px] rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
            <textarea 
                value={logic}
                onChange={(e) => onLogicChange(e.target.value)}
                placeholder="e.g. if(price > 3000) { buy(0.1, sl: 2990, tp: 3050) }"
                className="w-full h-32 bg-black/60 border border-white/5 rounded-xl p-3 text-[11px] text-blue-100 font-mono focus:border-blue-500/30 outline-none resize-none placeholder:text-slate-800 relative z-10 transition-all custom-scrollbar"
            />
            {!logic && (
                <div className="absolute top-10 left-3 text-[9px] text-slate-700 pointer-events-none italic">
                    Example: "Wait for gold to reach 2680 then buy 0.2 lots with $5 SL"
                </div>
            )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={handleDeployClick}
            disabled={!logic || isDeploying}
            className="flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black text-slate-300 uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all disabled:opacity-30"
          >
             {isDeploying ? <div className="w-3 h-3 border-2 border-t-transparent border-blue-500 rounded-full animate-spin"></div> : <Sparkles size={12} className="text-blue-500" />}
             <span>Compile Logic</span>
          </button>
          
          <button 
            onClick={onToggle}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-xl ${isActive ? 'bg-blue-600 text-white shadow-blue-900/40' : 'bg-black/60 text-slate-600 border border-white/5 hover:border-white/20'}`}
          >
             <Play size={12} className={isActive ? 'fill-current' : ''} />
             <span>{isActive ? 'Engaged' : 'Deploy Bot'}</span>
          </button>
      </div>

      <div className="p-2.5 bg-rose-500/5 border border-rose-500/10 rounded-xl flex gap-2">
          <ShieldAlert size={14} className="text-rose-500 shrink-0" />
          <p className="text-[8px] text-rose-500/70 leading-relaxed font-bold uppercase tracking-tight">
              Safety Protocol: Custom logic is interpreted by Gemini 3. Ensure your instructions are clear to avoid execution errors.
          </p>
      </div>
    </div>
  );
};

export default CustomBotPanel;
