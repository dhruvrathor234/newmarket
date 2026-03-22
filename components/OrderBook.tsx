
import React, { useState, useEffect, useMemo } from 'react';
import { Symbol } from '../types';
import { ASSETS } from '../constants';

interface OrderBookProps {
  symbol: Symbol;
  currentPrice: number;
}

interface OrderBookLevel {
  price: number;
  amount: number;
  total: number;
}

const OrderBook: React.FC<OrderBookProps> = ({ symbol, currentPrice }) => {
  const [depth, setDepth] = useState<{ bids: OrderBookLevel[], asks: OrderBookLevel[] }>({ bids: [], asks: [] });

  // Generate simulated order book levels around current price
  useEffect(() => {
    if (!currentPrice) return;

    const generateLevels = () => {
      const bidLevels: OrderBookLevel[] = [];
      const askLevels: OrderBookLevel[] = [];
      const spread = ASSETS[symbol].SPREAD;
      const step = spread * 0.5;
      
      let bidTotal = 0;
      let askTotal = 0;

      for (let i = 0; i < 12; i++) {
        // Asks (Sell Orders - Red)
        const askPrice = currentPrice + (spread / 2) + (i * step);
        const askAmount = Math.random() * 2 + 0.1;
        askTotal += askAmount;
        askLevels.push({ price: askPrice, amount: askAmount, total: askTotal });

        // Bids (Buy Orders - Green)
        const bidPrice = currentPrice - (spread / 2) - (i * step);
        const bidAmount = Math.random() * 2 + 0.1;
        bidTotal += bidAmount;
        bidLevels.push({ price: bidPrice, amount: bidAmount, total: bidTotal });
      }

      // Sort asks descending for top-to-bottom visual
      setDepth({ 
        bids: bidLevels, 
        asks: askLevels.reverse() 
      });
    };

    generateLevels();
    const interval = setInterval(generateLevels, 1000);
    return () => clearInterval(interval);
  }, [symbol, currentPrice]);

  const maxTotal = useMemo(() => {
    const bMax = depth.bids.length > 0 ? depth.bids[depth.bids.length - 1].total : 0;
    const aMax = depth.asks.length > 0 ? depth.asks[0].total : 0;
    return Math.max(bMax, aMax);
  }, [depth]);

  return (
    <div className="bg-black/20 border-t border-white/5 flex flex-col font-mono text-[10px] select-none h-[400px]">
      <div className="px-4 py-2 bg-black/40 border-b border-white/5 flex justify-between items-center shrink-0">
         <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Live Order Book</span>
         <span className="text-[8px] text-blue-500/60 font-bold uppercase tracking-tighter">Real-Time Depth</span>
      </div>

      <div className="grid grid-cols-3 px-4 py-1.5 text-slate-600 border-b border-white/5 uppercase tracking-tighter text-[8px] font-black">
        <span>Price</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Total</span>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* ASKS (SELLS) */}
        <div className="flex-1 overflow-hidden flex flex-col justify-end">
          {depth.asks.map((level, i) => (
            <div key={`ask-${i}`} className="relative group hover:bg-rose-500/5 px-4 py-0.5 grid grid-cols-3 items-center">
              <div 
                className="absolute inset-y-0 right-0 bg-rose-500/10 pointer-events-none transition-all duration-500" 
                style={{ width: `${(level.total / maxTotal) * 100}%` }}
              ></div>
              <span className="text-rose-500 font-bold relative z-10">{level.price.toFixed(2)}</span>
              <span className="text-right text-slate-400 relative z-10">{level.amount.toFixed(3)}</span>
              <span className="text-right text-slate-500 relative z-10">{level.total.toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* SPREAD INDICATOR */}
        <div className="py-2 px-4 bg-white/5 border-y border-white/5 flex justify-between items-center shrink-0">
           <span className="text-white font-bold text-xs">{currentPrice.toFixed(2)}</span>
           <span className="text-slate-600 text-[9px] uppercase font-bold">Spread: {ASSETS[symbol].SPREAD.toFixed(2)}</span>
        </div>

        {/* BIDS (BUYS) */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {depth.bids.map((level, i) => (
            <div key={`bid-${i}`} className="relative group hover:bg-emerald-500/5 px-4 py-0.5 grid grid-cols-3 items-center">
              <div 
                className="absolute inset-y-0 right-0 bg-emerald-500/10 pointer-events-none transition-all duration-500" 
                style={{ width: `${(level.total / maxTotal) * 100}%` }}
              ></div>
              <span className="text-emerald-500 font-bold relative z-10">{level.price.toFixed(2)}</span>
              <span className="text-right text-slate-400 relative z-10">{level.amount.toFixed(3)}</span>
              <span className="text-right text-slate-500 relative z-10">{level.total.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrderBook;
