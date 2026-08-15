
import React from 'react';
import { MarketAnalysis, Symbol, BotStrategy } from '../../types';
import { Cpu, Globe, ExternalLink, ShieldAlert, BarChart3, Radio } from 'lucide-react';
import CustomEconomicCalendar from '../CustomEconomicCalendar';

interface IntelligenceViewProps {
  activeSymbol: Symbol;
  analysis: MarketAnalysis | null;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  logs: any[];
  activeStrategy: BotStrategy;
}

const IntelligenceView: React.FC<IntelligenceViewProps> = ({ activeSymbol, analysis, isAnalyzing, onAnalyze, activeStrategy }) => {
  const isNewsBot = activeStrategy === 'SENTIMENT';

  return (
    <div className="p-4 md:p-6 h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)] flex flex-col lg:grid lg:grid-cols-12 gap-6 md:gap-8 animate-fade-in overflow-hidden">
       
       {/* Left Col: AI Analytics Core */}
       <div className="lg:col-span-5 flex flex-col gap-6 h-full overflow-y-auto custom-scrollbar pb-10">
          {/* Main Analysis Card */}
          <div className="glass-panel p-6 md:p-8 rounded-[32px] md:rounded-[40px] relative overflow-hidden shrink-0 border-white/5 bg-zinc-900/10">
              <div className="absolute top-0 right-0 p-48 bg-blue-500/5 blur-[120px] rounded-full pointer-events-none"></div>
              
              <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8 border-b border-white/5 pb-6 relative z-10">
                  <div>
                      <div className="flex items-center gap-3 mb-2">
                        {isAnalyzing ? <Radio size={22} className="text-blue-500 animate-pulse" /> : <Cpu size={22} className="text-white" />}
                        <h2 className="text-lg font-black text-white tracking-[0.2em] uppercase">AI Analytics</h2>
                      </div>
                      <p className="text-zinc-500 text-[9px] font-mono uppercase tracking-[0.3em]">
                          {isNewsBot 
                            ? `Global Sentiment Engine • ${activeSymbol}`
                            : `Technical Strategy Engine • ${activeSymbol}`
                          }
                      </p>
                  </div>
                  <button 
                      onClick={onAnalyze}
                      disabled={isAnalyzing}
                      className="w-full md:w-auto bg-white text-black px-6 py-2.5 rounded-full text-[9px] font-black tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-zinc-200 shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                  >
                      {isAnalyzing ? <span className="animate-pulse">Analyzing...</span> : <span>Scan Markets</span>}
                  </button>
              </div>

              {analysis ? (
                  <div className="space-y-8 relative z-10">
                      <div className="grid grid-cols-2 gap-4">
                          <div className="bg-black/60 p-5 rounded-3xl border border-white/5">
                              <span className="text-[8px] text-zinc-500 uppercase font-black tracking-[0.3em] block mb-2">Bias Decision</span>
                              <span className={`text-3xl font-black font-mono tracking-tighter ${analysis.decision === 'BUY' ? 'text-emerald-500' : analysis.decision === 'SELL' ? 'text-rose-500' : 'text-zinc-500'}`}>
                                  {analysis.decision}
                              </span>
                          </div>
                          
                          <div className="bg-black/60 p-5 rounded-3xl border border-white/5">
                              <span className="text-[8px] text-zinc-500 uppercase font-black tracking-[0.3em] block mb-2">Confidence</span>
                              <div className="flex items-baseline gap-1">
                                  <span className="text-3xl font-black font-mono text-white tracking-tighter">
                                      {Math.abs(analysis.sentimentScore * 100).toFixed(0)}%
                                  </span>
                              </div>
                          </div>
                      </div>

                      <div className="bg-white/[0.02] p-6 rounded-3xl border border-white/5">
                          <div className="flex items-center gap-2 mb-3">
                             <BarChart3 size={12} className="text-blue-400" />
                             <h3 className="text-[9px] text-zinc-500 uppercase font-black tracking-[0.3em]">Neural Synthesis</h3>
                          </div>
                          <p className="text-xs text-zinc-300 leading-relaxed font-light italic">
                              "{analysis.reasoning}"
                          </p>
                      </div>

                      {analysis.sources && analysis.sources.length > 0 && (
                          <div className="space-y-4">
                              <h3 className="text-[9px] text-zinc-500 uppercase font-black tracking-[0.3em]">Verified Sources (Grounding)</h3>
                              <div className="space-y-2">
                                  {analysis.sources.slice(0, 4).map((s, i) => (
                                      <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3.5 rounded-2xl bg-black/40 hover:bg-white/5 border border-white/5 hover:border-white/20 transition-all group">
                                          <div className="flex items-center gap-3 min-w-0">
                                            <Globe size={14} className="text-zinc-600 group-hover:text-blue-400 transition-colors shrink-0"/>
                                            <span className="text-[10px] text-zinc-400 group-hover:text-white truncate font-medium">{s.title}</span>
                                          </div>
                                          <ExternalLink size={10} className="text-zinc-700 shrink-0" />
                                      </a>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
              ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-zinc-900">
                      <Cpu size={60} strokeWidth={0.5} className="mb-6 opacity-10" />
                      <span className="text-[9px] uppercase tracking-[0.5em] font-black opacity-30">Awaiting Signal Ingestion</span>
                  </div>
              )}
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-zinc-900/10 shrink-0">
              <div className="flex items-center gap-3 mb-4">
                  <ShieldAlert size={16} className="text-amber-500" />
                  <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Global Protocol Warning</h3>
              </div>
              <p className="text-[10px] text-zinc-500 leading-relaxed">
                  Trading entails substantial risk. Signals are processed via <strong>Gemini 3 Pro</strong> using real-time grounding. Market volatility may exceed AI projection thresholds. Proceed with caution.
              </p>
          </div>
       </div>

       {/* Right Col: Custom AI Economic Calendar */}
       <div className="lg:col-span-7 h-full flex flex-col overflow-hidden pb-10">
          <CustomEconomicCalendar />
       </div>

    </div>
  );
};

export default IntelligenceView;
