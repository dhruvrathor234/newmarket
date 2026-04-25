
import React, { useState, useEffect } from 'react';
import { CalendarClock, RefreshCcw, AlertTriangle } from 'lucide-react';
import { EconomicEvent } from '../types';
import { fetchEconomicEvents } from '../services/geminiService';

const CustomEconomicCalendar: React.FC = () => {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchEconomicEvents();
      setEvents(data);
    } catch (e: any) {
      console.error(e);
      let msg = e.message || "Failed to sync with neural core.";
      if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
        msg = "AI Quota Exceeded. The neural core is cooling down, please try again in a few minutes.";
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  return (
    <div className="glass-panel rounded-3xl shadow-2xl h-full flex flex-col overflow-hidden bg-zinc-950/40 border-white/5">
      <div className="px-6 py-5 border-b border-white/5 bg-black/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarClock size={18} className="text-zinc-500" />
          <h3 className="text-xs font-black text-white uppercase tracking-[0.4em]">Economic Calendar</h3>
        </div>
        <div className="flex items-center gap-4">
          {isLoading && <span className="text-[9px] text-zinc-500 font-mono animate-pulse uppercase tracking-widest">Neural Link Syncing...</span>}
          <button 
            onClick={loadEvents}
            disabled={isLoading}
            className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-full transition-all disabled:opacity-30"
          >
            <RefreshCcw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {error ? (
          <div className="h-full flex flex-col items-center justify-center p-10 text-center gap-4">
            <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/20">
              <AlertTriangle size={32} className="text-rose-500" />
            </div>
            <div className="space-y-2">
              <h4 className="text-[11px] font-black text-white uppercase tracking-widest">Neural Sync Interrupted</h4>
              <p className="text-[10px] text-zinc-500 font-medium leading-relaxed max-w-[250px]">{error}</p>
            </div>
            <button 
              onClick={loadEvents}
              className="mt-2 px-6 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-zinc-200 transition-all active:scale-95"
            >
              Retry Sync
            </button>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-zinc-900/90 backdrop-blur-md z-10">
            <tr className="text-[9px] uppercase font-bold text-zinc-500 tracking-[0.2em] border-b border-white/5">
              <th className="px-6 py-4">Time</th>
              <th className="px-4 py-4">Cur</th>
              <th className="px-4 py-4">Event</th>
              <th className="px-4 py-4">Impact</th>
              <th className="px-4 py-4 text-right">Forecast</th>
              <th className="px-6 py-4 text-right">Prev</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {events.length === 0 && !isLoading ? (
              <tr>
                <td colSpan={6} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3 opacity-30">
                    <AlertTriangle size={32} strokeWidth={1} />
                    <span className="text-[10px] uppercase tracking-widest font-bold">No Events Found for Current Week</span>
                  </div>
                </td>
              </tr>
            ) : (
              events.map((ev, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-5 text-[10px] font-mono text-zinc-400 group-hover:text-white">{ev.time}</td>
                  <td className="px-4 py-5 text-[10px] font-black text-white tracking-widest">{ev.currency}</td>
                  <td className="px-4 py-5 text-[11px] font-medium text-zinc-300 leading-tight max-w-[200px]">{ev.event}</td>
                  <td className="px-4 py-5">
                    <span className={`text-[8px] font-black px-2.5 py-1 rounded-[4px] tracking-[0.15em] transition-all shadow-sm ${
                      ev.impact === 'HIGH' ? 'bg-rose-600 text-white shadow-rose-900/40' : 
                      ev.impact === 'MEDIUM' ? 'bg-zinc-800 text-zinc-400' : 
                      'bg-zinc-900/50 text-zinc-600 border border-white/5'
                    }`}>
                      {ev.impact}
                    </span>
                  </td>
                  <td className="px-4 py-5 text-[10px] font-mono text-right text-zinc-400">{ev.forecast}</td>
                  <td className="px-6 py-5 text-[10px] font-mono text-right text-zinc-500">{ev.previous}</td>
                </tr>
              ))
            )}
          </tbody>
          </table>
        )}
      </div>
      
      <div className="px-6 py-3 border-t border-white/5 bg-black/40 flex justify-between items-center">
          <span className="text-[8px] font-mono text-zinc-700 uppercase tracking-widest">Source: Gemini Structural Output Engine</span>
          <span className="text-[8px] font-mono text-zinc-700 uppercase tracking-widest">Speed: Real-Time Grounding</span>
      </div>
    </div>
  );
};

export default CustomEconomicCalendar;
