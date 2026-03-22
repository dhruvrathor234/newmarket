import React from 'react';
import CandlestickChart from '../CandlestickChart';
import RiskPanel from '../RiskPanel';
import OpenTradesPanel from '../OpenTradesPanel';
import { Symbol, Trade, RiskSettings, TradeType, BotStrategy } from '../../types';
import { Brain, Sparkles, Cpu, Power } from 'lucide-react';

interface BuilderViewProps {
  symbol: Symbol;
  prices: Record<Symbol, number>;
  trades: Trade[];
  riskSettings: RiskSettings;
  balance: number;
  onRiskUpdate: (settings: RiskSettings) => void;
  onManualTrade: (type: TradeType, lots: number, slDist: number, tpDist: number) => void;
  onCloseTrade: (id: string) => void;
  onUpdateTrade: (id: string, sl: number, tp: number) => void;
  isBotActive: boolean;
  onToggleBot: () => void;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  customPrompt: string;
  onSetCustomPrompt: (p: string) => void;
  // Added missing timeframe property to props
  timeframe?: string;
}

const BuilderView: React.FC<BuilderViewProps> = ({ 
  symbol, 
  prices, 
  trades, 
  riskSettings, 
  balance, 
  onRiskUpdate, 
  onManualTrade, 
  onCloseTrade, 
  onUpdateTrade, 
  isBotActive, 
  onToggleBot, 
  isAnalyzing, 
  onAnalyze,
  customPrompt,
  onSetCustomPrompt,
  // Defaulting timeframe to 15m to match common trading standard
  timeframe = '15m'
}) => {
  return (
    <div className="p-4 h-[calc(100vh-8rem)] overflow-y-auto lg:overflow-hidden animate-fade-in custom-scrollbar">
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 h-full">
        
        {/* Main Chart Area */}
        <div className="lg:col-span-9 flex flex-col gap-4 h-full">
           <div className="flex-shrink-0 min-h-[40vh] lg:flex-1 lg:min-h-0 relative">
               {/* Fixed: Added missing timeframe prop required by CandlestickChart */}
               <CandlestickChart 
                  symbol={symbol} 
                  currentPrice={prices[symbol]} 
                  timeframe={timeframe}
                  trades={trades}
                  onUpdateTrade={onUpdateTrade}
               />
           </div>
           
           <div className="h-64 flex-shrink-0">
               <OpenTradesPanel 
                  trades={trades} 
                  prices={prices} 
                  onCloseTrade={onCloseTrade}
                  onUpdateTrade={onUpdateTrade}
               />
           </div>
        </div>

        {/* Builder Interface */}
        <div className="lg:col-span-3 lg:h-full flex flex-col gap-4 overflow-y-auto custom-scrollbar">
           
           {/* AI Logic Builder Card */}
           <div className="glass-panel p-4 rounded-sm border border-amber-500/20 bg-amber-500/5">
                <div className="flex items-center gap-2 mb-3">
                    <Brain size={16} className="text-amber-400" />
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest">Custom AI Logic</h3>
                </div>
                
                <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">
                    Define your bot's behavior in plain English. Gemini will analyze the search news and live data to execute your specific logic.
                </p>

                <textarea 
                    value={customPrompt}
                    onChange={(e) => onSetCustomPrompt(e.target.value)}
                    placeholder="E.g. 'Buy XAUUSD if US interest rate news is dovish and price is near a daily low...'"
                    className="w-full h-32 bg-black/60 border border-white/10 rounded p-2 text-[10px] text-amber-100 font-mono focus:border-amber-500/50 outline-none resize-none placeholder:text-slate-700"
                />

                <div className="mt-3 flex items-center gap-2 p-2 bg-amber-500/10 rounded border border-amber-500/20">
                    <Sparkles size={12} className="text-amber-400" />
                    <span className="text-[9px] text-amber-200/70 font-bold uppercase">Natural Language Processor Active</span>
                </div>

                <div className="mt-4 space-y-2">
                    <button 
                        onClick={onToggleBot}
                        className={`w-full flex items-center justify-between p-2.5 rounded border transition-all ${isBotActive ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'bg-black/40 border-slate-700 text-slate-500 hover:border-amber-500/30'}`}
                    >
                        <div className="flex items-center gap-2">
                            <Power size={14} />
                            <span className="text-[10px] uppercase font-bold tracking-wider">{isBotActive ? "AI AGENT ENGAGED" : "ENGAGE CUSTOM AGENT"}</span>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${isBotActive ? 'bg-amber-500 animate-pulse shadow-[0_0_8px_#f59e0b]' : 'bg-slate-700'}`}></div>
                    </button>

                    <button 
                        onClick={onAnalyze}
                        disabled={isAnalyzing}
                        className="w-full flex items-center justify-center gap-2 p-2 rounded border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-400 disabled:opacity-50"
                    >
                        {isAnalyzing ? <div className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"></div> : <Cpu size={14} />}
                        <span className="text-[10px] uppercase font-bold tracking-wider">Test Logic (Once)</span>
                    </button>
                </div>
           </div>

           {/* Manual Controls */}
           <div className="flex-1">
               <RiskPanel 
                  symbol={symbol}
                  settings={riskSettings}
                  onUpdate={onRiskUpdate}
                  balance={balance}
                  onManualTrade={onManualTrade}
                  isBotActive={isBotActive}
                  onToggleBot={onToggleBot}
                  isAnalyzing={isAnalyzing}
                  onAnalyze={onAnalyze}
                  isBuilderMode={true}
               />
           </div>
        </div>
      </div>
    </div>
  );
};

export default BuilderView;
