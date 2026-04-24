
import React, { useState, useEffect } from 'react';
import { TradeType, Symbol, MarketDetails, RiskSettings, BotStrategy, NebulaV5Settings, AccountType, TradingMode } from '../types';
import { ASSETS } from '../constants';
import { Power, Bot, Zap, BrainCircuit, ChevronRight, Info, Settings, Target, ShieldCheck, Globe, UserCheck, Key, Shield } from 'lucide-react';
import NebulaV5SettingsModal from './NebulaV5SettingsModal';
import HedgingBotSettingsModal from './HedgingBotSettingsModal';
import HFTBotSettingsModal from './HFTBotSettingsModal';
import ConnectBinanceModal from './ConnectBinanceModal';
import { HedgingBotSettings, HFTBotSettings } from '../types';

interface OrderPanelProps {
    symbol: Symbol;
    marketDetails: MarketDetails;
    riskSettings: RiskSettings;
    balance: number;
    onManualTrade: (type: TradeType, lots: number, slDist: number, tpDist: number, limitPrice?: number) => void;
    isBotActive: boolean;
    onToggleBot: () => void;
    isAnalyzing: boolean;
    onAnalyze: () => void;
    activeStrategy: BotStrategy;
    onSetStrategy: (s: BotStrategy) => void;
    onRiskUpdate: (settings: RiskSettings) => void;
    nebulaV5Settings: NebulaV5Settings;
    onUpdateNebulaV5Settings: (s: NebulaV5Settings) => void;
    hedgingSettings: HedgingBotSettings;
    onUpdateHedgingSettings: (s: HedgingBotSettings) => void;
    hftSettings: HFTBotSettings;
    onUpdateHFTSettings: (s: HFTBotSettings) => void;
    accountType: AccountType;
    onSetAccountType: (type: AccountType) => void;
    tradingMode: TradingMode;
    onSetTradingMode: (mode: TradingMode) => void;
    isBinanceConnected: boolean;
    onConnectBinance: (apiKey: string, apiSecret: string) => void;
    onOpenDeposit: () => void;
    onOpenWithdraw: () => void;
    isLocked?: boolean;
}

