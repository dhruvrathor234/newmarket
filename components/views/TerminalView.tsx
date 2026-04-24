
import React, { useState, useEffect } from 'react';
import CandlestickChart from '../CandlestickChart';
import TradingViewWidget from '../TradingViewWidget';
import InstrumentList from '../InstrumentList';
import OrderPanel from '../OrderPanel';
import OpenTradesPanel from '../OpenTradesPanel';
import OrderBook from '../OrderBook';
import CustomBotPanel from '../CustomBotPanel';
import AssetAIInsight from '../AssetAIInsight';
import BacktestEngine from '../BacktestEngine';
import { Symbol, Trade, RiskSettings, TradeType, BotStrategy, BotState, MarketDetails, Alert, NebulaV5Settings, ChartMarker, AccountType, TradingMode, HedgingBotSettings, Candle, MarketAnalysis } from '../../types';
import { ASSETS } from '../../constants';
import { Sparkles, User, X, ChevronDown, Clock, LayoutDashboard, ShoppingCart, BarChart2, ShieldCheck, Globe } from 'lucide-react';
import { calculateNebulaV5Markers } from '../../services/nebulaV5Service';
import { aiIntelligenceService } from '../../services/aiIntelligenceService';
import { fetchCandles } from '../../services/priceService';

interface TerminalViewProps {
  symbol: Symbol;
  prices: Record<Symbol, number>;
  trades: Trade[];
  marketDetails: Record<Symbol, MarketDetails>;
  riskSettings: RiskSettings;
  balance: number;
  botState: BotState;
  onRiskUpdate: (settings: RiskSettings) => void;
  onManualTrade: (type: TradeType, lots: number, slDist: number, tpDist: number, limitPrice?: number) => void;
  onCloseTrade: (id: string) => void;
  onUpdateTrade: (id: string, sl: number, tp: number) => void;
  isBotActive: boolean;
  onToggleBot: () => void;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  activeStrategy: BotStrategy;
  onSetStrategy: (s: BotStrategy) => void;
  selectedTimeframe: string;
  onSetTimeframe: (tf: string) => void;
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
  onSelectSymbol: (symbol: Symbol) => void;
  alerts: Alert[];
  onAddAlert: (price: number, type: 'ABOVE' | 'BELOW') => void;
  onRemoveAlert: (id: string) => void;
  nebulaV5Settings: NebulaV5Settings;
  onUpdateNebulaV5Settings: (s: NebulaV5Settings) => void;
  hedgingSettings: HedgingBotSettings;
  onUpdateHedgingSettings: (s: HedgingBotSettings) => void;
  hftSettings: any;
  onUpdateHFTSettings: (s: any) => void;
  logs?: any[];
  onUpdateCustomLogic: (logic: string) => void;
  onSetAccountType: (type: AccountType) => void;
  onSetTradingMode: (mode: TradingMode) => void;
  onConnectBinance: (apiKey: string, apiSecret: string) => void;
  onCopyTrade: (analysis: MarketAnalysis) => void;
  lastAnalysis: MarketAnalysis | null;
  candles: Candle[];
  isLocked?: boolean;
}

