import React, { useState, useEffect, useRef } from 'react';
import { BotState, Trade, Symbol, View, MarketDetails } from '../../types';
import { Coins, TrendingUp, Activity, ShieldCheck, Cpu, Zap, Globe, ArrowRight, Play, Layers, Instagram, Linkedin, Mail, Sparkles, ChevronRight, BarChart3, Lock, MessageSquare, Quote, ArrowUpRight, Info, Calendar, Layout } from 'lucide-react';
import { ASSETS } from '../../constants';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Mock data for the equity curve based on the screenshot
const MOCK_EQUITY_DATA = [
  { time: '08:31', equity: 0.00 },
  { time: '17:49', equity: 0.15 },
  { time: '20', equity: 0.25 },
  { time: '17:31', equity: 0.50 },
  { time: '21', equity: 0.75 },
  { time: '17:49', equity: 1.20 },
  { time: '22', equity: 1.80 },
  { time: '18:07', equity: 2.10 },
  { time: '23', equity: 2.40 },
  { time: '18:07', equity: 2.80 },
  { time: '24', equity: 3.17 },
];

interface DashboardViewProps {
  botState: BotState;
  trades: Trade[];
  prices: Record<Symbol, number>;
  marketDetails: Record<Symbol, MarketDetails>;
  activeSymbol: Symbol;
  onNavigate: (view: View) => void;
  onSelectSymbol: (symbol: Symbol) => void;
}

const FloatingCandle: React.FC<{ delay: string; height: string; type: 'bull' | 'bear'; x: string; y: string }> = ({ delay, height, type, x, y }) => (
  <div 
    className="absolute flex flex-col items-center animate-candle-float" 
    style={{ left: x, top: y, animationDelay: delay }}
  >
    <div className={`w-[1px] h-10 ${type === 'bull' ? 'bg-blue-400' : 'bg-zinc-600'} opacity-40`}></div>
    <div 
      className={`w-10 rounded-[2px] shadow-2xl transition-all duration-1000 ${
        type === 'bull' 
          ? 'bg-blue-600/90 shadow-blue-500/10 border-l border-t border-blue-400/20' 
          : 'bg-zinc-800/90 shadow-black/40 border-l border-t border-zinc-700/20'
      }`}
      style={{ height }}
    >
      <div className={`w-full h-full opacity-20 ${type === 'bull' ? 'bg-gradient-to-br from-white/30 to-transparent' : 'bg-gradient-to-br from-white/10 to-transparent'}`}></div>
    </div>
    <div className={`w-[1px] h-10 ${type === 'bull' ? 'bg-blue-400' : 'bg-zinc-600'} opacity-40`}></div>
    {type === 'bull' && (
      <div className="absolute inset-0 bg-blue-500/10 blur-2xl -z-10 animate-pulse"></div>
    )}
  </div>
);

