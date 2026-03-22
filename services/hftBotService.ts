
import { Candle, TradeType, MarketAnalysis, Symbol, HFTBotSettings, AccountType } from "../types";

export const analyzeHFTBot = (
  candles: Candle[],
  symbol: Symbol,
  config: HFTBotSettings,
  currentSpread: number = 2 // Default spread if not provided
): MarketAnalysis => {
  const closes = candles.map(c => c.close);
  const currentPrice = closes[closes.length - 1];
  const now = new Date();
  const currentHour = now.getUTCHours();

  // 1. Check Time Settings
  const isTradingTime = currentHour >= config.startHour && currentHour < config.endHour;
  
  // 2. Check Spread
  const isSpreadOk = currentSpread <= config.maxSpread;

  let decision = TradeType.HOLD;
  let reasoning = `HFT Bot: Time=${currentHour}h, Spread=${currentSpread}. `;

  if (!isTradingTime) {
    reasoning += "Outside trading hours.";
  } else if (!isSpreadOk) {
    reasoning += `Spread too high (Max: ${config.maxSpread}).`;
  } else {
    // HFT Strategy Logic (Simplified translation of MQL5 logic)
    // In a real HFT bot, this would involve complex tick analysis.
    // Here we use candle data to simulate the logic.
    
    const lastCandle = candles[candles.length - 1];
    const prevCandle = candles[candles.length - 2];
    
    // Simple momentum/breakout logic based on Delta
    const priceChange = lastCandle.close - prevCandle.close;
    const volatility = lastCandle.high - lastCandle.low;
    
    if (priceChange > (config.delta * 0.0001)) { // Simplified point to price conversion
      decision = TradeType.BUY;
      reasoning += "Bullish momentum detected.";
    } else if (priceChange < -(config.delta * 0.0001)) {
      decision = TradeType.SELL;
      reasoning += "Bearish momentum detected.";
    } else {
      reasoning += "Waiting for momentum.";
    }
  }

  return {
    symbol,
    timestamp: Date.now(),
    decision,
    sentimentScore: decision === TradeType.BUY ? 0.8 : decision === TradeType.SELL ? -0.8 : 0,
    sentimentCategory: decision === TradeType.BUY ? 'POSITIVE' : decision === TradeType.SELL ? 'NEGATIVE' : 'NEUTRAL',
    reasoning,
    sources: [],
    strategy: 'HFT_BOT',
    customParams: {
      stopLoss: config.stopLoss,
      // HFT Bot uses its own SL/TP logic
    }
  };
};

export const calculateHFTLotSize = (
  balance: number,
  config: HFTBotSettings,
  price: number
): number => {
  switch (config.lotType) {
    case 'FIXED':
      return config.fixedLot;
    case 'BALANCE_PCT':
      return (balance * (config.riskPercent / 100)) / price;
    case 'EQUITY_PCT':
      // Simplified: using balance for now as equity is dynamic
      return (balance * (config.riskPercent / 100)) / price;
    case 'FREE_MARGIN_PCT':
      return (balance * (config.riskPercent / 100)) / price;
    default:
      return config.fixedLot;
  }
};
