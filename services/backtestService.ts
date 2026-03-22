
import { Candle, Symbol, NebulaV5Settings, BacktestReport, BacktestTrade, TradeType, ChartMarker, BotStrategy, HFTBotSettings, HedgingBotSettings } from "../types";
import { calculateNebulaV5Markers } from "./nebulaV5Service";
import { GoogleGenAI, Type } from "@google/genai";

export const calculateBacktestReport = (candles: Candle[], markers: ChartMarker[], initialBalance: number = 10000): BacktestReport => {
  const trades: BacktestTrade[] = [];
  let currentBalance = initialBalance;
  let activeTrade: { type: TradeType; entryPrice: number; entryTime: number } | null = null;

  // Sort markers by time to ensure sequential processing
  const sortedMarkers = [...markers].sort((a, b) => a.time - b.time);

  sortedMarkers.forEach((marker) => {
    const candle = candles.find(c => c.time === marker.time || Math.abs(c.time - marker.time) < 60);
    if (!candle) return;

    if (marker.text === 'BUY') {
      if (activeTrade && activeTrade.type === TradeType.SELL) {
        const exitPrice = candle.open;
        const pnl = (activeTrade.entryPrice - exitPrice) * 10;
        const pnlPercentage = ((activeTrade.entryPrice - exitPrice) / activeTrade.entryPrice) * 100;
        
        trades.push({
          id: `BT-${trades.length}`,
          type: TradeType.SELL,
          entryPrice: activeTrade.entryPrice,
          exitPrice: exitPrice,
          entryTime: activeTrade.entryTime,
          exitTime: candle.time,
          pnl: pnl,
          pnlPercentage: pnlPercentage,
          status: pnl > 0 ? 'WIN' : 'LOSS'
        });
        currentBalance += pnl;
        activeTrade = null;
      }
      
      if (!activeTrade) {
        activeTrade = {
          type: TradeType.BUY,
          entryPrice: candle.close,
          entryTime: candle.time
        };
      }
    } else if (marker.text === 'SELL') {
      if (activeTrade && activeTrade.type === TradeType.BUY) {
        const exitPrice = candle.open;
        const pnl = (exitPrice - activeTrade.entryPrice) * 10;
        const pnlPercentage = ((exitPrice - activeTrade.entryPrice) / activeTrade.entryPrice) * 100;

        trades.push({
          id: `BT-${trades.length}`,
          type: TradeType.BUY,
          entryPrice: activeTrade.entryPrice,
          exitPrice: exitPrice,
          entryTime: activeTrade.entryTime,
          exitTime: candle.time,
          pnl: pnl,
          pnlPercentage: pnlPercentage,
          status: pnl > 0 ? 'WIN' : 'LOSS'
        });
        currentBalance += pnl;
        activeTrade = null;
      }

      if (!activeTrade) {
        activeTrade = {
          type: TradeType.SELL,
          entryPrice: candle.close,
          entryTime: candle.time
        };
      }
    }
  });

  if (activeTrade && candles.length > 0) {
    const lastCandle = candles[candles.length - 1];
    const exitPrice = lastCandle.close;
    const pnl = activeTrade.type === TradeType.BUY 
      ? (exitPrice - activeTrade.entryPrice) * 10 
      : (activeTrade.entryPrice - exitPrice) * 10;
    const pnlPercentage = activeTrade.type === TradeType.BUY
      ? ((exitPrice - activeTrade.entryPrice) / activeTrade.entryPrice) * 100
      : ((activeTrade.entryPrice - exitPrice) / activeTrade.entryPrice) * 100;

    trades.push({
      id: `BT-${trades.length}`,
      type: activeTrade.type,
      entryPrice: activeTrade.entryPrice,
      exitPrice: exitPrice,
      entryTime: activeTrade.entryTime,
      exitTime: lastCandle.time,
      pnl: pnl,
      pnlPercentage: pnlPercentage,
      status: pnl > 0 ? 'WIN' : 'LOSS'
    });
    currentBalance += pnl;
  }

  const totalTrades = trades.length;
  const wins = trades.filter(t => t.status === 'WIN').length;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const netProfit = currentBalance - initialBalance;
  
  const grossProfit = trades.filter(t => t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0);
  const grossLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((acc, t) => acc + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit;

  let peak = initialBalance;
  let maxDrawdown = 0;
  let runningBalance = initialBalance;
  
  trades.forEach(t => {
    runningBalance += t.pnl;
    if (runningBalance > peak) peak = runningBalance;
    const dd = ((peak - runningBalance) / peak) * 100;
    if (dd > maxDrawdown) maxDrawdown = dd;
  });

  return {
    totalTrades,
    winRate,
    netProfit,
    profitFactor,
    maxDrawdown,
    avgTrade: totalTrades > 0 ? netProfit / totalTrades : 0,
    trades: trades.reverse()
  };
};

export const runNebulaBacktest = (candles: Candle[], config: NebulaV5Settings, initialBalance: number = 10000): BacktestReport => {
  const markers = calculateNebulaV5Markers(candles, config);
  return calculateBacktestReport(candles, markers, initialBalance);
};

export const runStrategyBacktest = async (
  strategy: BotStrategy,
  candles: Candle[],
  logic?: string,
  nebulaSettings?: NebulaV5Settings,
  hftSettings?: HFTBotSettings,
  hedgingSettings?: HedgingBotSettings,
  initialBalance: number = 10000
): Promise<BacktestReport> => {
  if (strategy === 'NEBULA_V5' && nebulaSettings) {
    return runNebulaBacktest(candles, nebulaSettings, initialBalance);
  }

  // For all other strategies, we use Gemini to interpret and generate signals
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  // Sample candles to fit in context
  const sampledCandles = candles.filter((_, i) => i % 5 === 0);
  
  let strategyDescription = "";
  switch (strategy) {
    case 'SENTIMENT':
      strategyDescription = "Analyze market sentiment based on price action and simulated news events. Look for momentum shifts and reversals.";
      break;
    case 'HFT_BOT':
      strategyDescription = `High-frequency trading logic. Settings: ${JSON.stringify(hftSettings)}. Look for small, rapid price changes and scalp opportunities. High sensitivity to momentum.`;
      break;
    case 'HEDGING_BOT':
      strategyDescription = `Martingale-style hedging. Settings: ${JSON.stringify(hedgingSettings)}. Open counter-positions when trades go against the trend to recover losses.`;
      break;
    case 'TECHNICAL_V2':
      strategyDescription = "Core technical analysis using EMA crossovers (e.g., 20/50/200), RSI overbought/oversold levels, and MACD.";
      break;
    case 'NEBULA_V6':
      strategyDescription = "Market fractal recognition. Identify recurring geometric patterns in price action to predict future moves.";
      break;
    case 'CUSTOM_AI':
      strategyDescription = logic || "Follow the user's custom trading rules.";
      break;
    default:
      strategyDescription = "Generic trend following strategy.";
  }

  const prompt = `
    You are a professional quantitative trading backtester. 
    Analyze the following historical candle data and the strategy logic provided.
    Generate a list of BUY and SELL signals based on the strategy.
    
    Strategy: ${strategy}
    Description/Logic: "${strategyDescription}"
    
    Candle Data (Sampled every 5th candle):
    ${JSON.stringify(sampledCandles.map(c => ({ t: c.time, o: c.open, h: c.high, l: c.low, c: c.close })))}
    
    Return the signals in JSON format as an array of objects:
    [{ "time": timestamp_in_seconds, "type": "BUY" | "SELL" }]
    
    IMPORTANT: 
    - Only return signals that clearly match the strategy.
    - Do not return too many signals; quality over quantity.
    - Ensure the timestamps match the provided candle data.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              time: { type: Type.NUMBER },
              type: { type: Type.STRING, enum: ["BUY", "SELL"] }
            },
            required: ["time", "type"]
          }
        }
      }
    });

    const signals = JSON.parse(response.text || "[]");
    const markers: ChartMarker[] = signals.map((s: any) => ({
      time: s.time,
      position: s.type === 'BUY' ? 'belowBar' : 'aboveBar',
      color: s.type === 'BUY' ? '#10b981' : '#ef4444',
      shape: s.type === 'BUY' ? 'arrowUp' : 'arrowDown',
      text: s.type
    }));

    return calculateBacktestReport(candles, markers, initialBalance);
  } catch (error) {
    console.error(`Backtest failed for ${strategy}:`, error);
    return {
      totalTrades: 0,
      winRate: 0,
      netProfit: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      avgTrade: 0,
      trades: []
    };
  }
};

export const runCustomBacktest = async (candles: Candle[], logic: string, initialBalance: number = 10000): Promise<BacktestReport> => {
  return runStrategyBacktest('CUSTOM_AI', candles, logic, undefined, undefined, undefined, initialBalance);
};
