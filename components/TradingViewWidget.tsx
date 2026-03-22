
// Fixed: Added missing React import to support React.FC and JSX
import React, { useEffect, useRef, memo } from 'react';
import { Symbol, TradingMode } from '../types';

interface TradingViewWidgetProps {
  symbol: Symbol;
  tradingMode?: TradingMode;
}

const TradingViewWidget: React.FC<TradingViewWidgetProps> = ({ symbol, tradingMode = TradingMode.SPOT }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Map internal symbols to TradingView symbols
    const getTVSymbol = (s: Symbol, mode: TradingMode) => {
      const baseMap: Record<Symbol, string> = {
        XAUUSD: 'OANDA:XAUUSD',
        XAGUSD: 'OANDA:XAGUSD',
        WTIUSD: 'OANDA:WTICOUSD',
        BTCUSD: 'BTCUSDT',
        ETHUSD: 'ETHUSDT',
        SOLUSD: 'SOLUSDT',
        DOGEUSD: 'DOGEUSDT',
        XRPUSD: 'XRPUSDT',
        ADAUSD: 'ADAUSDT',
        AVAXUSD: 'AVAXUSDT',
        DOTUSD: 'DOTUSDT',
        LINKUSD: 'LINKUSDT',
        LTCUSD: 'LTCUSDT'
      };

      const base = baseMap[s] || 'BTCUSDT';
      
      // If it's not a crypto, return as is (Forex/Commodities only have one mode usually)
      if (['XAUUSD', 'XAGUSD', 'WTIUSD'].includes(s)) return base;

      // For Crypto on Binance
      if (mode === TradingMode.FUTURES) {
        return `BINANCE:${base}.P`; // Perpetual Futures
      }
      
      // Spot and Margin use the same Spot chart on Binance
      return `BINANCE:${base}`;
    };

    const tvSymbol = getTVSymbol(symbol, tradingMode);

    if (containerRef.current) {
      containerRef.current.innerHTML = ''; // Clear previous widget
      
      const script = document.createElement('script');
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
      script.type = "text/javascript";
      script.async = true;
      script.innerHTML = JSON.stringify({
        "autosize": true,
        "symbol": tvSymbol,
        "interval": "1",
        "timezone": "Etc/UTC", 
        "theme": "dark",
        "style": "1",
        "locale": "en",
        "enable_publishing": false,
        "hide_top_toolbar": false,
        "hide_legend": false,
        "save_image": false,
        "calendar": false,
        "hide_volume": true,
        "backgroundColor": "rgba(5, 5, 5, 1)", 
        "gridLineColor": "rgba(255, 255, 255, 0.05)",
        "support_host": "https://www.tradingview.com"
      });
      containerRef.current.appendChild(script);
    }
  }, [symbol]);

  return (
    <div className="h-full w-full overflow-hidden flex flex-col relative">
      <div className="h-full w-full" ref={containerRef}>
        <div className="flex items-center justify-center h-full text-slate-500 text-xs uppercase tracking-widest animate-pulse">
          Initializing Chart Feed...
        </div>
      </div>
    </div>
  );
};

export default memo(TradingViewWidget);
