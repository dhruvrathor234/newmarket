
import React, { useState, useEffect } from 'react';
import { Symbol, NebulaV5Settings, BacktestReport, BotStrategy, BacktestStrategy, HFTBotSettings, HedgingBotSettings } from '../types';
import { fetchCandles } from '../services/priceService';
import { runNebulaBacktest, runCustomBacktest, runStrategyBacktest } from '../services/backtestService';
import { Play, TrendingUp, TrendingDown, BarChart3, List, PieChart, ChevronRight, ChevronDown, Download, BrainCircuit, Sparkles, Settings2, FileText } from 'lucide-react';
import { ASSETS } from '../constants';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BacktestEngineProps {
  currentSymbol: Symbol;
  nebulaV5Settings: NebulaV5Settings;
  hftSettings: HFTBotSettings;
  hedgingSettings: HedgingBotSettings;
  customLogic: string;
}

const BacktestEngine: React.FC<BacktestEngineProps> = ({ 
  currentSymbol, 
  nebulaV5Settings: initialNebulaSettings, 
  hftSettings: initialHftSettings,
  hedgingSettings: initialHedgingSettings,
  customLogic 
}) => {
  const [symbol, setSymbol] = useState<Symbol>(currentSymbol);
  const [timeframe, setTimeframe] = useState<string>('15m');
  const [strategy, setStrategy] = useState<BacktestStrategy>('NEBULA_V5');
  const [localLogic, setLocalLogic] = useState(customLogic);
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<BacktestReport | null>(null);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TRADES'>('OVERVIEW');
  const [showSettings, setShowSettings] = useState(true);

  // Local settings for backtest
  const [nebulaSettings, setNebulaSettings] = useState<NebulaV5Settings>(initialNebulaSettings);
  const [hftSettings, setHftSettings] = useState<HFTBotSettings>(initialHftSettings);
  const [hedgingSettings, setHedgingSettings] = useState<HedgingBotSettings>(initialHedgingSettings);

  useEffect(() => {
    setLocalLogic(customLogic);
  }, [customLogic]);

  const handleRunBacktest = async () => {
    setIsRunning(true);
    try {
      const candles = await fetchCandles(symbol, timeframe as any, 1000);
      const result = await runStrategyBacktest(
        strategy, 
        candles, 
        localLogic, 
        nebulaSettings,
        hftSettings,
        hedgingSettings
      );
      setReport(result);
    } catch (error) {
      console.error("Backtest failed:", error);
    } finally {
      setIsRunning(false);
    }
  };

  const downloadPDF = () => {
    if (!report) return;

    const doc = new jsPDF();
    
    // Add Title
    doc.setFontSize(20);
    doc.setTextColor(30, 34, 45);
    doc.text('Nebulamarket Backtest Report', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Symbol: ${symbol}`, 14, 32);
    doc.text(`Timeframe: ${timeframe}`, 14, 38);
    doc.text(`Strategy: ${strategy}`, 14, 44);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 50);

    // Summary Box
    doc.setFillColor(245, 247, 250);
    doc.rect(14, 58, 182, 40, 'F');
    
    doc.setFontSize(12);
    doc.setTextColor(30, 34, 45);
    doc.text('Performance Summary', 18, 68);
    
    doc.setFontSize(10);
    doc.text(`Net Profit: ${report.netProfit.toFixed(2)} USD`, 18, 76);
    doc.text(`Win Rate: ${report.winRate.toFixed(1)}%`, 18, 82);
    doc.text(`Profit Factor: ${report.profitFactor.toFixed(2)}`, 18, 88);
    doc.text(`Max Drawdown: ${report.maxDrawdown.toFixed(2)}%`, 18, 94);
    
    doc.text(`Total Trades: ${report.totalTrades}`, 100, 76);
    doc.text(`Avg. Trade profit: ${report.avgTrade.toFixed(2)} USD`, 100, 82);
    doc.text(`Wins: ${report.trades.filter(t => t.status === 'WIN').length}`, 100, 88);
    doc.text(`Losses: ${report.trades.filter(t => t.status === 'LOSS').length}`, 100, 94);

    // Trade History Table
    const tableData = report.trades.map(trade => [
      trade.type,
      trade.entryPrice.toFixed(2),
      trade.exitPrice.toFixed(2),
      `${trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}`,
      `${trade.pnlPercentage >= 0 ? '+' : ''}${trade.pnlPercentage.toFixed(2)}%`,
      trade.status
    ]);

    autoTable(doc, {
      startY: 110,
      head: [['Type', 'Entry', 'Exit', 'PnL (USD)', 'PnL (%)', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [30, 34, 45], textColor: [255, 255, 255] },
      columnStyles: {
        3: { fontStyle: 'bold' },
        4: { fontStyle: 'bold' },
        5: { fontStyle: 'bold' }
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
            if (data.column.index === 3 || data.column.index === 4) {
                const val = parseFloat(data.cell.text[0]);
                if (val >= 0) data.cell.styles.textColor = [16, 185, 129];
                else data.cell.styles.textColor = [244, 63, 94];
            }
            if (data.column.index === 5) {
                if (data.cell.text[0] === 'WIN') data.cell.styles.textColor = [16, 185, 129];
                else data.cell.styles.textColor = [244, 63, 94];
            }
        }
      }
    });

    doc.save(`Nebulamarket_Backtest_${symbol}_${strategy}_${new Date().getTime()}.pdf`);
  };

  const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];

  return (
    <div className="flex flex-col h-full bg-[#0b0c10] text-white font-sans">
      {/* Header / Controls */}
      <div className="p-4 border-b border-white/5 bg-[#121418] flex flex-wrap items-center gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[8px] uppercase font-black text-slate-500 tracking-widest">Instrument</span>
          <select 
            value={symbol} 
            onChange={(e) => setSymbol(e.target.value as Symbol)}
            className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-[10px] font-bold outline-none focus:border-blue-500 transition-all"
          >
            {Object.keys(ASSETS).map(s => (
              <option key={s} value={s} className="bg-[#1e222d]">{s}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[8px] uppercase font-black text-slate-500 tracking-widest">Timeframe</span>
          <select 
            value={timeframe} 
            onChange={(e) => setTimeframe(e.target.value)}
            className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-[10px] font-bold outline-none focus:border-blue-500 transition-all"
          >
            {timeframes.map(tf => (
              <option key={tf} value={tf} className="bg-[#1e222d]">{tf}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[8px] uppercase font-black text-slate-500 tracking-widest">Strategy</span>
          <select 
            value={strategy} 
            onChange={(e) => setStrategy(e.target.value as BacktestStrategy)}
            className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-[10px] font-bold outline-none focus:border-blue-500 transition-all"
          >
            <option value="NEBULA_V5" className="bg-[#1e222d]">NEBULA V5 PIVOT</option>
            <option value="NEBULA_V6" className="bg-[#1e222d]">NEBULA V6 FRACTAL</option>
            <option value="HFT_BOT" className="bg-[#1e222d]">HFT BOT ALPHA</option>
            <option value="HEDGING_BOT" className="bg-[#1e222d]">HEDGING MARTINGALE</option>
            <option value="TECHNICAL_V2" className="bg-[#1e222d]">TECHNICAL CORE</option>
            <option value="SENTIMENT" className="bg-[#1e222d]">SENTIMENT AI</option>
            <option value="CUSTOM_AI" className="bg-[#1e222d]">CUSTOM AI BOT</option>
          </select>
        </div>

        <button 
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded border border-white/10 transition-all ${showSettings ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-white/5 text-slate-400'}`}
          title="Strategy Settings"
        >
          <Settings2 size={16} />
        </button>

        <button 
          onClick={handleRunBacktest}
          disabled={isRunning}
          className={`ml-auto flex items-center gap-2 px-6 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${isRunning ? 'bg-slate-800 text-slate-500' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20'}`}
        >
          {isRunning ? (
            <>
              <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              Processing...
            </>
          ) : (
            <>
              <Play size={14} fill="currentColor" />
              Run Backtest
            </>
          )}
        </button>
      </div>

      {/* Strategy Settings Panel */}
      {showSettings && (
        <div className="p-4 bg-[#121418] border-b border-white/5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {strategy === 'NEBULA_V5' && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-[8px] uppercase font-black text-slate-500 tracking-widest">Basis Type</label>
                <select 
                  value={nebulaSettings.basisType}
                  onChange={(e) => setNebulaSettings({...nebulaSettings, basisType: e.target.value as any})}
                  className="bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] outline-none focus:border-blue-500"
                >
                  <option value="ALMA">ALMA</option>
                  <option value="TEMA">TEMA</option>
                  <option value="HullMA">HullMA</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[8px] uppercase font-black text-slate-500 tracking-widest">Basis Length</label>
                <input 
                  type="number"
                  value={nebulaSettings.basisLen}
                  onChange={(e) => setNebulaSettings({...nebulaSettings, basisLen: parseInt(e.target.value)})}
                  className="bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[8px] uppercase font-black text-slate-500 tracking-widest">Pivot Period</label>
                <input 
                  type="number"
                  value={nebulaSettings.pivotPeriod}
                  onChange={(e) => setNebulaSettings({...nebulaSettings, pivotPeriod: parseInt(e.target.value)})}
                  className="bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[8px] uppercase font-black text-slate-500 tracking-widest">Timeframe</label>
                <input 
                  type="text"
                  value={nebulaSettings.timeframe}
                  onChange={(e) => setNebulaSettings({...nebulaSettings, timeframe: e.target.value})}
                  className="bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[8px] uppercase font-black text-slate-500 tracking-widest">ALMA Offset</label>
                <input 
                  type="number"
                  step="0.1"
                  value={nebulaSettings.offsetALMA}
                  onChange={(e) => setNebulaSettings({...nebulaSettings, offsetALMA: parseFloat(e.target.value)})}
                  className="bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[8px] uppercase font-black text-slate-500 tracking-widest">ALMA Sigma</label>
                <input 
                  type="number"
                  step="0.1"
                  value={nebulaSettings.offsetSigma}
                  onChange={(e) => setNebulaSettings({...nebulaSettings, offsetSigma: parseFloat(e.target.value)})}
                  className="bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] outline-none focus:border-blue-500"
                />
              </div>
            </>
          )}

          {strategy === 'HFT_BOT' && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-[8px] uppercase font-black text-slate-500 tracking-widest">Magic No.</label>
                <input 
                  type="number"
                  value={hftSettings.magicNumber}
                  onChange={(e) => setHftSettings({...hftSettings, magicNumber: parseInt(e.target.value)})}
                  className="bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[8px] uppercase font-black text-slate-500 tracking-widest">Slippage</label>
                <input 
                  type="number"
                  value={hftSettings.slippage}
                  onChange={(e) => setHftSettings({...hftSettings, slippage: parseInt(e.target.value)})}
                  className="bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[8px] uppercase font-black text-slate-500 tracking-widest">Start Hr</label>
                <input 
                  type="number"
                  min="0" max="23"
                  value={hftSettings.startHour}
                  onChange={(e) => setHftSettings({...hftSettings, startHour: parseInt(e.target.value)})}
                  className="bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[8px] uppercase font-black text-slate-500 tracking-widest">End Hr</label>
                <input 
                  type="number"
                  min="0" max="23"
                  value={hftSettings.endHour}
                  onChange={(e) => setHftSettings({...hftSettings, endHour: parseInt(e.target.value)})}
                  className="bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[8px] uppercase font-black text-slate-500 tracking-widest">Lot Type</label>
                <select 
                  value={hftSettings.lotType}
                  onChange={(e) => setHftSettings({...hftSettings, lotType: e.target.value as any})}
                  className="bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] outline-none focus:border-blue-500"
                >
                  <option value="FIXED">FIXED</option>
                  <option value="BALANCE_PCT">BALANCE %</option>
                  <option value="EQUITY_PCT">EQUITY %</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[8px] uppercase font-black text-slate-500 tracking-widest">Fixed Lot</label>
                <input 
                  type="number"
                  step="0.01"
                  value={hftSettings.fixedLot}
                  onChange={(e) => setHftSettings({...hftSettings, fixedLot: parseFloat(e.target.value)})}
                  className="bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[8px] uppercase font-black text-slate-500 tracking-widest">Risk %</label>
                <input 
                  type="number"
                  step="0.1"
                  value={hftSettings.riskPercent}
                  onChange={(e) => setHftSettings({...hftSettings, riskPercent: parseFloat(e.target.value)})}
                  className="bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[8px] uppercase font-black text-slate-500 tracking-widest">Delta</label>
                <input 
                  type="number"
                  value={hftSettings.delta}
                  onChange={(e) => setHftSettings({...hftSettings, delta: parseInt(e.target.value)})}
                  className="bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[8px] uppercase font-black text-slate-500 tracking-widest">Order Dist</label>
                <input 
                  type="number"
                  value={hftSettings.maxDistance}
                  onChange={(e) => setHftSettings({...hftSettings, maxDistance: parseInt(e.target.value)})}
                  className="bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[8px] uppercase font-black text-slate-500 tracking-widest">Stop Loss</label>
                <input 
                  type="number"
                  value={hftSettings.stopLoss}
                  onChange={(e) => setHftSettings({...hftSettings, stopLoss: parseInt(e.target.value)})}
                  className="bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[8px] uppercase font-black text-slate-500 tracking-widest">Max Trailing</label>
                <input 
                  type="number"
                  value={hftSettings.maxTrailing}
                  onChange={(e) => setHftSettings({...hftSettings, maxTrailing: parseInt(e.target.value)})}
                  className="bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[8px] uppercase font-black text-slate-500 tracking-widest">Max Spread</label>
                <input 
                  type="number"
                  value={hftSettings.maxSpread}
                  onChange={(e) => setHftSettings({...hftSettings, maxSpread: parseInt(e.target.value)})}
                  className="bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] outline-none focus:border-blue-500"
                />
              </div>
            </>
          )}

          {strategy === 'HEDGING_BOT' && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-[8px] uppercase font-black text-slate-500 tracking-widest">Initial Lot</label>
                <input 
                  type="number"
                  step="0.01"
                  value={hedgingSettings.initialLot}
                  onChange={(e) => setHedgingSettings({...hedgingSettings, initialLot: parseFloat(e.target.value)})}
                  className="bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[8px] uppercase font-black text-slate-500 tracking-widest">Multiplier</label>
                <input 
                  type="number"
                  step="0.1"
                  value={hedgingSettings.lotMultiplier}
                  onChange={(e) => setHedgingSettings({...hedgingSettings, lotMultiplier: parseFloat(e.target.value)})}
                  className="bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[8px] uppercase font-black text-slate-500 tracking-widest">Distance (Pips)</label>
                <input 
                  type="number"
                  value={hedgingSettings.distancePips}
                  onChange={(e) => setHedgingSettings({...hedgingSettings, distancePips: parseInt(e.target.value)})}
                  className="bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[8px] uppercase font-black text-slate-500 tracking-widest">Cooldown (Sec)</label>
                <input 
                  type="number"
                  value={hedgingSettings.waitAfterCloseSec}
                  onChange={(e) => setHedgingSettings({...hedgingSettings, waitAfterCloseSec: parseInt(e.target.value)})}
                  className="bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[8px] uppercase font-black text-slate-500 tracking-widest">TP (Pips)</label>
                <input 
                  type="number"
                  value={hedgingSettings.takeProfitPips}
                  onChange={(e) => setHedgingSettings({...hedgingSettings, takeProfitPips: parseInt(e.target.value)})}
                  className="bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[8px] uppercase font-black text-slate-500 tracking-widest">SL (Pips)</label>
                <input 
                  type="number"
                  value={hedgingSettings.stopLossPips}
                  onChange={(e) => setHedgingSettings({...hedgingSettings, stopLossPips: parseInt(e.target.value)})}
                  className="bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[8px] uppercase font-black text-slate-500 tracking-widest">Min Trades</label>
                <input 
                  type="number"
                  value={hedgingSettings.netProfitTriggerAfterTrades}
                  onChange={(e) => setHedgingSettings({...hedgingSettings, netProfitTriggerAfterTrades: parseInt(e.target.value)})}
                  className="bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[8px] uppercase font-black text-slate-500 tracking-widest">Target USD</label>
                <input 
                  type="number"
                  value={hedgingSettings.profitTargetUSD}
                  onChange={(e) => setHedgingSettings({...hedgingSettings, profitTargetUSD: parseInt(e.target.value)})}
                  className="bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] outline-none focus:border-blue-500"
                />
              </div>
            </>
          )}

          {strategy === 'CUSTOM_AI' && (
            <div className="col-span-full space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BrainCircuit size={14} className="text-blue-500" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Backtest Custom Logic</span>
                </div>
                <div className="flex items-center gap-1">
                  <Sparkles size={12} className="text-blue-400" />
                  <span className="text-[8px] text-blue-400 font-mono uppercase">AI Interpreter Active</span>
                </div>
              </div>
              <textarea 
                value={localLogic}
                onChange={(e) => setLocalLogic(e.target.value)}
                placeholder="e.g. Buy when RSI is below 30 and price is above 200 EMA..."
                className="w-full h-24 bg-black/40 border border-white/5 rounded-lg p-3 text-[11px] text-blue-100 font-mono focus:border-blue-500/30 outline-none resize-none placeholder:text-slate-800 transition-all"
              />
            </div>
          )}
        </div>
      )}

      {/* Results Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {!report && !isRunning && (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4">
            <BarChart3 size={48} strokeWidth={1} className="opacity-20" />
            <div className="text-center">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-1">Backtesting Engine</h3>
              <p className="text-[10px] max-w-[250px] leading-relaxed">Select your parameters and run the strategy to see historical performance reports.</p>
            </div>
          </div>
        )}

        {report && (
          <>
            {/* Tabs */}
            <div className="flex border-b border-white/5 bg-[#121418]">
              <button 
                onClick={() => setActiveTab('OVERVIEW')}
                className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'OVERVIEW' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Strategy Overview
                {activeTab === 'OVERVIEW' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500"></div>}
              </button>
              <button 
                onClick={() => setActiveTab('TRADES')}
                className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'TRADES' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Trade List ({report.totalTrades})
                {activeTab === 'TRADES' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500"></div>}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              {activeTab === 'OVERVIEW' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {/* Stats Cards */}
                  <div className="bg-[#1a1d26] p-4 rounded-xl border border-white/5">
                    <span className="text-[8px] uppercase font-black text-slate-500 tracking-widest block mb-2">Net Profit</span>
                    <div className={`text-xl font-black font-mono ${report.netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {report.netProfit >= 0 ? '+' : ''}{report.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </div>
                  </div>

                  <div className="bg-[#1a1d26] p-4 rounded-xl border border-white/5">
                    <span className="text-[8px] uppercase font-black text-slate-500 tracking-widest block mb-2">Win Rate</span>
                    <div className="text-xl font-black font-mono text-blue-400">
                      {report.winRate.toFixed(1)}%
                    </div>
                  </div>

                  <div className="bg-[#1a1d26] p-4 rounded-xl border border-white/5">
                    <span className="text-[8px] uppercase font-black text-slate-500 tracking-widest block mb-2">Profit Factor</span>
                    <div className="text-xl font-black font-mono text-white">
                      {report.profitFactor.toFixed(2)}
                    </div>
                  </div>

                  <div className="bg-[#1a1d26] p-4 rounded-xl border border-white/5">
                    <span className="text-[8px] uppercase font-black text-slate-500 tracking-widest block mb-2">Max Drawdown</span>
                    <div className="text-xl font-black font-mono text-rose-400">
                      {report.maxDrawdown.toFixed(2)}%
                    </div>
                  </div>

                  {/* Detailed Stats */}
                  <div className="col-span-full grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                    <div className="bg-[#1a1d26] rounded-xl border border-white/5 overflow-hidden">
                      <div className="px-4 py-3 border-b border-white/5 bg-white/5 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest">Performance Metrics</span>
                        <BarChart3 size={14} className="text-slate-500" />
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-slate-400 uppercase font-bold">Total Trades</span>
                          <span className="text-[10px] font-mono font-bold text-white">{report.totalTrades}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-slate-400 uppercase font-bold">Avg. Trade Profit</span>
                          <span className={`text-[10px] font-mono font-bold ${report.avgTrade >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {report.avgTrade.toFixed(2)} USD
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-slate-400 uppercase font-bold">Winning Trades</span>
                          <span className="text-[10px] font-mono font-bold text-emerald-500">{report.trades.filter(t => t.status === 'WIN').length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-slate-400 uppercase font-bold">Losing Trades</span>
                          <span className="text-[10px] font-mono font-bold text-rose-500">{report.trades.filter(t => t.status === 'LOSS').length}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#1a1d26] rounded-xl border border-white/5 overflow-hidden">
                      <div className="px-4 py-3 border-b border-white/5 bg-white/5 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest">Strategy Report</span>
                        <div className="flex items-center gap-2">
                           <button 
                             onClick={downloadPDF}
                             className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded transition-all cursor-pointer flex items-center gap-2"
                             title="Download PDF Report"
                           >
                              <Download size={12} />
                              <span className="text-[8px] font-black uppercase">Download PDF</span>
                           </button>
                        </div>
                      </div>
                      <div className="p-4 flex flex-col items-center justify-center h-[120px] text-center">
                         <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mb-4">
                            <div 
                              className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                              style={{ width: `${report.winRate}%` }}
                            ></div>
                         </div>
                         <p className="text-[9px] text-slate-500 uppercase font-bold leading-relaxed">
                            This strategy shows a <span className="text-blue-400">{report.winRate.toFixed(1)}% win rate</span> over the last 1000 candles on {symbol} ({timeframe}).
                         </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-6 px-4 py-2 text-[8px] font-black uppercase text-slate-500 tracking-widest border-b border-white/5">
                    <span>Type</span>
                    <span>Entry</span>
                    <span>Exit</span>
                    <span>PnL (USD)</span>
                    <span>PnL (%)</span>
                    <span className="text-right">Status</span>
                  </div>
                  {report.trades.map((trade) => (
                    <div key={trade.id} className="grid grid-cols-6 px-4 py-3 bg-[#1a1d26] rounded-lg border border-white/5 items-center hover:bg-[#232733] transition-colors group">
                      <div className="flex items-center gap-2">
                        {trade.type === 'BUY' ? (
                          <div className="w-6 h-6 bg-emerald-500/10 rounded flex items-center justify-center text-emerald-500">
                            <TrendingUp size={12} />
                          </div>
                        ) : (
                          <div className="w-6 h-6 bg-rose-500/10 rounded flex items-center justify-center text-rose-500">
                            <TrendingDown size={12} />
                          </div>
                        )}
                        <span className={`text-[10px] font-black ${trade.type === 'BUY' ? 'text-emerald-500' : 'text-rose-500'}`}>{trade.type}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-300">{trade.entryPrice.toFixed(2)}</span>
                      <span className="text-[10px] font-mono text-slate-300">{trade.exitPrice.toFixed(2)}</span>
                      <span className={`text-[10px] font-mono font-bold ${trade.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                      </span>
                      <span className={`text-[10px] font-mono font-bold ${trade.pnlPercentage >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {trade.pnlPercentage >= 0 ? '+' : ''}{trade.pnlPercentage.toFixed(2)}%
                      </span>
                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${trade.status === 'WIN' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                          {trade.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BacktestEngine;
