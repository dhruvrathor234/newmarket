import { Symbol, TradeType, MarketAnalysis, Candle } from '../types';
import { apiRequest } from './apiClient';

export const aiIntelligenceService = {
  analyzeMarket: async (
    symbol: Symbol,
    candles: Candle[],
    timeframe: string
  ): Promise<MarketAnalysis | null> => {
    try {
      const response = await apiRequest('/api/ai/analyze-intelligence', {
        method: 'POST',
        body: JSON.stringify({ symbol, candles: candles.slice(-50), timeframe }),
      });

      if (!response.ok) {
        console.warn('[AI Intelligence] Analysis endpoint unavailable:', response.status);
        return null;
      }

      const result = await response.json();

      return {
        symbol,
        timestamp: Date.now(),
        decision: result.decision as TradeType,
        sentimentScore: result.sentimentScore,
        sentimentCategory: result.sentimentCategory,
        reasoning: result.reasoning,
        sources: [],
        strategy: 'AI_INTELLIGENCE',
        suggestedSL: result.suggestedSL,
        customParams: {
          takeProfit: result.suggestedTP,
          stopLoss: result.suggestedSL,
        },
        technical: {
          rsi: result.technical?.rsi || 50,
          pivotState: 0,
          maCrossover: 'BULLISH',
          trend: result.technical?.trend === 'UP' ? 'UP' : 'DOWN',
        },
      };
    } catch (error) {
      console.error('AI Intelligence Analysis Error:', error);
      return null;
    }
  },

  calculateMarkers: (analysis: MarketAnalysis | null): any[] => {
    if (!analysis || analysis.decision === 'HOLD') return [];

    const markers: any[] = [];
    const entryPrice = analysis.suggestedSL && analysis.customParams?.takeProfit
      ? (analysis.suggestedSL + analysis.customParams.takeProfit) / 2
      : Date.now(); // Placeholder if no price

    markers.push({
      time: Math.floor(analysis.timestamp / 1000),
      position: analysis.decision === 'BUY' ? 'belowBar' : 'aboveBar',
      color: analysis.decision === 'BUY' ? '#10b981' : '#f43f5e',
      shape: analysis.decision === 'BUY' ? 'arrowUp' : 'arrowDown',
      text: `AI ${analysis.decision} @ ${analysis.sentimentScore}%`,
      size: 2,
    });

    return markers;
  },
};
