
import React, { useState, useEffect } from 'react';
import { Settings, Shield, Target, Zap, Activity, Cpu, Power, Search, Bot, Clock } from 'lucide-react';
import { RiskSettings, Symbol, TradeType, BotStrategy } from '../types';
import { ASSETS } from '../constants';

interface RiskPanelProps {
  symbol: Symbol;
  settings: RiskSettings;
  onUpdate: (settings: RiskSettings) => void;
  balance: number;
  onManualTrade: (type: TradeType, lots: number, slDist: number, tpDist: number) => void;
  isBotActive: boolean;
  onToggleBot: () => void;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  // Bot Strategies
  activeStrategy?: BotStrategy;
  onSetStrategy?: (s: BotStrategy) => void;
  selectedTimeframe?: string;
  onSetTimeframe?: (tf: string) => void;
  isBuilderMode?: boolean; // Prop to differentiate if we are in builder view
}

const RiskPanel: React.FC<RiskPanelProps> = ({ 
  symbol, 
  settings, 
  onUpdate, 
  balance, 
  onManualTrade,
  isBotActive,
  onToggleBot,
  isAnalyzing,
  onAnalyze,
  activeStrategy = 'SENTIMENT',
  onSetStrategy,
  selectedTimeframe = '5m',
  onSetTimeframe,
  isBuilderMode = false
}) => {
  
  const contractSize = ASSETS[symbol].CONTRACT_SIZE;
  const riskAmount = (balance * settings.riskPercentage) / 100;
  const estimatedLotSize = riskAmount / (settings.stopLossDistance * contractSize);

  const [manualLots, setManualLots] = useState(0.1);
  const [manualSL, setManualSL] = useState(settings.stopLossDistance);
  const [manualTP, setManualTP] = useState(settings.takeProfitDistance);

  useEffect(() => {
    setManualSL(ASSETS[symbol].DEFAULT_STOP_LOSS);
    setManualTP(ASSETS[symbol].DEFAULT_TAKE_PROFIT);
  }, [symbol]);

  const handleChange = (key: keyof RiskSettings, value: number) => {
    onUpdate({ ...settings, [key]: value });
  };

  // Only built-in strategies for the Terminal RiskPanel
  const STRATEGIES: {id: BotStrategy, label: string, color: string}[] = [
      { id: 'SENTIMENT', label: 'AI News', color: 'bg-blue-600' },
      { id: 'TECHNICAL_V2', label: 'Technical', color: 'bg-purple-600' },
      { id: 'NEBULA_V6', label: 'V6 Fractal', color: 'bg-indigo-600' },
  ];

  const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h'];
  const maxSL = symbol === 'BTCUSD' ? 2000 : 100;
  const maxTP = symbol === 'BTCUSD' ? 5000 : 200;

  return (
    <div className="glass-panel rounded-sm flex flex-col h-full">
      <div className="px-3 py-2 border-b border-white/5 flex justify-between items-center bg-black/20">
        <div className="flex items-center gap-2">
            <Settings size={12} className="text-blue-400" />
            <h3 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Execution & Risk</h3>
        </div>
        <div className="text-[10px] text-blue-400/80 font-mono bg-blue-500/10 px-1.5 rounded border border-blue-500/20">
            {symbol}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-5 flex-1 overflow-y-auto custom-scrollbar">
        
        {!isBuilderMode && onSetStrategy && (
            <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                    <Bot size={12} className="text-purple-400" />
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Engine Selection</span>
                </div>
                <div className="grid grid-cols-3 gap-2 bg-black/40 p-1 rounded border border-white/5">
                    {STRATEGIES.map(st => (
                         <button 
                            key={st.id}
                            onClick={() => onSetStrategy(st.id)}
                            className={`py-2 text-[8px] font-bold uppercase tracking-wide rounded transition-all ${
                                activeStrategy === st.id 
                                ? `${st.color} text-white shadow-lg` 
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                        >
                            {st.label}
                        </button>
                    ))}
                </div>

                {(activeStrategy === 'NEBULA_V5' || activeStrategy === 'NEBULA_V6') && onSetTimeframe && (
                     <div className="mt-2 animate-fade-in">
                        <div className="flex items-center gap-2 mb-1">
                            <Clock size={12} className="text-emerald-400" />
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Strategy Timeframe</span>
                        </div>
                        <div className="flex gap-1 bg-black/40 p-1 rounded border border-white/5 overflow-x-auto">
                            {TIMEFRAMES.map(tf => (
                                <button
                                   key={tf}
                                   onClick={() => onSetTimeframe(tf)}
                                   className={`flex-1 py-1 text-[9px] font-mono font-bold rounded transition-colors ${
                                      selectedTimeframe === tf 
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                      : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                                   }`}
                                >
                                    {tf}
                                </button>
                            ))}
                        </div>
                     </div>
                )}

                <div className="px-2 py-1.5 bg-white/5 rounded border border-white/5 mt-1">
                    <p className="text-[9px] text-slate-400 leading-tight">
                        {activeStrategy === 'SENTIMENT' && "Analysis based on News Sentiment & Web Search (Gemini 3)."}
                        {activeStrategy === 'TECHNICAL_V2' && "Legacy Technical Pivot & RSI based execution engine."}
                        {activeStrategy === 'NEBULA_V6' && `V6 High-Accuracy Fractal Analysis + ALMA Filter on ${selectedTimeframe}.`}
                    </p>
                </div>
            </div>
        )}

        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-1 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Risk Guardrails</span>
            </div>

            <div className="group">
                <div className="flex justify-between text-[10px] mb-2 font-mono">
                    <span className="text-slate-400">Risk %</span>
                    <span className="text-blue-400">{settings.riskPercentage}% <span className="text-slate-600 opacity-50">(${riskAmount.toFixed(0)})</span></span>
                </div>
                <input 
                  type="range" min="0.1" max="5" step="0.1"
                  value={settings.riskPercentage}
                  onChange={(e) => handleChange('riskPercentage', parseFloat(e.target.value))}
                  className="w-full h-0.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
            </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="group">
                    <div className="flex justify-between text-[10px] mb-2 font-mono">
                        <span className="text-slate-400">SL (pts)</span>
                        <span className="text-rose-400">{settings.stopLossDistance}</span>
                    </div>
                    <input 
                    type="range" min="0.1" max={maxSL} step="0.1"
                    value={settings.stopLossDistance}
                    onChange={(e) => handleChange('stopLossDistance', parseFloat(e.target.value))}
                    className="w-full h-0.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                <div className="group">
                    <div className="flex justify-between text-[10px] mb-2 font-mono">
                        <span className="text-slate-400">TP (pts)</span>
                        <span className="text-emerald-400">{settings.takeProfitDistance}</span>
                    </div>
                    <input 
                    type="range" min="0.1" max={maxTP} step="0.1"
                    value={settings.takeProfitDistance}
                    onChange={(e) => handleChange('takeProfitDistance', parseFloat(e.target.value))}
                    className="w-full h-0.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
            </div>
            
            <div className="flex justify-between items-center p-2 rounded bg-white/[0.02] border border-white/5">
                 <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Auto-Lot Calc</span>
                 <span className="font-mono text-xs text-blue-300">{estimatedLotSize.toFixed(2)}</span>
            </div>
        </div>

        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

        <div className="flex flex-col gap-3">
             <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-1 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.8)]"></div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Manual Trade</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
                 <div className="bg-black/40 p-1.5 rounded border border-white/5">
                    <label className="text-[8px] text-slate-500 block mb-1 uppercase tracking-wider text-center">Lots</label>
                    <input type="number" step="0.01" value={manualLots} onChange={(e) => setManualLots(parseFloat(e.target.value))} className="w-full bg-transparent text-sm font-mono text-white outline-none text-center" />
                 </div>
                 <div className="bg-black/40 p-1.5 rounded border border-white/5">
                    <label className="text-[8px] text-rose-500/70 block mb-1 uppercase tracking-wider text-center">SL Pts</label>
                    <input type="number" step="0.1" value={manualSL} onChange={(e) => setManualSL(parseFloat(e.target.value))} className="w-full bg-transparent text-sm font-mono text-white outline-none text-center" />
                 </div>
                 <div className="bg-black/40 p-1.5 rounded border border-white/5">
                    <label className="text-[8px] text-emerald-500/70 block mb-1 uppercase tracking-wider text-center">TP Pts</label>
                    <input type="number" step="0.1" value={manualTP} onChange={(e) => setManualTP(parseFloat(e.target.value))} className="w-full bg-transparent text-sm font-mono text-white outline-none text-center" />
                 </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-1">
                <button onClick={() => onManualTrade(TradeType.BUY, manualLots, manualSL, manualTP)} className="bg-emerald-900/10 hover:bg-emerald-900/20 border border-emerald-500/20 py-3 rounded-sm text-xs font-bold uppercase tracking-wider text-emerald-400">Buy</button>
                <button onClick={() => onManualTrade(TradeType.SELL, manualLots, manualSL, manualTP)} className="bg-rose-900/10 hover:bg-rose-900/20 border border-rose-500/20 py-3 rounded-sm text-xs font-bold uppercase tracking-wider text-rose-400">Sell</button>
            </div>
        </div>

        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

        {!isBuilderMode && (
          <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-1">
                  <div className="w-1 h-1 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Engine Control</span>
              </div>
              
              <div className="space-y-2">
                  <button 
                      onClick={onToggleBot}
                      className={`w-full flex items-center justify-between p-2 rounded border transition-all ${isBotActive ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-black/40 border-slate-700 text-slate-400'}`}
                  >
                      <div className="flex items-center gap-2">
                        <Power size={12} />
                        <span className="text-[10px] uppercase font-bold tracking-wider">{isBotActive ? "Active" : "Start Bot"}</span>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${isBotActive ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-slate-700'}`}></div>
                  </button>

                  <button 
                      onClick={onAnalyze}
                      disabled={isAnalyzing}
                      className="w-full flex items-center justify-center gap-2 p-2 rounded border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 text-blue-400 disabled:opacity-50"
                  >
                      {isAnalyzing ? <div className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"></div> : <Cpu size={12} />}
                      <span className="text-[10px] uppercase font-bold tracking-wider">Scan Market</span>
                  </button>
              </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default RiskPanel;