const TerminalView: React.FC<TerminalViewProps> = (props) => {
  const [openTabs, setOpenTabs] = useState<Symbol[]>([props.symbol]);
  const [showTfMenu, setShowTfMenu] = useState(false);
  const [activeTf, setActiveTf] = useState(props.selectedTimeframe || '15m');
  const [markersMap, setMarkersMap] = useState<Record<string, ChartMarker[]>>({});
  const [activeView, setActiveView] = useState<'CHART' | 'BACKTEST'>('CHART');
  const [indicators, setIndicators] = useState<string[]>(['VOLUME', 'EMA']);
  const [showIndicatorsMenu, setShowIndicatorsMenu] = useState(false);
  const [layout, setLayout] = useState<'1x1' | '1x2' | '2x1' | '2x2' | '2x3' | '3x2' | '3x3'>('1x1');
  const [layoutSymbols, setLayoutSymbols] = useState<Symbol[]>(new Array(9).fill(props.symbol));
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  
  // Mobile UI States
  const [isMarketsOpen, setIsMarketsOpen] = useState(false);
  const [isOrderOpen, setIsOrderOpen] = useState(false);

  const timeframes = [
    { id: '1m', label: '1 min' },
    { id: '5m', label: '5 min' },
    { id: '15m', label: '15 min' },
    { id: '1h', label: '1 hour' },
    { id: '4h', label: '4 hour' },
    { id: '1d', label: '1 day' },
  ];

  const availableIndicators = [
    { id: 'VOLUME', label: 'Volume', description: 'Market activity bars' },
    { id: 'EMA', label: 'EMA (20)', description: 'Exponential Moving Average' },
    { id: 'SMA', label: 'SMA (50)', description: 'Simple Moving Average' },
    { id: 'RSI', label: 'RSI (14)', description: 'Relative Strength Index' },
    { id: 'BB', label: 'Bollinger Bands', description: 'Volatility bands' },
    { id: 'MACD', label: 'MACD', description: 'Moving Average Convergence Divergence' },
    { id: 'ATR', label: 'ATR', description: 'Average True Range' },
    { id: 'STOCH', label: 'Stochastic', description: 'Stochastic Oscillator' },
    { id: 'VWAP', label: 'VWAP', description: 'Volume Weighted Average Price' },
    { id: 'SUPERTREND', label: 'Supertrend', description: 'Trend following indicator' },
    { id: 'ICHIMOKU', label: 'Ichimoku', description: 'Ichimoku Cloud' },
    { id: 'DONCHIAN', label: 'Donchian', description: 'Donchian Channels' },
  ];

  const layouts = [
    { id: '1x1', label: '1 Chart', icon: '□' },
    { id: '1x2', label: '1x2 Split', icon: '◫' },
    { id: '2x1', label: '2x1 Split', icon: '⊟' },
    { id: '2x2', label: '2x2 Grid', icon: '田' },
    { id: '2x3', label: '2x3 Grid', icon: '☷' },
    { id: '3x2', label: '3x2 Grid', icon: '☷' },
    { id: '3x3', label: '3x3 Grid', icon: '▦' },
  ];

  const getLayoutGridClass = () => {
    switch (layout) {
      case '1x1': return 'grid-cols-1 grid-rows-1';
      case '1x2': return 'grid-cols-2 grid-rows-1';
      case '2x1': return 'grid-cols-1 grid-rows-2';
      case '2x2': return 'grid-cols-2 grid-rows-2';
      case '2x3': return 'grid-cols-3 grid-rows-2';
      case '3x2': return 'grid-cols-2 grid-rows-3';
      case '3x3': return 'grid-cols-3 grid-rows-3';
      default: return 'grid-cols-1 grid-rows-1';
    }
  };

  const getChartCount = () => {
    const [rows, cols] = layout.split('x').map(Number);
    return rows * cols;
  };

  const toggleIndicator = (id: string) => {
    if (indicators.includes(id)) {
      setIndicators(indicators.filter(i => i !== id));
    } else {
      setIndicators([...indicators, id]);
    }
  };

  const formatUSD = (val: number | undefined | null) => {
    if (val === undefined || val === null || isNaN(val)) return '0.00';
    return val.toFixed(2);
  };

  const handleTabSelect = (s: Symbol) => {
    props.onSelectSymbol(s);
    if (!openTabs.includes(s)) setOpenTabs([...openTabs, s]);
    setIsMarketsOpen(false);
  };

  const handleTfChange = (tf: string) => {
    setActiveTf(tf);
    props.onSetTimeframe(tf);
    setShowTfMenu(false);
  };

  // Sync first layout symbol with active symbol
  useEffect(() => {
    setLayoutSymbols(prev => {
      const next = [...prev];
      next[0] = props.symbol;
      return next;
    });
  }, [props.symbol]);

  // Calculate Markers for Nebula V5
  useEffect(() => {
    let interval: any;
    
    const updateMarkers = async () => {
      if (props.activeStrategy === 'NEBULA_V5') {
        const chartCount = getChartCount();
        const symbolsToUpdate = Array.from(new Set(layoutSymbols.slice(0, chartCount)));
        
        const newMarkersMap: Record<string, ChartMarker[]> = {};
        
        await Promise.all(symbolsToUpdate.map(async (symUnknown) => {
          const sym = symUnknown as Symbol;
          try {
            const candles = await fetchCandles(sym, activeTf as any);
            const m = calculateNebulaV5Markers(candles, props.nebulaV5Settings);
            newMarkersMap[sym] = m;
          } catch (err) {
            console.error(`Error fetching candles for ${sym} (Nebula V5):`, err);
          }
        }));
        
        setMarkersMap(newMarkersMap);
      } else if (props.activeStrategy === 'AI_INTELLIGENCE') {
        if (props.lastAnalysis && props.lastAnalysis.symbol === props.symbol) {
          const m = aiIntelligenceService.calculateMarkers(props.lastAnalysis);
          setMarkersMap({ [props.symbol]: m });
        } else {
          setMarkersMap({});
        }
      } else {
        setMarkersMap({});
      }
    };

    updateMarkers();
    
    // Refresh markers every 5 seconds to catch new signals instantly
    interval = setInterval(updateMarkers, 5000);

    return () => clearInterval(interval);
  }, [layoutSymbols, layout, activeTf, props.activeStrategy, props.nebulaV5Settings]);

  const handleToggleCustomBot = () => {
    if (props.botState.strategy === 'CUSTOM_AI' && props.isBotActive) {
        props.onToggleBot();
    } else {
        props.onSetStrategy('CUSTOM_AI');
        if (!props.isBotActive) props.onToggleBot();
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col bg-[#0b0c10] select-none overflow-y-auto custom-scrollbar pb-10">
      {/* Top Bar */}
      <header className="h-12 border-b border-white/5 flex items-center justify-between px-4 bg-[#121418] sticky top-0 z-[100] shrink-0">
          <div className="flex items-center gap-4 lg:gap-6">
              <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.4)]">
                    <Sparkles size={14} className="text-white" />
                  </div>
                  <span className="hidden sm:inline font-bold text-[10px] text-white font-sans uppercase tracking-[0.2em] whitespace-nowrap">Nebula<span className="text-blue-500">market</span></span>
              </div>
              <div className="h-8 w-px bg-white/5 mx-1 hidden sm:block"></div>
              
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[150px] sm:max-w-none">
                {openTabs.map(t => (
                    <div 
                      key={t} 
                      onClick={() => props.onSelectSymbol(t)}
                      className={`px-3 sm:px-4 py-1.5 rounded-t-md cursor-pointer text-[10px] font-bold uppercase transition-all flex items-center gap-2 relative flex-shrink-0 ${props.symbol === t ? 'bg-[#1e222d] text-blue-400 border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <span>{t}</span>
                        {openTabs.length > 1 && (
                          <X 
                            size={10} 
                            onClick={(e) => { e.stopPropagation(); setOpenTabs(openTabs.filter(x => x !== t)); }} 
                            className="hover:text-rose-500 transition-colors" 
                          />
                        )}
                    </div>
                ))}
              </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
              <div className="flex items-center gap-3 sm:gap-6 text-[8px] sm:text-[10px] font-mono mr-1 sm:mr-2">
                  <div className="flex flex-col items-end leading-tight">
                    <span className="text-slate-500 uppercase text-[6px] sm:text-[8px] font-sans font-black">Equity</span>
                    <span className="text-white font-bold whitespace-nowrap">{props.botState.equity.toLocaleString()} USD</span>
                  </div>
                  <div className="flex flex-col items-end leading-tight">
                    <span className="text-slate-500 uppercase text-[6px] sm:text-[8px] font-sans font-black">Balance</span>
                    <span className="text-slate-400 whitespace-nowrap">{props.balance.toLocaleString()} USD</span>
                  </div>
              </div>

              {/* Account Switcher */}
              <div className="flex bg-black/40 p-1 rounded-lg border border-white/5 mr-2">
                  <button 
                      onClick={() => props.onSetAccountType(AccountType.PAPER)}
                      className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest transition-all ${props.botState.accountType === AccountType.PAPER ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                      Demo
                  </button>
                  <button 
                      onClick={() => props.onSetAccountType(AccountType.REAL)}
                      className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest transition-all ${props.botState.accountType === AccountType.REAL ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                      Real
                  </button>
              </div>

              {/* Trading Mode Switcher (only for REAL) */}
              {props.botState.accountType === AccountType.REAL && (
                <div className="flex bg-black/40 p-1 rounded-lg border border-white/5 mr-2">
                    <button 
                        onClick={() => props.onSetTradingMode(TradingMode.SPOT)}
                        className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest transition-all ${props.botState.tradingMode === TradingMode.SPOT ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Spot
                    </button>
                    <button 
                        onClick={() => props.onSetTradingMode(TradingMode.FUTURES)}
                        className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest transition-all ${props.botState.tradingMode === TradingMode.FUTURES ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Futures
                    </button>
                </div>
              )}

              {props.botState.accountType === AccountType.PAPER && (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="hidden md:flex flex-col items-end mr-4">
                    <span className="text-[8px] text-slate-500 uppercase font-bold tracking-widest">Paper Balance</span>
                    <span className="text-[11px] font-mono font-bold text-blue-400">${formatUSD(props.balance)}</span>
                  </div>
                  <button 
                    onClick={props.onOpenDeposit} 
                    className="bg-blue-600 text-white px-2 sm:px-5 py-1.5 sm:py-2 rounded text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/10 active:scale-95"
                  >
                    Deposit
                  </button>
                  <button 
                    onClick={props.onOpenWithdraw} 
                    className="bg-transparent text-slate-400 border border-white/10 px-2 sm:px-5 py-1.5 sm:py-2 rounded text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:text-white hover:bg-white/5 transition-all active:scale-95"
                  >
                    Withdraw
                  </button>
                </div>
              )}

              {props.botState.accountType === AccountType.REAL && (
                <div className="flex items-center gap-4 mr-2">
                  <div className="flex flex-col items-end">
                    <span className="text-[8px] text-slate-500 uppercase font-bold tracking-widest">Real Balance</span>
                    <span className="text-[11px] font-mono font-bold text-yellow-500">${formatUSD(props.balance)}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[8px] text-slate-500 uppercase font-bold tracking-widest">Real Equity</span>
                    <span className="text-[11px] font-mono font-bold text-white">${formatUSD(props.botState.equity)}</span>
                  </div>
                </div>
              )}
              <User size={16} className="text-slate-500 cursor-pointer hover:text-white ml-1 sm:ml-2" />
          </div>
      </header>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px] relative">
        
        {/* Main Content Area */}
        <main className="flex flex-col min-w-0 bg-[#0b0c10] relative">
            {/* Chart Toolbar */}
            <div className="h-10 bg-[#121418] border-b border-white/5 flex items-center px-4 gap-4 z-40 shrink-0 sticky top-12">
                <div className="relative">
                    <button 
                      onClick={() => setShowTfMenu(!showTfMenu)}
                      className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded hover:bg-white/10 text-[10px] font-bold text-slate-300 transition-all"
                    >
                        <Clock size={12} />
                        <span className="uppercase">{timeframes.find(tf => tf.id === activeTf)?.label}</span>
                        <ChevronDown size={10} />
                    </button>
                    {showTfMenu && (
                      <div className="absolute top-full left-0 mt-1 w-32 bg-[#1e222d] border border-white/10 rounded shadow-2xl z-[100] py-1">
                        {timeframes.map(tf => (
                          <button 
                            key={tf.id} 
                            onClick={() => handleTfChange(tf.id)}
                            className={`w-full text-left px-4 py-2 text-[10px] font-bold uppercase transition-colors ${activeTf === tf.id ? 'text-blue-400 bg-blue-500/5' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                          >
                            {tf.label}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
                
                <div className="h-4 w-px bg-white/5 mx-1 hidden xs:block"></div>

                <div className="relative">
                    <button 
                      onClick={() => !props.isLocked && setShowIndicatorsMenu(!showIndicatorsMenu)}
                      className={`flex items-center gap-2 px-3 py-1 rounded text-[10px] font-bold transition-all ${props.isLocked ? 'bg-red-500/10 text-red-500 cursor-not-allowed border border-red-500/20' : 'bg-white/5 hover:bg-white/10 text-slate-300'}`}
                    >
                        <BarChart2 size={12} />
                        <span className="uppercase">{props.isLocked ? 'Indicators Locked' : 'Indicators'}</span>
                        <ChevronDown size={10} />
                    </button>
                    {showIndicatorsMenu && !props.isLocked && (
                      <div className="absolute top-full left-0 mt-1 w-56 bg-[#1e222d] border border-white/10 rounded shadow-2xl z-[100] py-2 overflow-hidden">
                        <div className="px-4 py-2 border-b border-white/5 mb-1">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Technical Indicators</span>
                        </div>
                        {availableIndicators.map(ind => (
                          <button 
                            key={ind.id} 
                            onClick={() => toggleIndicator(ind.id)}
                            className={`w-full text-left px-4 py-2.5 transition-colors flex items-center justify-between group ${indicators.includes(ind.id) ? 'bg-blue-500/10' : 'hover:bg-white/5'}`}
                          >
                            <div className="flex flex-col">
                                <span className={`text-[10px] font-bold uppercase ${indicators.includes(ind.id) ? 'text-blue-400' : 'text-slate-300'}`}>{ind.label}</span>
                                <span className="text-[8px] text-slate-500 font-medium">{ind.description}</span>
                            </div>
                            {indicators.includes(ind.id) && (
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"></div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                </div>

                <div className="h-4 w-px bg-white/5 mx-1 hidden xs:block"></div>

                <div className="relative">
                    <button 
                      onClick={() => setShowLayoutMenu(!showLayoutMenu)}
                      className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded hover:bg-white/10 text-[10px] font-bold text-slate-300 transition-all"
                    >
                        <LayoutDashboard size={12} />
                        <span className="uppercase">Layout</span>
                        <ChevronDown size={10} />
                    </button>
                    {showLayoutMenu && (
                      <div className="absolute top-full left-0 mt-1 w-40 bg-[#1e222d] border border-white/10 rounded shadow-2xl z-[100] py-1">
                        {layouts.map(l => (
                          <button 
                            key={l.id} 
                            onClick={() => { setLayout(l.id as any); setShowLayoutMenu(false); }}
                            className={`w-full text-left px-4 py-2 text-[10px] font-bold uppercase transition-colors flex items-center gap-3 ${layout === l.id ? 'text-blue-400 bg-blue-500/5' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                          >
                            <span className="text-lg">{l.icon}</span>
                            {l.label}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
                
                <div className="h-4 w-px bg-white/5 mx-1 hidden xs:block"></div>
                
                <div className="flex items-center gap-4 text-[10px] font-mono">
                    <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 uppercase font-sans font-bold">High:</span>
                        <span className="text-emerald-500 font-bold">{formatUSD(props.marketDetails[props.symbol]?.high)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 uppercase font-sans font-bold">Low:</span>
                        <span className="text-rose-500 font-bold">{formatUSD(props.marketDetails[props.symbol]?.low)}</span>
                    </div>
                </div>

                <div className="lg:hidden ml-auto flex gap-2">
                   <button onClick={() => setIsMarketsOpen(true)} className="p-1.5 bg-white/5 rounded text-slate-400"><LayoutDashboard size={14}/></button>
                   <button onClick={() => setIsOrderOpen(true)} className="p-1.5 bg-blue-600/20 rounded text-blue-400"><ShoppingCart size={14}/></button>
                </div>

                <div className="ml-auto hidden lg:flex bg-black/40 rounded p-0.5 border border-white/5">
                    <button 
                      onClick={() => setActiveView('CHART')}
                      className={`px-4 py-1 rounded text-[9px] font-black uppercase tracking-widest transition-all ${activeView === 'CHART' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      Live Chart
                    </button>
                    <button 
                      onClick={() => setActiveView('BACKTEST')}
                      className={`px-4 py-1 rounded text-[9px] font-black uppercase tracking-widest transition-all ${activeView === 'BACKTEST' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      Backtest
                    </button>
                </div>
            </div>

            <div className={`h-[500px] lg:h-[600px] relative shrink-0 grid gap-1 p-1 bg-black/20 ${getLayoutGridClass()}`}>
               {activeView === 'CHART' ? (
                 Array.from({ length: getChartCount() }).map((_, idx) => (
                   <div key={idx} className="relative border border-white/5 rounded overflow-hidden bg-[#0b0c10]">
                      <div className="absolute top-2 left-2 z-50 flex items-center gap-2">
                        <select 
                          value={layoutSymbols[idx] || props.symbol}
                          onChange={(e) => {
                            const newSymbols = [...layoutSymbols];
                            newSymbols[idx] = e.target.value as Symbol;
                            setLayoutSymbols(newSymbols);
                          }}
                          className="bg-black/60 text-white text-[9px] font-bold uppercase border border-white/10 rounded px-1 py-0.5 outline-none focus:border-blue-500 transition-all"
                        >
                          {Object.keys(props.prices).filter(s => {
                            const asset = ASSETS[s as Symbol];
                            if (props.botState.accountType === AccountType.REAL) {
                              if (asset.CATEGORY !== 'CRYPTO') return false;
                              if (asset.MODES && !asset.MODES.includes(props.botState.tradingMode)) return false;
                            }
                            return true;
                          }).map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      {props.botState.accountType === AccountType.REAL ? (
                        <TradingViewWidget 
                          symbol={layoutSymbols[idx] || props.symbol}
                          tradingMode={props.botState.tradingMode}
                        />
                      ) : (
                        <CandlestickChart 
                          symbol={layoutSymbols[idx] || props.symbol} 
                          currentPrice={props.prices[layoutSymbols[idx] || props.symbol]} 
                          timeframe={activeTf}
                          trades={props.trades.filter(t => t.accountType === props.botState.accountType)}
                          markers={markersMap[layoutSymbols[idx] || props.symbol] || []}
                          onUpdateTrade={props.onUpdateTrade}
                          indicators={indicators}
                        />
                      )}
                   </div>
                 ))
               ) : (
                 <BacktestEngine 
                    currentSymbol={props.symbol}
                    hftSettings={props.hftSettings}
                    hedgingSettings={props.hedgingSettings}
                    nebulaV5Settings={props.nebulaV5Settings}
                    customLogic={props.botState.customLogic || ''}
                 />
               )}
            </div>

            <div className="min-h-[340px] border-t border-white/5 shrink-0 flex flex-col bg-[#121418]">
               <OpenTradesPanel 
                  trades={props.trades.filter(t => t.accountType === props.botState.accountType)} 
                  prices={props.prices} 
                  onCloseTrade={props.onCloseTrade}
                  onUpdateTrade={props.onUpdateTrade}
                  logs={props.logs}
                  accountType={props.botState.accountType}
                  renderFooter={() => (
                    <div className="h-[80px] shrink-0 border-t border-white/5">
                       <InstrumentList 
                         activeSymbol={props.symbol} 
                         onSelect={handleTabSelect} 
                         marketDetails={props.marketDetails} 
                         variant="horizontal"
                         accountType={props.botState.accountType}
                         tradingMode={props.botState.tradingMode}
                       />
                    </div>
                  )}
               />
            </div>
        </main>

        {/* Right Execution Sidebar */}
        <aside className={`fixed inset-y-0 lg:inset-y-auto lg:sticky lg:top-12 right-0 w-[320px] lg:h-[calc(100vh-4rem)] z-[200] lg:z-[60] transform lg:translate-x-0 transition-transform duration-300 border-l border-white/5 bg-[#121418] flex flex-col shadow-2xl ${isOrderOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
             <div className="lg:hidden p-4 border-b border-white/5 flex justify-between items-center bg-black/40">
                <span className="text-[10px] font-black uppercase text-blue-500 tracking-widest">Execution Core</span>
                <button onClick={() => setIsOrderOpen(false)}><X size={18} className="text-slate-500"/></button>
             </div>
             <div className="flex-1 overflow-y-auto custom-scrollbar">
                 <OrderPanel 
                    symbol={props.symbol}
                    marketDetails={props.marketDetails[props.symbol]}
                    riskSettings={props.riskSettings}
                    balance={props.balance}
                    onManualTrade={props.onManualTrade}
                    isBotActive={props.isBotActive}
                    onToggleBot={props.onToggleBot}
                    isAnalyzing={props.isAnalyzing}
                    onAnalyze={props.onAnalyze}
                    activeStrategy={props.activeStrategy}
                    onSetStrategy={props.onSetStrategy}
                    onRiskUpdate={props.onRiskUpdate}
                    nebulaV5Settings={props.nebulaV5Settings}
                    onUpdateNebulaV5Settings={props.onUpdateNebulaV5Settings}
                    hedgingSettings={props.hedgingSettings}
                    onUpdateHedgingSettings={props.onUpdateHedgingSettings}
                    hftSettings={props.hftSettings}
                    onUpdateHFTSettings={props.onUpdateHFTSettings}
                    accountType={props.botState.accountType}
                    onSetAccountType={props.onSetAccountType}
                    tradingMode={props.botState.tradingMode}
                    onSetTradingMode={props.onSetTradingMode}
                    isBinanceConnected={props.botState.isBinanceConnected}
                    onConnectBinance={props.onConnectBinance}
                    onOpenDeposit={props.onOpenDeposit}
                    onOpenWithdraw={props.onOpenWithdraw}
                    isLocked={props.isLocked}
                 />
                 
                 {/* CUSTOM AI BOT PANEL ADDED ABOVE ORDER BOOK */}
                 <CustomBotPanel 
                    isActive={props.botState.isRunning && props.botState.strategy === 'CUSTOM_AI'}
                    onToggle={() => !props.isLocked && handleToggleCustomBot()}
                    logic={props.botState.customLogic || ''}
                    onLogicChange={props.onUpdateCustomLogic}
                    onDeploy={() => {}}
                    isLocked={props.isLocked}
                 />

                 <OrderBook symbol={props.symbol} currentPrice={props.prices[props.symbol]} />
                  <div className="p-4 border-t border-white/5">
                    <AssetAIInsight 
                      symbol={props.symbol}
                      candles={props.candles}
                      timeframe={props.selectedTimeframe}
                      onCopyTrade={props.onCopyTrade}
                      isLocked={props.isLocked}
                    />
                  </div>
             </div>
        </aside>
      </div>

      {/* Footer Status Bar */}
      <footer className="h-6 bg-black border-t border-white/5 flex items-center justify-between px-4 fixed bottom-0 left-0 w-full z-[100]">
          <div className="flex items-center gap-6 text-[8px] font-mono text-slate-600 uppercase tracking-[0.2em] font-bold">
              <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
                  <span className="hidden sm:inline">Data Link: 2ms</span>
              </div>
              <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${props.isBotActive ? 'bg-blue-500 shadow-[0_0_8px_#3b82f6]' : 'bg-slate-800'}`}></div>
                  <span>Strategy: {props.isBotActive ? 'Running' : 'Standby'}</span>
              </div>
          </div>
          <div className="text-[8px] font-mono text-slate-700 uppercase tracking-[0.3em] font-black">
              Nebula System OS 2.0.1
          </div>
      </footer>
    </div>
  );
};

export default TerminalView;
