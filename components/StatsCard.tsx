
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  subtext?: string;
  highlight?: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon: Icon, trend, subtext, highlight }) => {
  const getTrendColor = () => {
    if (trend === 'up') return 'text-emerald-400';
    if (trend === 'down') return 'text-rose-400';
    return 'text-slate-400';
  };

  return (
    <div className={`glass-card p-6 rounded-2xl relative overflow-hidden group transition-all duration-500 ${highlight ? 'border-blue-500/30' : 'border-white/5'}`}>
      {highlight && <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-[60px] rounded-full -mr-16 -mt-16 pointer-events-none"></div>}
      
      <div className="flex justify-between items-center mb-4 z-10 relative">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{title}</span>
        <div className={`p-2 rounded-lg ${highlight ? 'bg-blue-600/10 text-blue-400' : 'bg-white/5 text-slate-400'} group-hover:scale-110 transition-transform duration-300`}>
           <Icon size={16} />
        </div>
      </div>
      
      <div className="z-10 relative">
        <div className={`text-3xl font-bold tracking-tight ${highlight ? 'text-white' : 'text-slate-100'}`}>
          {value}
        </div>
        {(subtext || trend) && (
          <div className="flex items-center gap-2 mt-3">
             {trend === 'up' && <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-emerald-500"></div>}
             {trend === 'down' && <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-rose-500"></div>}
             <div className={`text-[11px] font-mono tracking-wide ${getTrendColor()}`}>{subtext || (trend === 'up' ? '+2.4%' : trend === 'down' ? '-1.8%' : '')}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsCard;
