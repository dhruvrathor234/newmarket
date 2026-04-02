
import { GoogleGenAI, Type } from "@google/genai";
import { Symbol, TradeType, MarketAnalysis, Candle } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const aiIntelligenceService = {
  analyzeMarket: async (
    symbol: Symbol,
    candles: Candle[],
    timeframe: string
  ): Promise<MarketAnalysis | null> => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY not found");
        return null;
      }

      const candleData = candles.slice(-50).map(c => ({
        t: new Date(c.time).toISOString(),
        o: c.open,
        h: c.high,
        l: c.low,
        c: c.close,
        v: c.volume
      }));

      const prompt = `
        You are an elite institutional trading AI. Analyze the following market data for ${symbol} on the ${timeframe} timeframe.
        
        Market Data (Last 50 candles):
        ${JSON.stringify(candleData)}
        
        Your task:
        1. Perform a deep technical analysis (Trend, Support/Resistance, Momentum).
        2. Identify the best possible trade setup (BUY, SELL, or HOLD).
        3. Provide specific entry, Take Profit (TP), and Stop Loss (SL) levels.
        4. Explain your reasoning in detail.
        
        Return the analysis in a strict JSON format.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              decision: { type: Type.STRING, enum: ["BUY", "SELL", "HOLD"] },
              sentimentScore: { type: Type.NUMBER, description: "0 to 100" },
              sentimentCategory: { type: Type.STRING, enum: ["POSITIVE", "NEGATIVE", "NEUTRAL"] },
              reasoning: { type: Type.STRING },
              suggestedSL: { type: Type.NUMBER },
              suggestedTP: { type: Type.NUMBER },
              technical: {
                type: Type.OBJECT,
                properties: {
                  rsi: { type: Type.NUMBER },
                  trend: { type: Type.STRING, enum: ["UP", "DOWN", "SIDEWAYS"] }
                }
              }
            },
            required: ["decision", "sentimentScore", "sentimentCategory", "reasoning"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      
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
          stopLoss: result.suggestedSL
        },
        technical: {
          rsi: result.technical?.rsi || 50,
          pivotState: 0,
          maCrossover: 'BULLISH',
          trend: result.technical?.trend === 'UP' ? 'UP' : 'DOWN'
        }
      };
    } catch (error) {
      console.error("AI Intelligence Analysis Error:", error);
      return null;
    }
  },

  calculateMarkers: (analysis: MarketAnalysis | null): any[] => {
    if (!analysis || analysis.decision === 'HOLD') return [];

    const markers: any[] = [];
    const entryPrice = analysis.suggestedSL && analysis.customParams?.takeProfit 
      ? (analysis.suggestedSL + analysis.customParams.takeProfit) / 2 
      : Date.now(); // Placeholder if no price

    // Entry Marker
    markers.push({
      time: Math.floor(analysis.timestamp / 1000),
      position: analysis.decision === 'BUY' ? 'belowBar' : 'aboveBar',
      color: analysis.decision === 'BUY' ? '#10b981' : '#f43f5e',
      shape: analysis.decision === 'BUY' ? 'arrowUp' : 'arrowDown',
      text: `AI ${analysis.decision} @ ${analysis.sentimentScore}%`,
      size: 2
    });

    return markers;
  }
};
