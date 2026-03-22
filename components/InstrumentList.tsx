
import React, { useState, useRef } from 'react';
import { Symbol, MarketDetails, AccountType, TradingMode } from '../types';
import { ASSETS } from '../constants';
import { Star, Search, ChevronDown, Check, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

interface InstrumentListProps {
  activeSymbol: Symbol;
  onSelect: (s: Symbol) => void;
  marketDetails: Record<Symbol, MarketDetails>;
  variant?: 'vertical' | 'horizontal';
  accountType: AccountType;
  tradingMode: TradingMode;
}

const CATEGORIES: { id: string, label: string }[] = [
    { id: 'MOST_TRADED', label: 'Most Traded' },
    { id: 'FAVORITES', label: 'Favorites' },
    { id: 'CRYPTO', label: 'Crypto Pairs' },
    { id: 'FOREX', label: 'Forex Majors' },
    { id: 'COMMODITIES', label: 'Commodities' },
];

const InstrumentList: React.FC<InstrumentListProps> = ({ activeSymbol, onSelect, marketDetails, variant = 'vertical', accountType, tradingMode }) => {
    const [activeCat, setActiveCat] = useState('MOST_TRADED');
    const [search, setSearch] = useState('');
    const [showMenu, setShowMenu] = useState(false);
    const [favorites, setFavorites] = useState<Set<string>>(new Set(['XAUUSD', 'BTCUSD']));
    const [visibleCount, setVisibleCount] = useState(6);
    
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const categories = accountType === AccountType.REAL ? [
        { id: 'MOST_TRADED', label: `Binance ${tradingMode}` },
        { id: 'FAVORITES', label: 'Favorites' },
    ] : CATEGORIES;

    const toggleFavorite = (e: React.MouseEvent, sym: string) => {
        e.stopPropagation();
        const next = new Set(favorites);
        if (next.has(sym)) next.delete(sym);
        else next.add(sym);
        setFavorites(next);
    };

    const symbols = (Object.keys(ASSETS) as Symbol[]).filter(sym => {
        const asset = ASSETS[sym];
        
        // Filter by account type
        if (accountType === AccountType.REAL) {
            // Only show crypto for Binance
            if (asset.CATEGORY !== 'CRYPTO') return false;
            // Filter by trading mode
            if (asset.MODES && !asset.MODES.includes(tradingMode)) return false;
        }

        const matchesSearch = sym.toLowerCase().includes(search.toLowerCase());
        if (!matchesSearch) return false;
        if (activeCat === 'FAVORITES') return favorites.has(sym);
        if (activeCat === 'MOST_TRADED') return true;
        return asset.CATEGORY === activeCat;
    });

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const { scrollLeft, clientWidth } = scrollContainerRef.current;
            const scrollTo = direction === 'left' ? scrollLeft - clientWidth / 2 : scrollLeft + clientWidth / 2;
            scrollContainerRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };

    const handleLoadMore = () => {
        setVisibleCount(prev => prev + 4);
    };

    if (variant === 'horizontal') {
        const visibleSymbols = symbols.slice(0, visibleCount);
        const hasMore = symbols.length > visibleCount;

        return (
            <div className="h-full w-full flex items-center px-4 gap-4 bg-black/40 border-t border-white/5 relative group/bar">
                {/* Left Edge Indicator / Nav */}
                <div className="flex-shrink-0 flex items-center gap-2 border-r border-white/5 pr-4 mr-1">
                    <TrendingUp size={14} className="text-blue-500" />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] whitespace-nowrap">Market Bar</span>
                </div>

                {/* Scroll Left Button */}
                <button 
                    onClick={() => scroll('left')}
                    className="absolute left-[130px] z-20 p-1.5 bg-black/80 border border-white/10 rounded-full text-slate-400 hover:text-white hover:bg-blue-600 transition-all opacity-0 group-hover/bar:opacity-100 hidden md:block shadow-lg"
                >
                    <ChevronLeft size={14} />
                </button>
                
                {/* Main Scroll Container */}
                <div 
                    ref={scrollContainerRef}
                    className="flex items-center gap-3 overflow-x-auto no-scrollbar flex-1 scroll-smooth py-2"
                >
                    {visibleSymbols.map(sym => {
                        const details = marketDetails[sym];
                        const isActive = activeSymbol === sym;
                        const isUp = details?.change24hPercent >= 0;
                        
                        return (
                            <div 
                                key={sym}
                                onClick={() => onSelect(sym)}
                                className={`flex-shrink-0 min-w-[150px] px-4 py-2.5 rounded-lg border transition-all cursor-pointer flex flex-col justify-center relative overflow-hidden group/card ${
                                    isActive 
                                    ? 'bg-blue-600/10 border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                                    : 'bg-white/[0.03] border-white/5 hover:border-white/20 hover:bg-white/[0.05]'
                                }`}
                            >
                                {isActive && <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>}
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`text-[10px] font-black tracking-widest uppercase ${isActive ? 'text-blue-400' : 'text-slate-300'}`}>{sym}</span>
                                    <div className={`p-1 rounded-sm ${isUp ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                                        {isUp ? <TrendingUp size={10} className="text-emerald-500" /> : <TrendingDown size={10} className="text-rose-500" />}
                                    </div>
                                </div>
                                <div className="flex justify-between items-baseline gap-2">
                                    <span className="text-[12px] font-mono font-bold text-white tracking-tight">
                                        {details?.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                    <span className={`text-[9px] font-mono font-bold ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {isUp ? '+' : ''}{details?.change24hPercent.toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                        );
                    })}

                    {hasMore && (
                        <button 
                            onClick={handleLoadMore}
                            className="flex-shrink-0 flex flex-col items-center justify-center min-w-[80px] h-[58px] bg-white/5 border border-dashed border-white/10 rounded-lg hover:border-blue-500/40 hover:bg-blue-500/5 transition-all group/more"
                        >
                            <Plus size={14} className="text-slate-500 group-hover/more:text-blue-400 mb-1" />
                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest group-hover/more:text-blue-400">More</span>
                        </button>
                    )}
                </div>

                {/* Scroll Right Button */}
                <button 
                    onClick={() => scroll('right')}
                    className="absolute right-[100px] z-20 p-1.5 bg-black/80 border border-white/10 rounded-full text-slate-400 hover:text-white hover:bg-blue-600 transition-all opacity-0 group-hover/bar:opacity-100 hidden md:block shadow-lg"
                >
                    <ChevronRight size={14} />
                </button>

                {/* View All / Category Selector Toggle */}
                <div className="flex-shrink-0 pl-4 border-l border-white/5 h-full flex items-center">
                    <button 
                        onClick={() => setShowMenu(!showMenu)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest border border-blue-500/20"
                    >
                        <span>{categories.find(c => c.id === activeCat)?.label || categories[0].label}</span>
                        <ChevronDown size={10} className={showMenu ? 'rotate-180' : ''} />
                    </button>
                    
                    {showMenu && (
                        <div className="absolute bottom-full right-4 mb-2 w-48 bg-[#1e222d] border border-white/10 rounded-lg shadow-2xl z-[100] py-2">
                            {categories.map(cat => (
                                <button 
                                    key={cat.id} 
                                    onClick={() => { setActiveCat(cat.id); setShowMenu(false); setVisibleCount(6); }}
                                    className={`w-full px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest flex items-center justify-between hover:bg-white/5 ${activeCat === cat.id ? 'text-blue-400' : 'text-slate-400'}`}
                                >
                                    {cat.label}
                                    {activeCat === cat.id && <Check size={10} />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Default Vertical Layout
    return (
        <div className="flex flex-col h-full bg-[#121418]">
            <div className="p-3 shrink-0">
                <div className="relative group">
                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" />
                    <input 
                      type="text" placeholder="Find instrument..." value={search} onChange={e => setSearch(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded-md py-2 pl-9 pr-4 text-[11px] text-white focus:outline-none focus:border-blue-500/40 transition-all font-mono"
                    />
                </div>
            </div>

            <div className="px-3 pb-2 relative shrink-0">
                <button onClick={() => setShowMenu(!showMenu)} className="w-full flex items-center justify-between group py-2 border-b border-white/5 px-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{categories.find(c => c.id === activeCat)?.label || categories[0].label}</span>
                    <ChevronDown size={14} className={`text-slate-600 transition-transform ${showMenu ? 'rotate-180' : ''}`} />
                </button>
                {showMenu && (
                    <div className="absolute top-full left-3 right-3 mt-1 bg-[#1e222d] border border-white/10 rounded-md shadow-2xl z-[60] py-1">
                        {categories.map(cat => (
                            <button key={cat.id} onClick={() => { setActiveCat(cat.id); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-[10px] text-slate-400 hover:bg-white/5 flex items-center justify-between font-bold uppercase tracking-widest">
                                {cat.label}
                                {activeCat === cat.id && <Check size={10} className="text-blue-500" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar">
                <table className="w-full text-left border-separate border-spacing-0">
                    <tbody className="divide-y divide-white/[0.02]">
                        {symbols.map(sym => {
                            const details = marketDetails[sym];
                            const isActive = activeSymbol === sym;
                            return (
                                <tr key={sym} onClick={() => onSelect(sym)} className={`group cursor-pointer transition-all duration-200 ${isActive ? 'bg-blue-600/5 border-l-2 border-blue-500' : 'hover:bg-white/[0.02]'}`}>
                                    <td className="pl-3 pr-2 py-3">
                                        <div className="flex flex-col leading-tight">
                                            <span className={`text-[11px] font-bold tracking-tighter ${isActive ? 'text-blue-400' : 'text-slate-300'}`}>{sym}</span>
                                            <span className={`text-[9px] font-mono ${details?.change24hPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {details?.change24hPercent >= 0 ? '▲' : '▼'} {Math.abs(details?.change24hPercent || 0).toFixed(2)}%
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-2 py-3 text-right font-mono text-[10px] text-slate-400">{details?.bid.toFixed(2)}</td>
                                    <td className="px-2 py-3 text-right font-mono text-[10px] text-slate-400">{details?.ask.toFixed(2)}</td>
                                    <td className="pl-2 pr-3 py-3 text-right">
                                        <Star size={12} onClick={(e) => toggleFavorite(e, sym)} className={`transition-all ${favorites.has(sym) ? 'text-blue-500 fill-blue-500' : 'text-slate-800 opacity-0 group-hover:opacity-100'}`} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default InstrumentList;
