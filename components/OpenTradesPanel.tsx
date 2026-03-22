
import React, { useState } from 'react';
import { Trade, Symbol, AccountType } from '../types';
import { X, Pencil, History, TrendingUp, Clock, Check, MoreHorizontal, Terminal as TerminalIcon } from 'lucide-react';
import BotActivityLog from './BotActivityLog';

interface OpenTradesPanelProps {
  trades: Trade[];
  prices: Record<Symbol, number>;
  onCloseTrade: (tradeId: string) => void;
  onUpdateTrade: (tradeId: string, newSL: number, newTP: number) => void;
  logs?: any[];
  renderFooter?: () => React.ReactNode;
  accountType: AccountType;
}

const OpenTradesPanel: React.FC<OpenTradesPanelProps> = ({ trades, prices, onCloseTrade, onUpdateTrade, logs = [], renderFooter, accountType }) => {
  const [activeTab, setActiveTab] = useState<'OPEN' | 'PENDING' | 'CLOSED'>('OPEN');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSL, setEditSL] = useState('');
  const [editTP, setEditTP] = useState('');

  const filtered = trades.filter(t => {
      if (t.accountType !== accountType) return false;
      if (activeTab === 'OPEN') return t.status === 'OPEN';
      if (activeTab === 'PENDING') return t.status === 'PENDING';
      return t.status === 'CLOSED';
  }).reverse();

  const startEdit = (t: Trade) => {
    setEditingId(t.id);
    setEditSL(t.stopLoss.toString());
    setEditTP(t.takeProfit?.toString() || '');
  };

  const saveEdit = (id: string) => {
    onUpdateTrade(id, parseFloat(editSL), parseFloat(editTP));
    setEditingId(null);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#121418] h-full overflow-hidden">
      {/* Tab Navigation */}
      <div className="flex px-2 sm:px-4 border-b border-white/5 bg-black/20 shrink-0 overflow-x-auto no-scrollbar">
        {[
            { id: 'OPEN', label: 'Positions', icon: TrendingUp, count: trades.filter(t => t.status === 'OPEN' && t.accountType === accountType).length },
            { id: 'PENDING', label: 'Pending', icon: Clock, count: trades.filter(t => t.status === 'PENDING' && t.accountType === accountType).length },
            { id: 'CLOSED', label: 'History', icon: History, count: 0 }
        ].map(tab => (
            <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)} 
                className={`flex items-center gap-2 px-4 sm:px-6 py-3 text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap relative ${activeTab === tab.id ? 'border-blue-500 text-white' : 'border-transparent text-slate-600 hover:text-slate-400'}`}
            >
                <tab.icon size={12} />
                <span className="hidden xs:inline">{tab.label}</span>
                {tab.count > 0 && <span className="ml-1 bg-blue-600 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black">{tab.count}</span>}
            </button>
        ))}
        <div className="ml-auto hidden sm:flex items-center gap-4 text-slate-600 px-4">
            <MoreHorizontal size={14} className="cursor-pointer hover:text-white" />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto custom-scrollbar bg-black/10">
                <table className="w-full text-left text-[11px] font-mono border-separate border-spacing-0 min-w-[600px]">
                    <thead className="bg-black/60 text-slate-600 uppercase tracking-widest text-[9px] sticky top-0 z-20">
                        <tr>
                            <th className="px-4 py-3 font-black">Instrument</th>
                            <th className="px-4 py-3 font-black">Type</th>
                            <th className="px-4 py-3 text-right font-black">Volume</th>
                            <th className="px-4 py-3 text-right font-black">Entry</th>
                            <th className="px-4 py-3 text-right font-black">Current</th>
                            <th className="px-4 py-3 text-right font-black">T/P</th>
                            <th className="px-4 py-3 text-right font-black">S/L</th>
                            <th className="px-4 py-3 text-right font-black">P/L (USD)</th>
                            <th className="px-4 py-3 text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.02]">
                        {filtered.map(t => {
                            const price = prices[t.symbol] || t.entryPrice;
                            const isEditing = editingId === t.id;
                            return (
                                <tr key={t.id} className="hover:bg-white/[0.01] group transition-colors">
                                    <td className="px-4 py-2 font-bold text-slate-300 uppercase tracking-tighter">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${t.type.includes('BUY') ? 'bg-blue-500' : 'bg-rose-500'}`}></div>
                                            {t.symbol}
                                        </div>
                                    </td>
                                    <td className={`px-4 py-2 font-bold text-[10px] uppercase ${t.type.includes('BUY') ? 'text-blue-500' : 'text-rose-500'}`}>
                                        {t.type}
                                    </td>
                                    <td className="px-4 py-2 text-right text-slate-400">
                                        <span className="border-b border-dotted border-slate-600 cursor-help">{t.lotSize.toFixed(2)}</span>
                                    </td>
                                    <td className="px-4 py-2 text-right text-slate-500">{t.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td className="px-4 py-2 text-right font-bold text-white">{price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td className="px-4 py-2 text-right">
                                        {isEditing ? <input value={editTP} onChange={e => setEditTP(e.target.value)} className="w-16 bg-black border border-white/10 rounded px-1 text-emerald-500 outline-none" /> : <span className="text-emerald-500/60">{t.takeProfit?.toFixed(2) || '-'}</span>}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        {isEditing ? <input value={editSL} onChange={e => setEditSL(e.target.value)} className="w-16 bg-black border border-white/10 rounded px-1 text-rose-500 outline-none" /> : <span className="text-rose-500/60">{t.stopLoss.toFixed(2)}</span>}
                                    </td>
                                    <td className={`px-4 py-2 text-right font-bold text-xs ${(t.pnl || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {(t.pnl || 0) >= 0 ? '+' : ''}{(t.pnl || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                            {activeTab === 'OPEN' && (
                                                <>
                                                    {isEditing ? (
                                                        <button onClick={() => saveEdit(t.id)} className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/20"><Check size={12}/></button>
                                                    ) : (
                                                        <button onClick={() => startEdit(t)} className="p-1.5 bg-blue-500/10 text-blue-500 rounded border border-blue-500/20"><Pencil size={12}/></button>
                                                    )}
                                                    <button onClick={() => onCloseTrade(t.id)} className="p-1.5 bg-rose-500/10 text-rose-500 rounded border border-rose-500/20"><X size={12}/></button>
                                                </>
                                            )}
                                            {activeTab === 'PENDING' && (
                                                <button onClick={() => onCloseTrade(t.id)} className="p-1.5 bg-rose-500/10 text-rose-500 rounded border border-rose-500/20"><X size={12}/></button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={9} className="p-16 text-center text-[10px] text-slate-700 uppercase font-black tracking-[0.4em]">
                                    System Standby • No {activeTab} Records
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
      </div>
      
      {/* RENDER FOOTER (MARKET BAR) */}
      {renderFooter && renderFooter()}
    </div>
  );
};

export default OpenTradesPanel;
