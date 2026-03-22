
import React, { useEffect, useRef } from 'react';
import { Terminal, Circle } from 'lucide-react';

interface LogEntry {
  id: number;
  time: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

interface BotActivityLogProps {
  logs: LogEntry[];
}

const BotActivityLog: React.FC<BotActivityLogProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getColor = (type: string) => {
    switch(type) {
      case 'success': return 'text-emerald-400';
      case 'error': return 'text-rose-400';
      case 'warning': return 'text-amber-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="rounded-sm flex flex-col h-full overflow-hidden bg-black/40">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-black/60 shrink-0">
        <div className="flex items-center gap-2">
           <Terminal size={12} className="text-blue-400/80" />
           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">System Kernel</span>
        </div>
        <div className="flex gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500/20 border border-blue-500/40 animate-pulse"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-slate-800 border border-slate-600"></div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 font-mono text-[10px] custom-scrollbar bg-black/80 relative">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNCIgaGVpZ2h0PSI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0wIDBoNHYxSDB6IiBmaWxsPSJyZ2JhKDI1NSwgMjU1LDI1NSwgMC4wMikiLz48L3N2Zz4=')] opacity-50"></div>
        
        {logs.length === 0 && <div className="text-slate-600 italic pl-2 border-l border-slate-700">System initialized. Awaiting market synchronization...</div>}
        
        <div className="space-y-1 relative z-10">
            {logs.map((log) => (
            <div key={log.id} className="flex gap-3 hover:bg-white/5 p-1 rounded transition-colors group">
                <span className="text-slate-600 min-w-[55px] opacity-60 group-hover:opacity-100 transition-opacity">{log.time}</span>
                <span className={`flex-1 break-words ${getColor(log.type)}`}>
                  <span className="opacity-30 mr-2 text-slate-500">&gt;&gt;</span>{log.message}
                </span>
            </div>
            ))}
        </div>
        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  );
};

export default BotActivityLog;
