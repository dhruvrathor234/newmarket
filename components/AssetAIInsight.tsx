
import React, { useState, useEffect } from 'react';
import { Symbol, MarketAnalysis, TradeType } from '../types';
import { BrainCircuit, TrendingUp, TrendingDown, Info, Copy, Check, AlertCircle } from 'lucide-react';
import { aiIntelligenceService } from '../services/aiIntelligenceService';
import { Candle } from '../types';

interface AssetAIInsightProps {
  symbol: Symbol;
  candles: Candle[];
  timeframe: string;
  onCopyTrade: (analysis: MarketAnalysis) => void;
  isLocked?: boolean;
}

const AssetAIInsight: React.FC<AssetAIInsightProps> = ({ symbol, candles, timeframe, onCopyTrade, isLocked }) => {
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);

  const performAnalysis = async () => {
    if (isAnalyzing || candles.length < 50) return;
    setIsAnalyzing(true);
    try {
      const result = await aiIntelligenceService.analyzeMarket(symbol, candles, timeframe);
      if (result) {
        setAnalysis(result);
      }
    } catch (error) {
      console.error("AI Insight Error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    performAnalysis();
    const interval = setInterval(performAnalysis, 60000); // Re-analyze every minute
    return () => clearInterval(interval);
  }, [symbol, timeframe]);

  const handleCopy = () => {
    if (analysis && !isLocked) {
      onCopyTrade(analysis);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!analysis && !isAnalyzing) {
    return (
      <div className="p-4 bg-black/40 border border-white/5 rounded-xl text-center">
        <span className="text-[10px] text-slate-600 uppercase font-black tracking-widest">No AI Insights Available</span>
      </div>
    );
  }

  return (
    <div className="p-4 bg-black/40 border border-white/5 rounded-xl space-y-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-blue-500/10 text-blue-500">
            <BrainCircuit size={14} className={isAnalyzing ? 'animate-pulse' : ''} />
          </div>
          <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Asset AI Insight</h3>
        </div>
        {isAnalyzing && (
          <span className="text-[8px] font-black text-blue-500 uppercase animate-pulse">Deep Analysis...</span>
        )}
      </div>

      {analysis && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
            <div className="flex flex-col">
              <span className="text-[8px] text-slate-500 uppercase font-black">AI Signal</span>
              <div className={`flex items-center gap-1.5 text-[12px] font-black uppercase ${analysis.decision === 'BUY' ? 'text-emerald-500' : analysis.decision === 'SELL' ? 'text-rose-500' : 'text-slate-400'}`}>
                {analysis.decision === 'BUY' ? <TrendingUp size={14} /> : analysis.decision === 'SELL' ? <TrendingDown size={14} /> : <Info size={14} />}
                {analysis.decision}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[8px] text-slate-500 uppercase font-black">Confidence</span>
              <div className="text-[12px] font-mono font-black text-blue-500">{analysis.sentimentScore}%</div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-black/60 border border-white/5 space-y-2">
            <span className="text-[8px] text-slate-500 uppercase font-black">Deep Reasoning</span>
            <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
              {analysis.reasoning}
            </p>
          </div>

          {(analysis.decision === 'BUY' || analysis.decision === 'SELL') && (
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded bg-emerald-500/5 border border-emerald-500/10">
                <span className="text-[8px] text-slate-500 uppercase font-black">Target (TP)</span>
                <div className="text-[10px] font-mono font-black text-emerald-500">
                  {analysis.customParams?.takeProfit?.toFixed(2) || 'N/A'}
                </div>
              </div>
              <div className="p-2 rounded bg-rose-500/5 border border-rose-500/10">
                <span className="text-[8px] text-slate-500 uppercase font-black">Safety (SL)</span>
                <div className="text-[10px] font-mono font-black text-rose-500">
                  {analysis.customParams?.stopLoss?.toFixed(2) || 'N/A'}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleCopy}
            disabled={isLocked || analysis.decision === 'HOLD'}
            className={`w-full py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
              isLocked || analysis.decision === 'HOLD'
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                : copied
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
            }`}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span className="text-[9px] font-black uppercase tracking-widest">
              {copied ? 'Signal Copied' : 'Copy AI Trade'}
            </span>
          </button>
        </div>
      )}

      {isLocked && (
        <div className="flex items-center gap-2 p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-500">
          <AlertCircle size={12} />
          <span className="text-[8px] font-black uppercase tracking-widest">Account Locked - Pay Fees to Unlock</span>
        </div>
      )}
    </div>
  );
};

export default AssetAIInsight;