const DashboardView: React.FC<DashboardViewProps> = ({ botState, trades, prices, marketDetails, activeSymbol, onNavigate, onSelectSymbol }) => {
  const [marketFilter, setMarketFilter] = useState<'ALL' | 'CRYPTO' | 'FOREX' | 'STOCKS' | 'COMMODITIES'>('ALL');
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => observerRef.current?.observe(el));
    return () => observerRef.current?.disconnect();
  }, []);

  const filteredSymbols = (Object.keys(ASSETS) as Symbol[]).filter(sym => {
    if (marketFilter === 'ALL') return true;
    if (marketFilter === 'CRYPTO') return sym !== 'XAUUSD' && sym !== 'XAGUSD' && sym !== 'WTIUSD';
    if (marketFilter === 'COMMODITIES') return sym === 'XAUUSD' || sym === 'XAGUSD' || sym === 'WTIUSD';
    return false;
  });

  const renderAnimatedText = (text: string, baseClass: string) => {
    return text.split(" ").map((word, wordIndex) => (
      <span key={wordIndex} className="inline-block whitespace-nowrap">
        {word.split("").map((char, charIndex) => (
          <span 
            key={charIndex} 
            className={`inline-block transition-all duration-300 cursor-default hover:-translate-y-2 hover:scale-110 ${baseClass} hover:text-blue-400 hover:[text-shadow:0_0_20px_rgba(59,130,246,0.8)]`}
            style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          >
            {char}
          </span>
        ))}
        {wordIndex < text.split(" ").length - 1 && <span className="inline-block w-[0.25em]">&nbsp;</span>}
      </span>
    ));
  };

  return (
    <div className="pt-8 overflow-x-hidden">
      <style>{`
        @keyframes candle-float {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.8; }
          50% { transform: translateY(-40px) scale(1.02); opacity: 1; }
        }
        .animate-candle-float {
          animation: candle-float 6s ease-in-out infinite;
        }
      `}</style>

      <div className="px-6 max-w-7xl mx-auto space-y-40">
        
        {/* HERO SECTION */}
        <section className="min-h-[85vh] flex flex-col lg:flex-row items-center justify-between gap-12 py-20 relative">
          <div className="flex-1 space-y-10 relative z-10 w-full overflow-visible">
            <div className="space-y-6 w-full">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest animate-fade-in">
                 <Sparkles size={14} /> AI-Powered Trading
              </div>
              
              <div className="overflow-visible">
                <h1 className="text-[clamp(2.5rem,8vw,100px)] font-black tracking-tighter leading-none text-white animate-fade-in flex flex-nowrap whitespace-nowrap">
                  {renderAnimatedText("Nebulamarket", "hero-gradient-text")}
                </h1>
              </div>

              <div className="overflow-visible">
                <p className="text-[clamp(0.75rem,1.8vw,1.5rem)] font-light text-zinc-400 tracking-tight leading-none animate-fade-in" style={{animationDelay: '100ms'}}>
                  {renderAnimatedText("The future of automated wealth management. Execute smart strategies with built-in AI precision.", "")}
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 pt-4 animate-fade-in" style={{animationDelay: '200ms'}}>
              <button 
                onClick={() => onNavigate('TERMINAL')} 
                className="px-10 py-5 bg-white text-black font-black rounded-full hover:bg-blue-600 hover:text-white transition-all duration-500 flex items-center gap-3 uppercase tracking-widest text-xs shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:-translate-y-1 active:scale-95 group"
              >
                Start Trading <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={() => onNavigate('INTELLIGENCE')} className="px-10 py-5 bg-transparent text-white font-bold rounded-full border border-white/20 hover:bg-white/5 transition-all uppercase tracking-widest text-xs hover:-translate-y-1 active:scale-95">
                Market Analysis
              </button>
            </div>
          </div>

          <div className="flex-1 relative w-full max-w-2xl h-[400px] lg:h-[600px] animate-fade-in shrink-0" style={{animationDelay: '300ms'}}>
            <div className="absolute inset-0 bg-blue-500/5 blur-[120px] rounded-full animate-pulse"></div>
            
            <div className="relative h-full w-full flex items-center justify-center overflow-visible">
               <div className="relative w-full h-full perspective-[1200px] overflow-visible">
                  <div className="absolute inset-0 flex items-center justify-center overflow-visible">
                    <FloatingCandle x="10%" y="35%" height="110px" type="bull" delay="0s" />
                    <FloatingCandle x="28%" y="15%" height="160px" type="bear" delay="0.8s" />
                    <FloatingCandle x="46%" y="45%" height="80px" type="bull" delay="1.6s" />
                    <FloatingCandle x="64%" y="20%" height="130px" type="bull" delay="2.4s" />
                    <FloatingCandle x="82%" y="50%" height="100px" type="bear" delay="3.2s" />
                  </div>
               </div>
            </div>
          </div>
        </section>

        {/* FEATURES GRID */}
        <section className="reveal space-y-12 sm:space-y-20">
          <div className="text-center space-y-4">
            <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase justify-center">
              {renderAnimatedText("Powerful Trading Tools", "")}
            </h3>
            <p className="text-zinc-500 max-w-2xl mx-auto px-4">
              Nebulamarket provides simple yet powerful tools to help you trade better using the latest AI technology.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: "Smart Analytics", desc: "Real-time AI sentiment analysis powered by Gemini web search.", icon: Sparkles, action: () => onNavigate('INTELLIGENCE') },
              { title: "Risk Shield", desc: "Automated protection to help you manage your money safely.", icon: Lock, action: () => onNavigate('TERMINAL') },
              { title: "Simple Terminal", desc: "Multi-asset trading dashboard with fast and easy order placement.", icon: BarChart3, action: () => onNavigate('TERMINAL') },
              { title: "AI Assistant", desc: "A smart trading helper to answer your questions and analyze charts.", icon: MessageSquare, action: () => onNavigate('ASSISTANT') },
              { title: "Portfolio Tracker", desc: "Keep track of all your open trades and historical profits in one place.", icon: Layers, action: () => onNavigate('PORTFOLIO') },
              { title: "Market Feed", desc: "Stay updated with global economic events and live price feeds.", icon: Globe, action: () => onNavigate('INTELLIGENCE') },
            ].map((f, i) => (
              <div key={i} onClick={f.action as any} className="glass-card p-10 rounded-[32px] group hover:border-blue-500/50 hover:bg-zinc-900/40 cursor-pointer transition-all duration-700 hover:-translate-y-3">
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-all duration-500 mb-8">
                  {typeof f.icon === 'function' ? <f.icon size={28} /> : React.createElement(f.icon as any, {size: 28})}
                </div>
                <h4 className="text-xl font-black text-white mb-3 group-hover:text-blue-400 transition-colors uppercase tracking-tight">{f.title}</h4>
                <p className="text-zinc-500 text-sm leading-relaxed">{f.desc}</p>
                <div className="mt-8 pt-8 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-all duration-700">
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">Explore System <ChevronRight size={14} /></span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* MARKET WATCH */}
        <section className="reveal space-y-10 scroll-mt-24">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6">
              <div className="space-y-2">
                  <div className="flex items-center gap-3">
                      <h2 className="text-4xl font-black text-white tracking-tighter uppercase">Market Pulse</h2>
                      <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase rounded-full animate-pulse tracking-widest">Active Feed</div>
                  </div>
                  <p className="text-zinc-500 text-sm">Real-time price data for Crypto and Commodities.</p>
              </div>
              <div className="flex gap-2 bg-zinc-950 p-1.5 rounded-2xl border border-white/5">
                  <button onClick={() => setMarketFilter('ALL')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${marketFilter === 'ALL' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}>All Assets</button>
                  <button onClick={() => setMarketFilter('CRYPTO')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${marketFilter === 'CRYPTO' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}>Crypto</button>
                  <button onClick={() => setMarketFilter('COMMODITIES')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${marketFilter === 'COMMODITIES' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}>Metals</button>
              </div>
          </div>

          <div className="glass-card rounded-[32px] overflow-hidden border-white/5 shadow-2xl transition-all duration-700 hover:border-blue-500/20">
              <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-black/60 text-zinc-500 uppercase tracking-[0.3em] text-[10px]">
                          <tr>
                              <th className="p-6 font-bold">Instrument</th>
                              <th className="p-6 font-bold">Execution</th>
                              <th className="p-6 font-bold">Bid</th>
                              <th className="p-6 font-bold">Ask</th>
                              <th className="p-6 font-bold">Performance</th>
                              <th className="p-6 font-bold">Range (L/H)</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                          {filteredSymbols.map(sym => {
                              const details = marketDetails[sym];
                              const isPositive = details.change24hPercent >= 0;
                              return (
                                  <tr key={sym} onClick={() => { onSelectSymbol(sym); onNavigate('TERMINAL'); }} className="hover:bg-blue-500/5 cursor-pointer transition-all duration-300 group">
                                      <td className="p-6">
                                          <div className="flex flex-col">
                                            <span className="font-black text-zinc-200 group-hover:text-blue-400 text-base transition-colors">{sym}</span>
                                            <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-widest">{ASSETS[sym].NAME}</span>
                                          </div>
                                      </td>
                                      <td className="p-6">
                                          <div className="flex items-center gap-2">
                                              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                              <span className="text-zinc-400 text-[10px] font-bold uppercase">Ready</span>
                                          </div>
                                      </td>
                                      <td className="p-6 text-zinc-300 font-bold">{details.bid.toFixed(2)}</td>
                                      <td className="p-6 text-zinc-300 font-bold">{details.ask.toFixed(2)}</td>
                                      <td className="p-6">
                                          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black ${isPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                              {isPositive ? '▲' : '▼'} {Math.abs(details.change24hPercent).toFixed(2)}%
                                          </div>
                                      </td>
                                      <td className="p-6 text-zinc-500 text-[10px]">
                                          {details.low.toFixed(1)} <span className="mx-2 opacity-20">|</span> {details.high.toFixed(1)}
                                      </td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              </div>
          </div>
        </section>

        {/* CALL TO ACTION */}
        <section className="reveal glass-card rounded-[32px] sm:rounded-[40px] overflow-hidden p-8 sm:p-16 lg:p-28 relative text-center border-blue-500/10 hover:border-blue-500/40 transition-all duration-1000 group/cta">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.1)_0%,_transparent_60%)]"></div>
            <div className="max-w-3xl mx-auto space-y-8 sm:space-y-10 relative z-10">
               <h3 className="text-3xl sm:text-5xl lg:text-7xl font-black text-white tracking-tighter leading-tight uppercase group-hover/cta:scale-[1.02] transition-transform duration-1000 justify-center">
                 {renderAnimatedText("Experience Next-Gen Trading", "")}
               </h3>
               <p className="text-zinc-400 text-base sm:text-xl leading-relaxed">
                 Join thousands of smart traders. Our AI handles the hard part while you manage your portfolio.
               </p>
               <button onClick={() => onNavigate('TERMINAL')} className="mx-auto px-8 sm:px-12 py-4 sm:py-6 bg-blue-600 text-white font-black rounded-full hover:bg-white hover:text-blue-600 transition-all duration-700 flex items-center gap-3 uppercase tracking-[0.2em] text-[10px] sm:text-xs shadow-[0_0_50px_rgba(59,130,246,0.3)] hover:-translate-y-2 active:scale-95">
                 Connect To AI Core <Play size={14} className="fill-current" />
               </button>
            </div>
        </section>

        {/* JOIN NEBULAMARKET QUOTE SECTION */}
        <section className="reveal py-12 sm:py-20 flex flex-col items-center text-center space-y-8 sm:space-y-12">
            <h2 className="text-3xl sm:text-4xl lg:text-7xl font-black text-blue-500 tracking-tighter uppercase mb-2 justify-center">
              {renderAnimatedText("Join Nebulamarket Now", "")}
            </h2>
            
            <div className="text-white opacity-40">
                <Quote size={40} sm:size={80} strokeWidth={1} />
            </div>
            
            <h2 className="text-2xl sm:text-4xl lg:text-7xl font-black text-white tracking-tight max-w-5xl leading-tight uppercase px-4 justify-center">
                {renderAnimatedText("\"If you don't find a way to make money while you sleep, you will work until you die.\"", "")}
            </h2>

            <div className="pt-10 flex flex-col items-center gap-6">
                <button 
                  onClick={() => onNavigate('TERMINAL')}
                  className="group relative inline-flex items-center gap-8 px-12 py-6 bg-blue-600 text-white font-black rounded-full hover:bg-white hover:text-blue-600 transition-all duration-700 hover:scale-105 active:scale-95 shadow-[0_0_50px_rgba(59,130,246,0.3)] overflow-hidden"
                >
                    <span className="text-lg uppercase tracking-[0.2em] pl-4 relative z-10">Start Trading Now</span>
                    <div className="w-14 h-14 bg-black/20 group-hover:bg-blue-600/10 rounded-full flex items-center justify-center text-white transition-all duration-700 group-hover:rotate-45 relative z-10">
                        <ArrowUpRight size={28} />
                    </div>
                </button>
            </div>
        </section>

        {/* NEBULAMARKET PERFORMANCE REPORT */}
        <section className="reveal space-y-12 pb-40">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="space-y-3">
                  <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                          <BarChart3 size={20} className="text-white" />
                      </div>
                      <h2 className="text-4xl font-black text-white tracking-tighter uppercase">Strategy Report</h2>
                  </div>
                  <div className="flex items-center gap-3 text-zinc-500 font-mono text-xs uppercase tracking-widest">
                      <span className="text-blue-500 font-black">BTCUSD • NEBULA V5</span>
                  </div>
              </div>
              
              <div className="flex gap-2 p-1.5 bg-zinc-950 rounded-2xl border border-white/5">
                  <button className="px-6 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-900/20">Metrics</button>
              </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                  { label: "Max equity drawdown", value: "0.02", subValue: "USD 0.04%", icon: Info, color: "text-rose-500" },
                  { label: "Total trades", value: "219", subValue: "Executions", icon: Info, color: "text-white" },
                  { label: "Profitable trades", value: "94.06%", subValue: "206/219", icon: Info, color: "text-emerald-500" },
                  { label: "Profit factor", value: "116.768", subValue: "Efficiency Ratio", icon: Info, color: "text-white" },
              ].map((m, i) => (
                  <div key={i} className="glass-card p-6 rounded-[32px] border-white/5 bg-zinc-900/20 hover:border-blue-500/30 transition-all duration-500 group">
                      <div className="flex justify-between items-center mb-4">
                          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{m.label}</span>
                          <m.icon size={12} className="text-zinc-700 group-hover:text-blue-500 transition-colors" />
                      </div>
                      <div className={`text-2xl font-black tracking-tighter ${m.color} mb-1`}>{m.value}</div>
                      <div className="text-[10px] font-mono text-zinc-600 font-bold uppercase">{m.subValue}</div>
                  </div>
              ))}
          </div>

          <div className="glass-card p-8 rounded-[40px] border-white/5 bg-zinc-900/20 relative overflow-hidden h-[400px] flex flex-col">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.05)_0%,_transparent_50%)]"></div>
              <div className="flex justify-between items-center mb-8 relative z-10">
                  <h3 className="text-lg font-black text-white uppercase tracking-widest">Equity Chart</h3>
                  <div className="flex gap-4">
                      <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6]"></div>
                          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Equity Growth</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                          <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Absolute</span>
                      </div>
                  </div>
              </div>

              <div className="flex-1 w-full relative z-10">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={MOCK_EQUITY_DATA}>
                          <defs>
                              <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                          <XAxis 
                              dataKey="time" 
                              stroke="#525252" 
                              fontSize={10} 
                              tickLine={false}
                              axisLine={false}
                              tickMargin={15}
                              fontFamily="JetBrains Mono"
                          />
                          <YAxis 
                              stroke="#525252" 
                              fontSize={10} 
                              tickLine={false} 
                              axisLine={false} 
                              tickMargin={15}
                              fontFamily="JetBrains Mono"
                              tickFormatter={(v) => v.toFixed(2)}
                          />
                          <Tooltip 
                              contentStyle={{ 
                                  backgroundColor: '#121418', 
                                  borderColor: 'rgba(59, 130, 246, 0.2)', 
                                  borderRadius: '16px',
                                  fontSize: '10px',
                                  fontFamily: 'JetBrains Mono',
                                  color: '#fff'
                              }} 
                          />
                          <Area 
                              type="monotone" 
                              dataKey="equity" 
                              stroke="#3b82f6" 
                              strokeWidth={3}
                              fillOpacity={1} 
                              fill="url(#equityGradient)" 
                              animationDuration={2000}
                          />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>

              <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center text-[9px] font-mono text-zinc-700 uppercase tracking-widest relative z-10">
                  <span>Nebula V5 Alpha Engine • Neural Execution Loop</span>
                  <div className="flex gap-6">
                      <span className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-zinc-700"></div> Buy & Hold</span>
                      <span className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-blue-500"></div> Strategy Result</span>
                  </div>
              </div>
          </div>
        </section>
      </div>

      {/* FOOTER */}
      <footer className="mt-40 bg-[#06070a] border-t border-white/5 pt-32 pb-16 px-6">
          <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-20">
                  
                  <div className="lg:col-span-5 space-y-10">
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.4)] transition-transform hover:rotate-12 duration-500">
                              <Sparkles size={24} className="text-white" />
                          </div>
                          <span className="text-3xl font-black text-white uppercase tracking-tighter whitespace-nowrap">Nebula<span className="text-blue-500">market</span></span>
                      </div>
                      <div className="space-y-6">
                          <p className="text-zinc-400 text-base leading-relaxed max-w-md">
                            Nebulamarket is a premier AI-driven trading platform designed to simplify how you interact with financial markets. Founded by experts in AI and finance, we provide a smart edge through real-time news and sentiment analysis.
                          </p>
                          <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 w-fit">
                              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                                  <BarChart3 size={18} className="text-blue-400" />
                              </div>
                              <div>
                                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Expert System</p>
                                  <p className="text-xs font-bold text-white uppercase">AI Core Division</p>
                              </div>
                          </div>
                      </div>
                      
                      <div className="space-y-6 pt-4">
                          <h5 className="text-[10px] font-black uppercase text-blue-500 tracking-[0.4em]">Connect With Nebula</h5>
                          <div className="flex gap-4">
                              <a href="https://www.instagram.com/nebulamarketofficialll?igsh=d291dGtqOW9ub3Rl&utm_source=qr" target="_blank" rel="noopener noreferrer" className="w-14 h-14 bg-zinc-900 border border-white/10 rounded-[20px] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-gradient-to-tr hover:from-[#f09433] hover:via-[#dc2743] hover:to-[#bc1888] transition-all duration-500 group shadow-xl">
                                  <Instagram size={24} className="group-hover:scale-110 transition-transform" />
                              </a>
                              <a href="https://www.linkedin.com/company/nebulamarket/?viewAsMember=true" target="_blank" rel="noopener noreferrer" className="w-14 h-14 bg-zinc-900 border border-white/10 rounded-[20px] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#0077b5] transition-all duration-500 group shadow-xl">
                                  <Linkedin size={24} className="group-hover:scale-110 transition-transform" />
                              </a>
                              <div className="w-14 h-14 bg-zinc-900 border border-white/10 rounded-[20px] flex items-center justify-center text-zinc-400 hover:text-blue-500 hover:border-blue-500/30 transition-all duration-500 group shadow-xl">
                                  <Zap size={24} className="group-hover:scale-110 transition-transform" />
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="lg:col-span-4 space-y-12">
                      <div className="space-y-6">
                          <h4 className="text-white font-black uppercase tracking-[0.3em] text-sm">Get Smart Signals</h4>
                          <p className="text-zinc-500 text-sm leading-relaxed">Receive fast signals and system updates directly to your dashboard.</p>
                          <div className="relative group">
                              <input 
                                  type="email" 
                                  placeholder="EMAIL@GMAIL.COM" 
                                  className="w-full bg-zinc-950 border border-white/10 rounded-2xl py-5 pl-6 pr-36 text-white text-xs font-mono focus:outline-none focus:border-blue-500/50 transition-all uppercase tracking-widest placeholder:text-zinc-800"
                              />
                              <button className="absolute right-2 top-2 bottom-2 px-8 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-lg">
                                  Join
                              </button>
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-10 border-t border-white/5 pt-10">
                          <div className="space-y-6">
                              <h4 className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.3em]">Quick Links</h4>
                              <ul className="space-y-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">
                                  <li onClick={() => onNavigate('DASHBOARD')} className="hover:text-blue-500 cursor-pointer transition-colors">Markets</li>
                                  <li onClick={() => onNavigate('TERMINAL')} className="hover:text-blue-500 cursor-pointer transition-colors">Terminal</li>
                                  <li onClick={() => onNavigate('INTELLIGENCE')} className="hover:text-blue-500 cursor-pointer transition-colors">Analytics</li>
                                  <li onClick={() => onNavigate('PORTFOLIO')} className="hover:text-blue-500 cursor-pointer transition-colors">Portfolio</li>
                              </ul>
                          </div>
                          <div className="space-y-6">
                              <h4 className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.3em]">Support</h4>
                              <ul className="space-y-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">
                                  <li className="hover:text-blue-500 cursor-pointer transition-colors">Privacy</li>
                                  <li className="hover:text-blue-500 cursor-pointer transition-colors">Terms</li>
                                  <li className="hover:text-blue-500 cursor-pointer transition-colors">Safety</li>
                                  <li className="hover:text-blue-500 cursor-pointer transition-colors">Fees</li>
                              </ul>
                          </div>
                      </div>
                  </div>

                  <div className="lg:col-span-3">
                      <div className="glass-card p-10 rounded-[32px] border-white/10 bg-blue-500/5 relative overflow-hidden group hover:border-blue-500/30 transition-all duration-700 h-fit">
                          <div className="absolute top-0 right-0 p-20 bg-blue-500/10 blur-[100px] pointer-events-none group-hover:bg-blue-500/20 transition-colors"></div>
                          <h4 className="text-white font-black uppercase tracking-[0.3em] text-xs mb-8 relative z-10">System Support</h4>
                          <div className="space-y-8 relative z-10">
                              <div className="flex items-center gap-4 group/mail">
                                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-blue-500 group-hover/mail:bg-blue-500 group-hover/mail:text-white transition-all">
                                      <Mail size={16} />
                                  </div>
                                  <div>
                                      <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Email</p>
                                      <p className="text-xs text-zinc-300 font-mono">nebulamarketai@gmail.com</p>
                                  </div>
                              </div>
                              <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-blue-500">
                                      <Activity size={16} />
                                  </div>
                                  <div>
                                      <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Status</p>
                                      <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Online</p>
                                  </div>
                              </div>
                          </div>
                          <button className="w-full mt-10 py-4 border border-white/10 hover:bg-white/5 hover:border-white/30 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-white transition-all">
                              Talk to Support
                          </button>
                      </div>
                  </div>
              </div>

              <div className="mt-32 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
                  <span className="text-[10px] text-zinc-700 font-mono uppercase tracking-[0.5em]">© 2025 Nebulamarket AI System. All rights reserved.</span>
                  <div className="flex flex-wrap justify-center gap-10 text-[10px] text-zinc-600 font-black uppercase tracking-widest">
                      <span className="hover:text-blue-500 cursor-pointer transition-colors">Cookie Policy</span>
                      <span className="hover:text-blue-500 cursor-pointer transition-colors">Security</span>
                      <div className="flex items-center gap-2 px-4 py-1.5 bg-white/5 rounded-full border border-white/10 hover:border-white/30 cursor-pointer group transition-all">
                          <Globe size={10} className="text-zinc-500 group-hover:text-blue-400 transition-colors" />
                          <span className="text-zinc-500 group-hover:text-white transition-colors">English</span>
                      </div>
                  </div>
              </div>
          </div>
      </footer>
    </div>
  );
};

export default DashboardView;