
import React, { useEffect, useRef, memo } from 'react';
import { CalendarClock } from 'lucide-react';

const EconomicCalendarWidget: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      const script = document.createElement('script');
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-events.js";
      script.type = "text/javascript";
      script.async = true;
      script.innerHTML = JSON.stringify({
        "colorTheme": "dark",
        "isTransparent": true,
        "width": "100%",
        "height": "100%",
        "locale": "en",
        "importanceFilter": "0,1",
        "currencyFilter": "USD,EUR,GBP,JPY",
        "hide_top_toolbar": true
      });
      containerRef.current.appendChild(script);
    }
  }, []);

  return (
    <div className="glass-panel rounded-3xl shadow-2xl h-full flex flex-col overflow-hidden bg-zinc-950/40 border-white/5">
       <div className="px-6 py-4 border-b border-white/5 bg-black/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarClock size={16} className="text-zinc-500" />
            <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Economic Calendar</h3>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/5">
              <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]"></div>
              <span className="text-[8px] font-bold text-white uppercase tracking-widest">Global Feed</span>
          </div>
       </div>
       <div className="flex-1 w-full bg-transparent p-2" ref={containerRef}>
          {/* Widget Container */}
       </div>
    </div>
  );
};

export default memo(EconomicCalendarWidget);
