
import React, { useState } from 'react';
import { Trade, Symbol, AccountType } from '../../types';
import { History, TrendingUp, X, Check, Pencil, AlertCircle, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PortfolioViewProps {
  trades: Trade[];
  prices: Record<Symbol, number>;
  onCloseTrade: (tradeId: string) => void;
  onUpdateTrade: (tradeId: string, newSL: number, newTP: number) => void;
  accountType: AccountType;
}

const PortfolioTradeRow: React.FC<{
    trade: Trade;
    currentPrice: number;
    onClose: () => void;
    onUpdate: (id: string, sl: number, tp: number) => void;
}> = ({ trade, currentPrice, onClose, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [sl, setSl] = useState(trade.stopLoss.toString());
    const [tp, setTp] = useState(trade.takeProfit?.toString() || '');

    const handleSave = () => {
        const numSL = parseFloat(sl);
        const numTP = parseFloat(tp);
        if (!isNaN(numSL) && !isNaN(numTP)) {
            onUpdate(trade.id, numSL, numTP);
            setIsEditing(false);
        }
    };

    const isProfit = (trade.pnl || 0) >= 0;

    return (
        <tr className="hover:bg-white/5 transition-colors group">
            <td className="p-3 text-slate-400 whitespace-nowrap">{new Date(trade.openTime).toLocaleString()}</td>
            <td className="p-3 font-bold text-white font-mono sticky left-0 bg-[#0b0c10] z-10">{trade.symbol}</td>
            <td className={`p-3 font-bold ${trade.type === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>{trade.type}</td>
            <td className="p-3 text-right text-slate-300 font-mono">{trade.lotSize}</td>
            <td className="p-3 text-right text-slate-300 font-mono">{trade.entryPrice.toFixed(2)}</td>
            <td className="p-3 text-right text-slate-200 font-mono">{currentPrice.toFixed(2)}</td>
            
            <td className="p-3 text-right font-mono text-slate-300">
                {isEditing ? (
                   <input 
                      value={sl} 
                      onChange={e => setSl(e.target.value)} 
                      className="w-20 bg-black/50 border border-rose-500/50 rounded px-1 py-0.5 text-right text-xs focus:outline-none focus:border-rose-400 text-rose-300" 
                   />
                ) : (
                    <span className="text-rose-400/80">{trade.stopLoss.toFixed(2)}</span>
                )}
            </td>

            <td className="p-3 text-right font-mono text-slate-300">
                {isEditing ? (
                   <input 
                      value={tp} 
                      onChange={e => setTp(e.target.value)} 
                      className="w-20 bg-black/50 border border-emerald-500/50 rounded px-1 py-0.5 text-right text-xs focus:outline-none focus:border-emerald-400 text-emerald-300" 
                   />
                ) : (
                    <span className="text-emerald-400/80">{trade.takeProfit?.toFixed(2) || '-'}</span>
                )}
            </td>

            <td className={`p-3 text-right font-bold font-mono ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isProfit ? '+' : ''}{(trade.pnl || 0).toFixed(2)}
            </td>
            
            <td className="p-3 text-right sticky right-0 bg-[#0b0c10] z-10">
                <div className="flex justify-end gap-2 items-center">
                    {isEditing ? (
                        <>
                            <button onClick={handleSave} className="p-1.5 rounded hover:bg-emerald-500/20 text-emerald-400 transition-colors">
                                <Check size={14} />
                            </button>
                            <button onClick={() => setIsEditing(false)} className="p-1.5 rounded hover:bg-slate-700/50 text-slate-400 transition-colors">
                                <X size={14} />
                            </button>
                        </>
                    ) : (
                        <button onClick={() => setIsEditing(true)} className="p-1.5 rounded hover:bg-blue-500/20 text-slate-500 hover:text-blue-400 transition-colors opacity-100 lg:opacity-0 group-hover:opacity-100">
                            <Pencil size={12} />
                        </button>
                    )}
                    
                    <button 
                        onClick={onClose} 
                        className="bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white px-2 py-1 rounded text-[9px] uppercase font-bold tracking-wide transition-all border border-rose-500/20 ml-2"
                    >
                        Close
                    </button>
                </div>
            </td>
        </tr>
    );
};

const PortfolioView: React.FC<PortfolioViewProps> = ({ trades, prices, onCloseTrade, onUpdateTrade, accountType }) => {
  const filteredTrades = trades.filter(t => t.accountType === accountType);
  const closedTrades = filteredTrades.filter(t => t.status === 'CLOSED').reverse();
  const openTrades = filteredTrades.filter(t => t.status === 'OPEN').reverse();

  // Calculate Totals
  const openPnL = openTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
  const closedPnL = closedTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);

  const downloadPDF = () => {
    const doc = new jsPDF();
    
    // Add Title
    doc.setFontSize(18);
    doc.text('Nebulamarket Trade History', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Account Type: ${accountType}`, 14, 30);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 36);
    doc.text(`Total Realized PnL: $${closedPnL.toFixed(2)}`, 14, 42);

    // Prepare table data
    const tableData = closedTrades.map(trade => [
      new Date(trade.closeTime || 0).toLocaleString(),
      trade.symbol,
      trade.type,
      trade.lotSize.toString(),
      trade.entryPrice.toFixed(2),
      trade.closePrice?.toFixed(2) || '-',
      `${(trade.pnl || 0) >= 0 ? '+' : ''}${(trade.pnl || 0).toFixed(2)}`
    ]);

    // Add Table
    autoTable(doc, {
      startY: 50,
      head: [['Close Time', 'Symbol', 'Side', 'Lots', 'Entry', 'Exit', 'PnL (USD)']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [30, 34, 45], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    // Save PDF
    doc.save(`Nebulamarket_Trade_History_${accountType}_${new Date().getTime()}.pdf`);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-4 md:p-6 animate-fade-in space-y-6 md:space-y-8 overflow-hidden">
      
      {/* Header & Summary */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 shrink-0">
           <div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight mb-1">Portfolio Ledger</h1>
              <p className="text-slate-500 text-[10px] md:text-xs font-mono uppercase tracking-widest">Unified Market Execution Records</p>
           </div>
           
           <div className="glass-panel px-5 py-3 rounded-lg flex items-center gap-6 border-white/10 overflow-x-auto no-scrollbar">
               <div className="flex flex-col items-end min-w-max">
                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-1">Realized Profits</span>
                  <span className={`text-lg font-mono font-bold leading-none ${closedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ${closedPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
               </div>
               <div className="w-px h-8 bg-white/10"></div>
               <div className="flex flex-col items-end min-w-max">
                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-1">Unrealized PnL</span>
                  <span className={`text-lg font-mono font-bold leading-none ${openPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ${openPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
               </div>
           </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-1">
          {/* Open Positions Table */}
          <div className="glass-panel rounded-lg overflow-hidden shrink-0">
              <div className="px-4 py-3 border-b border-white/5 bg-black/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                      <TrendingUp size={16} className="text-blue-400" />
                      <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest">Open Positions</h3>
                  </div>
                  <div className={`font-mono text-xs font-bold px-2 py-0.5 rounded bg-white/5 border border-white/5 shadow-inner ${openPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {openPnL >= 0 ? '+' : ''}{openPnL.toFixed(2)}
                  </div>
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono min-w-[800px]">
                      <thead className="text-slate-500 bg-white/5">
                          <tr>
                              <th className="p-3 font-medium uppercase tracking-wider">Timestamp</th>
                              <th className="p-3 font-medium uppercase tracking-wider sticky left-0 bg-[#161618] z-20">Symbol</th>
                              <th className="p-3 font-medium uppercase tracking-wider">Side</th>
                              <th className="p-3 font-medium uppercase tracking-wider text-right">Lots</th>
                              <th className="p-3 font-medium uppercase tracking-wider text-right">Entry</th>
                              <th className="p-3 font-medium uppercase tracking-wider text-right">Current</th>
                              <th className="p-3 font-medium uppercase tracking-wider text-right">S/L</th>
                              <th className="p-3 font-medium uppercase tracking-wider text-right">T/P</th>
                              <th className="p-3 font-medium uppercase tracking-wider text-right">PnL (USD)</th>
                              <th className="p-3 font-medium uppercase tracking-wider text-right sticky right-0 bg-[#161618] z-20">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                          {openTrades.length === 0 ? (
                              <tr><td colSpan={10} className="p-12 text-center text-slate-600"><div className="flex flex-col items-center gap-2 uppercase tracking-[0.3em] font-black"><AlertCircle className="opacity-20" size={32}/> <span>No Open Exposure</span></div></td></tr>
                          ) : (
                              openTrades.map(trade => (
                                  <PortfolioTradeRow 
                                    key={trade.id} 
                                    trade={trade} 
                                    currentPrice={prices[trade.symbol] || trade.entryPrice}
                                    onClose={() => onCloseTrade(trade.id)}
                                    onUpdate={onUpdateTrade}
                                  />
                              ))
                          )}
                      </tbody>
                  </table>
              </div>
          </div>

          {/* History Table */}
          <div className="glass-panel rounded-lg overflow-hidden shrink-0">
              <div className="px-4 py-3 border-b border-white/5 bg-black/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                      <History size={16} className="text-purple-400" />
                      <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest">Trade History</h3>
                  </div>
                  {closedTrades.length > 0 && (
                    <button 
                      onClick={downloadPDF}
                      className="flex items-center gap-2 bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white px-3 py-1.5 rounded text-[10px] uppercase font-bold tracking-wider transition-all border border-purple-500/20"
                    >
                      <Download size={14} />
                      Download PDF
                    </button>
                  )}
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono min-w-[700px]">
                      <thead className="text-slate-500 bg-white/5">
                          <tr>
                              <th className="p-3 font-medium uppercase tracking-wider">Close Time</th>
                              <th className="p-3 font-medium uppercase tracking-wider sticky left-0 bg-[#161618] z-20">Symbol</th>
                              <th className="p-3 font-medium uppercase tracking-wider">Side</th>
                              <th className="p-3 font-medium uppercase tracking-wider text-right">Lots</th>
                              <th className="p-3 font-medium uppercase tracking-wider text-right">Entry</th>
                              <th className="p-3 font-medium uppercase tracking-wider text-right">Exit</th>
                              <th className="p-3 font-medium uppercase tracking-wider text-right">PnL (USD)</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                          {closedTrades.length === 0 ? (
                              <tr><td colSpan={7} className="p-12 text-center text-slate-600 uppercase tracking-[0.3em] font-black">History Blank</td></tr>
                          ) : (
                              closedTrades.map(trade => (
                                  <tr key={trade.id} className="hover:bg-white/5 transition-colors">
                                      <td className="p-3 text-slate-400 whitespace-nowrap">{new Date(trade.closeTime || 0).toLocaleString()}</td>
                                      <td className="p-3 font-bold text-white sticky left-0 bg-[#0b0c10] z-10">{trade.symbol}</td>
                                      <td className={`p-3 font-bold ${trade.type === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>{trade.type}</td>
                                      <td className="p-3 text-right text-slate-300">{trade.lotSize}</td>
                                      <td className="p-3 text-right text-slate-300">{trade.entryPrice.toFixed(2)}</td>
                                      <td className="p-3 text-right text-slate-300">{trade.closePrice?.toFixed(2)}</td>
                                      <td className={`p-3 text-right font-bold ${(trade.pnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                          {trade.pnl && trade.pnl >= 0 ? '+' : ''}{(trade.pnl || 0).toFixed(2)}
                                      </td>
                                  </tr>
                              ))
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>
    </div>
  );
};

export default PortfolioView;