const OrderPanel: React.FC<OrderPanelProps> = ({ 
    symbol, 
    marketDetails, 
    riskSettings, 
    balance, 
    onManualTrade,
    isBotActive,
    onToggleBot,
    isAnalyzing,
    onAnalyze,
    activeStrategy,
    onSetStrategy,
    onRiskUpdate,
    nebulaV5Settings,
    onUpdateNebulaV5Settings,
    hedgingSettings,
    onUpdateHedgingSettings,
    hftSettings,
    onUpdateHFTSettings,
    accountType,
    onSetAccountType,
    tradingMode,
    onSetTradingMode,
    isBinanceConnected,
    onConnectBinance,
    onOpenDeposit,
    onOpenWithdraw,
    isLocked
}) => {
    const [orderType, setOrderType] = useState<'MARKET' | 'PENDING'>('MARKET');
    const [lots, setLots] = useState(0.20);
    const [quantity, setQuantity] = useState<number>(0);
    const [quantityType, setQuantityType] = useState<'USD' | 'ASSET'>('USD');
    const [slippage, setSlippage] = useState<number>(0.1);
    const [isSlippageEnabled, setIsSlippageEnabled] = useState(false);
    const [limitPrice, setLimitPrice] = useState(0);
    const [useSL, setUseSL] = useState(true);
    const [useTP, setUseTP] = useState(false);
    const [slDist, setSlDist] = useState(10.0);
    const [tpDist, setTpDist] = useState(20.0);
    const [slPrice, setSlPrice] = useState<number>(0);
    const [tpPrice, setTpPrice] = useState<number>(0);
    const [isV5SettingsOpen, setIsV5SettingsOpen] = useState(false);
    const [isHedgingSettingsOpen, setIsHedgingSettingsOpen] = useState(false);
    const [isHFTSettingsOpen, setIsHFTSettingsOpen] = useState(false);
    const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
    const [leverage, setLeverage] = useState(20);

    const asset = ASSETS[symbol];
    const riskAmount = (balance * (riskSettings?.riskPercentage || 0)) / 100;
    const stopLossDist = riskSettings?.stopLossDistance || asset.DEFAULT_STOP_LOSS || 10;
    const contractSize = asset.CONTRACT_SIZE || 1;
    const autoLotSize = riskAmount / (stopLossDist * contractSize) || 0;

    const currentPrice = marketDetails?.price || 0;
    const maxQuantityUSD = balance * (tradingMode === TradingMode.FUTURES ? leverage : 1);
    const maxQuantityAsset = currentPrice > 0 ? maxQuantityUSD / currentPrice : 0;

    const qtyValue = quantity || 0;
    const estimatedCost = (quantityType === 'USD' ? qtyValue : qtyValue * currentPrice) / (tradingMode === TradingMode.FUTURES ? leverage : 1);
    const estimatedFee = estimatedCost * 0.001; // 0.1% fee estimation

    const formatNum = (val: number | undefined | null, dec = 2) => {
        if (val === undefined || val === null || isNaN(val) || !isFinite(val)) return '0'.repeat(1) + '.' + '0'.repeat(dec);
        return val.toFixed(dec);
    };

    useEffect(() => {
        setLimitPrice(currentPrice);
        setSlDist(asset.DEFAULT_STOP_LOSS);
        setTpDist(asset.DEFAULT_TAKE_PROFIT);
        
        if (currentPrice > 0) {
            setSlPrice(currentPrice - asset.DEFAULT_STOP_LOSS);
            setTpPrice(currentPrice + asset.DEFAULT_TAKE_PROFIT);
        }
    }, [symbol, currentPrice]);

    const handlePercentageClick = (percent: number) => {
        if (quantityType === 'USD') {
            setQuantity(parseFloat((balance * (percent / 100)).toFixed(2)));
        } else {
            setQuantity(parseFloat((maxQuantityAsset * (percent / 100)).toFixed(6)));
        }
    };

    const handleTrade = (type: TradeType) => {
        if (accountType === 'REAL') {
            // For real account, we pass quantity and type
            // We'll reuse onManualTrade but with special values if needed, 
            // or better, update the signature in App.tsx
            onManualTrade(
                type, 
                quantityType === 'USD' ? quantity / currentPrice : quantity, // Convert to "lots" (asset amount) for the existing logic
                useSL ? (Math.abs(currentPrice - slPrice)) : 0, 
                useTP ? (Math.abs(currentPrice - tpPrice)) : 0, 
                orderType === 'PENDING' ? limitPrice : undefined,
                undefined, // overrideDetails
                leverage
            );
        } else {
            onManualTrade(type, lots, useSL ? slDist : 0, useTP ? tpDist : 0, orderType === 'PENDING' ? limitPrice : undefined);
        }
    };

    // Update limit price to current price if switching to Pending and it's 0
    useEffect(() => {
        if (orderType === 'PENDING' && limitPrice === 0) {
            setLimitPrice(marketDetails?.price || 0);
        }
    }, [orderType]);

    const BOTS: {id: BotStrategy, name: string, icon: any, desc: string}[] = [
        { id: 'AI_INTELLIGENCE', name: 'AI Intelligence', icon: BrainCircuit, desc: 'Deep Market Analysis' },
        { id: 'SENTIMENT', name: 'AI News Agent', icon: Bot, desc: 'Real-time Sentiment' },
        { id: 'HFT_BOT', name: 'HFT Bot', icon: Zap, desc: 'High Frequency Alpha' },
        { id: 'NEBULA_V5', name: 'Nebula V5', icon: BrainCircuit, desc: 'Trend Pivot Alpha' },
        { id: 'HEDGING_BOT', name: 'Hedging Bot', icon: Shield, desc: 'Martingale Hedge' },
        { id: 'TECHNICAL_V2', name: 'Technical Core', icon: Zap, desc: 'Momentum Scalper' },
        { id: 'NEBULA_V6', name: 'Market Fractal', icon: BrainCircuit, desc: 'Pattern Recognition' },
    ];

    return (
        <div className="flex flex-col h-full bg-[#121418] overflow-hidden select-none">
            <NebulaV5SettingsModal 
                isOpen={isV5SettingsOpen} 
                onClose={() => setIsV5SettingsOpen(false)} 
                settings={nebulaV5Settings} 
                onSave={onUpdateNebulaV5Settings} 
            />

            <HedgingBotSettingsModal 
                isOpen={isHedgingSettingsOpen} 
                onClose={() => setIsHedgingSettingsOpen(false)} 
                settings={hedgingSettings} 
                onSave={onUpdateHedgingSettings} 
            />

            <HFTBotSettingsModal 
                isOpen={isHFTSettingsOpen} 
                onClose={() => setIsHFTSettingsOpen(false)} 
                settings={hftSettings} 
                onSave={onUpdateHFTSettings} 
            />

            <ConnectBinanceModal 
                isOpen={isConnectModalOpen}
                onClose={() => setIsConnectModalOpen(false)}
                onConnect={(key, secret) => {
                    onConnectBinance(key, secret);
                    setIsConnectModalOpen(false);
                }}
            />

            {/* ACCOUNT TYPE TOGGLE */}
            <div className="p-4 bg-black/60 border-b border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded bg-${accountType === 'REAL' ? 'yellow' : 'blue'}-500/10 text-${accountType === 'REAL' ? 'yellow' : 'blue'}-500`}>
                            {accountType === 'REAL' ? <ShieldCheck size={14} /> : <Globe size={14} />}
                        </div>
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">{accountType === 'REAL' ? 'Real Account' : 'Paper Account'}</span>
                    </div>
                    <div className="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
                        <button 
                            onClick={() => onSetAccountType('PAPER')}
                            className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded transition-all ${accountType === 'PAPER' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-600 hover:text-slate-400'}`}
                        >
                            Paper
                        </button>
                        <button 
                            onClick={() => onSetAccountType('REAL')}
                            className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded transition-all ${accountType === 'REAL' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-900/40' : 'text-slate-600 hover:text-slate-400'}`}
                        >
                            Real
                        </button>
                    </div>
                </div>

                {accountType === 'REAL' && (
                    <div className="animate-in slide-in-from-top-2 duration-300 space-y-3">
                        <div className="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
                            <button 
                                onClick={() => onSetTradingMode(TradingMode.SPOT)}
                                className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest rounded transition-all ${tradingMode === TradingMode.SPOT ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-slate-600 hover:text-slate-400'}`}
                            >
                                Spot
                            </button>
                            <button 
                                onClick={() => onSetTradingMode(TradingMode.FUTURES)}
                                className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest rounded transition-all ${tradingMode === TradingMode.FUTURES ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/40' : 'text-slate-600 hover:text-slate-400'}`}
                            >
                                Futures
                            </button>
                            <button 
                                onClick={() => onSetTradingMode(TradingMode.MARGIN)}
                                className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest rounded transition-all ${tradingMode === TradingMode.MARGIN ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40' : 'text-slate-600 hover:text-slate-400'}`}
                            >
                                Margin
                            </button>
                        </div>

                        {!isBinanceConnected ? (
                            <button 
                                onClick={() => setIsConnectModalOpen(true)}
                                className="w-full py-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[9px] font-black uppercase tracking-[0.2em] hover:bg-yellow-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                <Key size={12} />
                                Connect Binance API
                            </button>
                        ) : (
                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Binance Connected</span>
                                </div>
                                <button 
                                    onClick={() => setIsConnectModalOpen(true)}
                                    className="text-[8px] font-bold text-slate-500 hover:text-white uppercase tracking-tighter"
                                >
                                    Update Keys
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* SELL / BUY BUTTONS */}
            <div className="p-4 grid grid-cols-2 gap-3 shrink-0 border-b border-white/5 bg-black/40">
                <button 
                  onClick={() => handleTrade(TradeType.SELL)}
                  className="flex flex-col items-center justify-center py-4 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-lg shadow-rose-950/40 active:scale-95"
                >
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">{orderType === 'PENDING' ? 'Limit Sell' : (tradingMode === TradingMode.FUTURES ? 'Sell / Short' : 'Sell')}</span>
                    <span className="text-[12px] font-mono font-bold mt-1">{formatNum(marketDetails?.bid)}</span>
                </button>
                <button 
                  onClick={() => handleTrade(TradeType.BUY)}
                  className="flex flex-col items-center justify-center py-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-lg shadow-blue-950/40 active:scale-95"
                >
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">{orderType === 'PENDING' ? 'Limit Buy' : (tradingMode === TradingMode.FUTURES ? 'Buy / Long' : 'Buy')}</span>
                    <span className="text-[12px] font-mono font-bold mt-1">{formatNum(marketDetails?.ask)}</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6 pb-10">
                <div className="space-y-4">
                    <div className="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
                        <button onClick={() => setOrderType('MARKET')} className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all ${orderType === 'MARKET' ? 'bg-[#1e222d] text-white shadow-sm' : 'text-slate-600'}`}>Market</button>
                        <button onClick={() => setOrderType('PENDING')} className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all ${orderType === 'PENDING' ? 'bg-[#1e222d] text-white shadow-sm' : 'text-slate-600'}`}>Limit</button>
                    </div>

                    {accountType === 'REAL' ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {/* Available Balance */}
                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Avbl</span>
                                    <button 
                                        onClick={() => window.location.reload()} 
                                        className="p-1 hover:bg-white/5 rounded transition-colors text-slate-500 hover:text-white"
                                        title="Refresh Balance"
                                    >
                                        <Zap size={10} />
                                    </button>
                                </div>
                                <span className="text-[10px] font-mono font-bold text-white">{formatNum(balance)} {tradingMode === TradingMode.FUTURES ? 'USDT' : 'USD'}</span>
                            </div>

                            {/* Market Price Display */}
                            <div className="bg-black/40 border border-white/5 rounded-lg p-3 text-center">
                                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Market Price</span>
                            </div>

                            {/* Leverage Selector for Futures */}
                            {tradingMode === TradingMode.FUTURES && (
                                <div className="space-y-2 animate-in fade-in duration-300">
                                    <div className="flex justify-between px-1">
                                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Leverage</span>
                                        <span className="text-[10px] font-mono font-bold text-yellow-500">{leverage}x</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="1" 
                                        max="125" 
                                        value={leverage} 
                                        onChange={e => setLeverage(parseInt(e.target.value))}
                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                                    />
                                    <div className="flex justify-between px-1">
                                        {[1, 25, 50, 75, 100, 125].map(v => (
                                            <button key={v} onClick={() => setLeverage(v)} className="text-[8px] text-slate-600 hover:text-white transition-colors">{v}x</button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Quantity Input */}
                            <div className="space-y-2">
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        value={quantity} 
                                        onChange={e => setQuantity(parseFloat(e.target.value))} 
                                        className="w-full bg-black/60 border border-white/10 rounded-lg h-12 px-3 text-right text-white font-mono font-bold outline-none focus:border-blue-500/40" 
                                        placeholder="0.00"
                                    />
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                        <span className="text-[10px] text-slate-500 uppercase font-black">Amount</span>
                                        <select 
                                            value={quantityType}
                                            onChange={(e) => setQuantityType(e.target.value as any)}
                                            className="bg-transparent text-blue-500 text-[10px] font-black uppercase outline-none cursor-pointer"
                                        >
                                            <option value="USD">{tradingMode === TradingMode.FUTURES ? 'USDT' : 'USD'}</option>
                                            <option value="ASSET">{symbol.replace('USD', '')}</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Percentage Slider */}
                            <div className="flex justify-between gap-1">
                                {[25, 50, 75, 100].map(p => (
                                    <button 
                                        key={p}
                                        onClick={() => handlePercentageClick(p)}
                                        className="flex-1 py-1.5 bg-white/5 border border-white/5 rounded text-[9px] font-black text-slate-500 hover:text-white hover:bg-white/10 transition-all"
                                    >
                                        {p}%
                                    </button>
                                ))}
                            </div>

                            {/* Slippage */}
                            <div className="flex items-center gap-2 px-1">
                                <input 
                                    type="checkbox" 
                                    checked={isSlippageEnabled} 
                                    onChange={e => setIsSlippageEnabled(e.target.checked)}
                                    className="accent-yellow-500 w-3 h-3"
                                />
                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Slippage Tolerance</span>
                                {isSlippageEnabled && (
                                    <input 
                                        type="number" 
                                        value={slippage} 
                                        onChange={e => setSlippage(parseFloat(e.target.value))}
                                        className="w-12 bg-transparent border-b border-white/10 text-[9px] text-yellow-500 font-bold text-center outline-none"
                                    />
                                )}
                                {isSlippageEnabled && <span className="text-[9px] text-slate-600">%</span>}
                            </div>

                            {/* TP/SL Advanced */}
                            <div className="space-y-3 pt-2 border-t border-white/5">
                                <div className="flex items-center gap-2 px-1">
                                    <input 
                                        type="checkbox" 
                                        checked={useSL || useTP} 
                                        onChange={e => { setUseSL(e.target.checked); setUseTP(e.target.checked); }}
                                        className="accent-blue-500 w-3 h-3"
                                    />
                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">TP/SL</span>
                                </div>

                                {(useSL || useTP) && (
                                    <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
                                        <div className="space-y-1.5">
                                            <span className="text-[8px] text-slate-500 uppercase font-black ml-1">Take Profit</span>
                                            <input 
                                                type="number" 
                                                value={tpPrice} 
                                                onChange={e => setTpPrice(parseFloat(e.target.value))}
                                                className="w-full bg-black/40 border border-emerald-500/20 rounded-lg h-9 px-2 text-white font-mono text-[10px] outline-none"
                                                placeholder="Price"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <span className="text-[8px] text-slate-500 uppercase font-black ml-1">Stop Loss</span>
                                            <input 
                                                type="number" 
                                                value={slPrice} 
                                                onChange={e => setSlPrice(parseFloat(e.target.value))}
                                                className="w-full bg-black/40 border border-rose-500/20 rounded-lg h-9 px-2 text-white font-mono text-[10px] outline-none"
                                                placeholder="Price"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Max Buy/Sell & Cost */}
                            <div className="space-y-1.5 pt-2">
                                <div className="flex justify-between px-1">
                                    <span className="text-[9px] text-slate-600 uppercase font-black">{tradingMode === TradingMode.FUTURES ? 'Max Buy/Sell' : 'Max Buy'}</span>
                                    <span className="text-[9px] text-white font-bold">{formatNum(maxQuantityAsset, 4)} {symbol.replace('USD', '')}</span>
                                </div>
                                <div className="flex justify-between px-1">
                                    <span className="text-[9px] text-slate-600 uppercase font-black">Cost</span>
                                    <span className="text-[9px] text-white font-bold">{formatNum(estimatedCost)} {tradingMode === TradingMode.FUTURES ? 'USDT' : 'USD'}</span>
                                </div>
                            </div>

                            <button 
                                onClick={() => handleTrade(TradeType.BUY)}
                                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-lg transition-all shadow-lg shadow-emerald-900/20 active:scale-[0.98]"
                            >
                                {tradingMode === TradingMode.FUTURES ? 'Buy / Long' : `Buy ${symbol.replace('USD', '')}`}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* LIMIT PRICE INPUT - ONLY SHOWN FOR PENDING */}
                            {orderType === 'PENDING' && (
                                <div className="space-y-2 animate-fade-in">
                                    <div className="flex items-center gap-2 ml-1">
                                        <Target size={12} className="text-blue-400" />
                                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Entry Price (Limit)</span>
                                    </div>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            value={limitPrice} 
                                            onChange={e => setLimitPrice(parseFloat(e.target.value))} 
                                            className="w-full bg-black/60 border border-blue-500/30 rounded-lg h-10 px-3 text-white font-mono font-bold text-center outline-none focus:border-blue-500/60 transition-all" 
                                        />
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500/50 text-[10px] font-mono font-black">$</div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <div className="flex justify-between px-1">
                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Volume (Lots)</span>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={onOpenDeposit}
                                            className="text-[8px] font-black text-blue-500 uppercase hover:underline"
                                        >
                                            Deposit
                                        </button>
                                        <button 
                                            onClick={onOpenWithdraw}
                                            className="text-[8px] font-black text-slate-500 uppercase hover:underline"
                                        >
                                            Withdraw
                                        </button>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setLots(Math.max(0.01, parseFloat((lots - 0.1).toFixed(2))))} className="w-10 h-10 bg-white/5 rounded-lg border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors">-</button>
                                    <input type="number" value={lots} onChange={e => setLots(parseFloat(e.target.value))} className="flex-1 bg-black/60 border border-white/10 rounded-lg px-3 text-center text-white font-mono font-bold outline-none focus:border-blue-500/40" />
                                    <button onClick={() => setLots(parseFloat((lots + 0.1).toFixed(2)))} className="w-10 h-10 bg-white/5 rounded-lg border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors">+</button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer ml-1">
                                        <input type="checkbox" checked={useSL} onChange={e => setUseSL(e.target.checked)} className="accent-blue-500 w-3 h-3" />
                                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">S/L (Pts)</span>
                                    </label>
                                    {useSL && <input type="number" value={slDist} onChange={e => setSlDist(parseFloat(e.target.value))} className="w-full bg-black/60 border border-rose-500/20 rounded-lg h-10 px-3 text-white font-mono text-xs outline-none" />}
                                </div>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer ml-1">
                                        <input type="checkbox" checked={useTP} onChange={e => setUseTP(e.target.checked)} className="accent-blue-500 w-3 h-3" />
                                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">T/P (Pts)</span>
                                    </label>
                                    {useTP && <input type="number" value={tpDist} onChange={e => setTpDist(parseFloat(e.target.value))} className="w-full bg-black/60 border border-emerald-500/20 rounded-lg h-10 px-3 text-white font-mono text-xs outline-none" />}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="pt-6 border-t border-white/5 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1 rounded bg-blue-500/10 text-blue-500"><Bot size={14} /></div>
                        <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Strategy Engine</h3>
                    </div>
                    
                    <div className="space-y-2">
                        {BOTS.map(bot => {
                            const Icon = bot.icon;
                            const isActive = activeStrategy === bot.id;
                            return (
                                <button
                                    key={bot.id}
                                    onClick={() => !isLocked && onSetStrategy(bot.id)}
                                    disabled={isLocked}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left group ${isActive ? 'bg-blue-600/10 border-blue-500/40' : 'bg-black/40 border-white/5 hover:border-white/20'} ${isLocked ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
                                >
                                    <div className={`p-2 rounded-lg transition-colors ${isActive ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-600'}`}>
                                        <Icon size={14} />
                                    </div>
                                    <div className="flex-1">
                                        <div className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-white' : 'text-slate-500'}`}>{bot.name}</div>
                                        <div className="text-[8px] text-slate-700 uppercase font-bold tracking-tight">{bot.desc}</div>
                                    </div>
                                    {bot.id === 'HFT_BOT' && !isLocked && (
                                        <div 
                                            onClick={(e) => { e.stopPropagation(); setIsHFTSettingsOpen(true); }}
                                            className="p-2 text-zinc-700 hover:text-white transition-colors"
                                        >
                                            <Settings size={14} />
                                        </div>
                                    )}
                                    {bot.id === 'NEBULA_V5' && !isLocked && (
                                        <div 
                                            onClick={(e) => { e.stopPropagation(); setIsV5SettingsOpen(true); }}
                                            className="p-2 text-zinc-700 hover:text-white transition-colors"
                                        >
                                            <Settings size={14} />
                                        </div>
                                    )}
                                    {bot.id === 'HEDGING_BOT' && !isLocked && (
                                        <div 
                                            onClick={(e) => { e.stopPropagation(); setIsHedgingSettingsOpen(true); }}
                                            className="p-2 text-zinc-700 hover:text-white transition-colors"
                                        >
                                            <Settings size={14} />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <button 
                        onClick={() => !isLocked && onToggleBot()}
                        disabled={isLocked}
                        className={`w-full py-4 rounded-xl border flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${isLocked ? 'bg-red-500/10 text-red-500 border-red-500/20 cursor-not-allowed' : isBotActive ? 'bg-blue-600 text-white border-blue-500 shadow-xl shadow-blue-900/40' : 'bg-black/60 text-slate-600 border-white/10 hover:text-white hover:border-white/20'}`}
                    >
                        <Power size={14} className={isBotActive ? 'animate-pulse' : ''} />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{isLocked ? 'Auto Trading Locked' : isBotActive ? 'Auto Trading On' : 'Auto Trading Off'}</span>
                    </button>
                </div>

                <div className="pt-6 border-t border-white/5 space-y-4">
                    <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-slate-600 uppercase font-black">Capital Guardrails</span>
                        <span className="text-blue-500 font-bold">{riskSettings.riskPercentage}%</span>
                    </div>
                    <input 
                        type="range" min="0.1" max="5" step="0.1"
                        value={riskSettings.riskPercentage}
                        onChange={(e) => onRiskUpdate({ ...riskSettings, riskPercentage: parseFloat(e.target.value) })}
                        className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between items-center p-4 rounded-xl bg-black/60 border border-white/5 shadow-inner">
                        <span className="text-[9px] text-slate-600 uppercase font-black tracking-[0.2em]">Suggested Lot</span>
                        <span className="font-mono text-sm font-black text-blue-500">{formatNum(autoLotSize)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderPanel;
