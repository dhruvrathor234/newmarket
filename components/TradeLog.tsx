import React from 'react';
import { Trade, TradeType } from '../types';
import { History, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface TradeLogProps {
  trades: Trade[];
}

const TradeLog: React.FC<TradeLogProps> = ({ trades }) => {
  const closedTrades = trades.filter(t => t.status === 'CLOSED').reverse();
  const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

  return (
    <div className="glass-panel rounded-sm flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-white/5 flex justify-between items-center bg-black/20">
        <div className="flex items-center gap-2">
            <History size={12} className="text-purple-400" />
            <h2 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Execution History</h2>
        </div>
        <span className={`font-mono text-[10px] ${totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            Σ {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)}
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/20">
        {closedTrades.map((trade) => {
            const isProfit = (trade.pnl || 0) >= 0;
            return (
                <div key={trade.id} className="flex items-center justify-between p-2 px-3 border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                    <div className="flex items-center gap-3">
                        <div className={`p-1 rounded-sm ${isProfit ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'} opacity-70`}>
                            {isProfit ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-300 font-mono">{trade.symbol}</span>
                                <span className={`text-[9px] font-bold uppercase tracking-wider ${trade.type === TradeType.BUY ? 'text-emerald-400' : 'text-rose-400'}`}>{trade.type}</span>
                            </div>
                            <div className="text-[9px] text-slate-600 font-mono">
                                {new Date(trade.closeTime || 0).toLocaleTimeString()}
                            </div>
                        </div>
                    </div>
                    
                    <div className="text-right">
                        <div className={`text-[10px] font-mono font-medium ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isProfit ? '+' : ''}{trade.pnl?.toFixed(2)}
                        </div>
                        <div className="text-[9px] text-slate-700 font-mono">
                           {trade.lotSize.toFixed(2)} Lot
                        </div>
                    </div>
                </div>
            )
        })}
        {closedTrades.length === 0 && (
             <div className="text-center py-8 text-[10px] uppercase text-slate-600 tracking-wider">No executed trades</div>
        )}
      </div>
    </div>
  );
};

export default TradeLog;