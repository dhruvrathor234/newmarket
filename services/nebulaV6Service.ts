
import { Candle, TradeType, MarketAnalysis, Symbol } from "../types";

function calculateALMA(values: number[], len: number, offset: number, sigma: number): number {
  if (values.length < len) return values[values.length - 1];
  const m = Math.floor(offset * (len - 1));
  const s = len / sigma;
  const weights: number[] = [];
  let sumW = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.exp(-((i - m) * (i - m)) / (2 * s * s));
    weights.push(w);
    sumW += w;
  }
  let acc = 0;
  const startIdx = values.length - len;
  for (let j = 0; j < len; j++) {
    acc += values[startIdx + j] * weights[j];
  }
  return acc / sumW;
}

function calculateRSI(values: number[], period: number): number {
  if (values.length <= period) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = values.length - period; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function findPivotLow(lows: number[], prd: number): number | null {
  const n = lows.length;
  if (n < 2 * prd + 1) return null;
  const checkIdx = n - 1 - prd;
  const val = lows[checkIdx];
  for (let i = checkIdx - prd; i <= n - 1; i++) {
    if (i === checkIdx) continue;
    if (lows[i] < val) return null;
  }
  return val;
}

function findPivotHigh(highs: number[], prd: number): number | null {
  const n = highs.length;
  if (n < 2 * prd + 1) return null;
  const checkIdx = n - 1 - prd;
  const val = highs[checkIdx];
  for (let i = checkIdx - prd; i <= n - 1; i++) {
    if (i === checkIdx) continue;
    if (highs[i] > val) return null;
  }
  return val;
}

export const runNebulaMarketV6 = (candles: Candle[], symbol: Symbol): MarketAnalysis => {
  const closes = candles.map(c => c.close);
  const lows = candles.map(c => c.low);
  const highs = candles.map(c => c.high);
  
  const currentPrice = closes[closes.length - 1];
  
  const FRACTAL_PERIOD = 36;
  const ALMA_LEN = 2;
  const ALMA_OFFSET = 0.85;
  const ALMA_SIGMA = 5;
  const RSI_LEN = 14;

  const almaVal = calculateALMA(closes, ALMA_LEN, ALMA_OFFSET, ALMA_SIGMA);
  const rsiVal = calculateRSI(closes, RSI_LEN);
  
  const pLow = findPivotLow(lows, FRACTAL_PERIOD);
  const pHigh = findPivotHigh(highs, FRACTAL_PERIOD);

  const A_buy = pLow !== null;
  const A_sell = pHigh !== null;
  const B_buy = currentPrice > almaVal && rsiVal > 50;
  const B_sell = currentPrice < almaVal && rsiVal < 50;

  const buySignal = A_buy && B_buy;
  const sellSignal = A_sell && B_sell;

  let decision = TradeType.HOLD;
  let reasoning = `V6 Engine: Monitoring Fractal(${FRACTAL_PERIOD}) + ALMA. RSI: ${rsiVal.toFixed(1)}`;
  let suggestedSL: number | undefined;

  if (buySignal) {
    decision = TradeType.BUY;
    suggestedSL = pLow!; // Using the Fractal Low as SL
    reasoning = `V6 BUY: Fractal Low Confirmed @ ${pLow?.toFixed(2)}. ALMA/RSI Bullish. RSI: ${rsiVal.toFixed(1)}`;
  } else if (sellSignal) {
    decision = TradeType.SELL;
    suggestedSL = pHigh!; // Using the Fractal High as SL
    reasoning = `V6 SELL: Fractal High Confirmed @ ${pHigh?.toFixed(2)}. ALMA/RSI Bearish. RSI: ${rsiVal.toFixed(1)}`;
  }

  return {
    symbol,
    timestamp: Date.now(),
    decision,
    sentimentScore: buySignal ? 0.95 : sellSignal ? -0.95 : 0,
    sentimentCategory: buySignal ? 'POSITIVE' : sellSignal ? 'NEGATIVE' : 'NEUTRAL',
    reasoning,
    sources: [],
    strategy: 'NEBULA_V6',
    suggestedSL,
    technical: {
      rsi: rsiVal,
      pivotState: buySignal ? 1 : sellSignal ? 3 : 0,
      maCrossover: currentPrice > almaVal ? 'BULLISH' : 'BEARISH',
      trend: currentPrice > almaVal ? 'UP' : 'DOWN'
    }
  };
};
