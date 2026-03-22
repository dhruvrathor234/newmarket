
import { Candle, TradeType, MarketAnalysis, Symbol, NebulaV5Settings, ChartMarker } from "../types";

// --- OPTIMIZED MA UTILS ---

function calculateSMA(values: number[], period: number): number {
  if (values.length < period) return values[values.length - 1];
  let sum = 0;
  for (let i = values.length - period; i < values.length; i++) {
    sum += values[i];
  }
  return sum / period;
}

function calculateWMA(values: number[], period: number): number {
  if (values.length < period) return values[values.length - 1];
  const denom = (period * (period + 1)) / 2;
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[values.length - period + i] * (i + 1);
  }
  return sum / denom;
}

function calculateEMA(values: number[], period: number): number {
  if (values.length === 0) return 0;
  const alpha = 2 / (period + 1);
  let ema = values[0];
  for (let i = 1; i < values.length; i++) {
    ema = alpha * values[i] + (1 - alpha) * ema;
  }
  return ema;
}

// Efficiently calculate a series of EMAs
function calculateEMASeries(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const alpha = 2 / (period + 1);
  const result = new Array(values.length);
  result[0] = values[0];
  for (let i = 1; i < values.length; i++) {
    result[i] = alpha * values[i] + (1 - alpha) * result[i - 1];
  }
  return result;
}

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

function calculateTEMA(values: number[], len: number): number {
  if (values.length < len) return values[values.length - 1];
  const ema1 = calculateEMASeries(values, len);
  const ema2 = calculateEMASeries(ema1, len);
  const ema3 = calculateEMASeries(ema2, len);
  
  const lastIdx = values.length - 1;
  return 3 * (ema1[lastIdx] - ema2[lastIdx]) + ema3[lastIdx];
}

function calculateHullMA(values: number[], len: number): number {
  if (values.length < len) return values[values.length - 1];
  const halfLen = Math.floor(len / 2);
  const sqrtLen = Math.floor(Math.sqrt(len));
  
  // We need a series of WMA(half) and WMA(full)
  const wmaHalfSeries: number[] = [];
  const wmaFullSeries: number[] = [];
  
  for (let i = 0; i < values.length; i++) {
    wmaHalfSeries.push(calculateWMA(values.slice(0, i + 1), halfLen));
    wmaFullSeries.push(calculateWMA(values.slice(0, i + 1), len));
  }
  
  const diff = wmaHalfSeries.map((v, i) => 2 * v - wmaFullSeries[i]);
  return calculateWMA(diff, sqrtLen);
}

// --- PIVOT UTILS ---

function findPivotLow(lows: number[], prd: number): number | null {
  const n = lows.length;
  if (n < prd + 1) return null;
  // We check the candle at index (n - 1 - prd)
  // It is a pivot low if it's lower than 'prd' candles before it 
  // AND lower than all candles after it up to the current one.
  const checkIdx = n - 1 - prd;
  if (checkIdx < prd) return null;
  
  const val = lows[checkIdx];
  
  // Check left side (fully confirmed)
  for (let i = checkIdx - prd; i < checkIdx; i++) {
    if (lows[i] < val) return null;
  }
  
  // Check right side (up to current candle)
  for (let i = checkIdx + 1; i < n; i++) {
    if (lows[i] < val) return null;
  }
  
  return val;
}

function findPivotHigh(highs: number[], prd: number): number | null {
  const n = highs.length;
  if (n < prd + 1) return null;
  const checkIdx = n - 1 - prd;
  if (checkIdx < prd) return null;
  
  const val = highs[checkIdx];
  
  // Check left side
  for (let i = checkIdx - prd; i < checkIdx; i++) {
    if (highs[i] > val) return null;
  }
  
  // Check right side
  for (let i = checkIdx + 1; i < n; i++) {
    if (highs[i] > val) return null;
  }
  
  return val;
}

// Global persistent state for the Bot's pivot tracking
const nebulaStates: Record<string, number> = {}; 

export const calculateNebulaV5Markers = (candles: Candle[], config: NebulaV5Settings): ChartMarker[] => {
  const markers: ChartMarker[] = [];
  let state = 0; 
  
  const closes = candles.map(c => c.close);
  const opens = candles.map(c => c.open);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);

  // Pre-calculate EMA 144 for the whole series
  const ema144Series = calculateEMASeries(closes, 144);

  const calculateVariantAt = (idx: number, series: number[]) => {
    const subSeries = series.slice(0, idx + 1);
    switch (config.basisType) {
      case 'ALMA': return calculateALMA(subSeries, config.basisLen, config.offsetALMA, config.offsetSigma);
      case 'TEMA': return calculateTEMA(subSeries, config.basisLen);
      case 'HullMA': return calculateHullMA(subSeries, config.basisLen);
      default: return calculateSMA(subSeries, config.basisLen);
    }
  };

  const startIdx = Math.max(config.basisLen, 144, config.pivotPeriod * 2 + 1);

  for (let i = startIdx; i < candles.length; i++) {
    const subLows = lows.slice(0, i + 1);
    const subHighs = highs.slice(0, i + 1);
    
    const pLow = findPivotLow(subLows, config.pivotPeriod);
    const pHigh = findPivotHigh(subHighs, config.pivotPeriod);

    if (state === 0 && pLow !== null) state = 1;
    else if (state === 2 && pHigh !== null) state = 3;

    const closeSeries = calculateVariantAt(i, closes);
    const openSeries = calculateVariantAt(i, opens);
    const closeSeriesPrev = calculateVariantAt(i - 1, closes);
    const openSeriesPrev = calculateVariantAt(i - 1, opens);

    const crossover = closeSeries > openSeries && closeSeriesPrev <= openSeriesPrev;
    const crossunder = closeSeries < openSeries && closeSeriesPrev >= openSeriesPrev;

    const isBullishTrend = closes[i] > ema144Series[i];

    // Relaxed state machine: Allow signals even if state is 0 or 2 (faster entry)
    if (crossover && (state === 1 || state === 0) && isBullishTrend) {
      markers.push({
        time: candles[i].time / 1000,
        position: 'belowBar',
        color: '#10b981',
        shape: 'arrowUp',
        text: 'BUY'
      });
      state = 2;
    } else if (crossunder && (state === 3 || state === 2) && !isBullishTrend) {
      markers.push({
        time: candles[i].time / 1000,
        position: 'aboveBar',
        color: '#ef4444',
        shape: 'arrowDown',
        text: 'SELL'
      });
      state = 0;
    }
  }

  return markers;
};

export const analyzeNebulaV5 = (candles: Candle[], symbol: Symbol, config: NebulaV5Settings): MarketAnalysis => {
  const closes = candles.map(c => c.close);
  const opens = candles.map(c => c.open);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const currentPrice = closes[closes.length - 1];

  // 1. Calculate Basis Series (Close/Open)
  const calculateVariant = (series: number[]) => {
    switch (config.basisType) {
      case 'ALMA': return calculateALMA(series, config.basisLen, config.offsetALMA, config.offsetSigma);
      case 'TEMA': return calculateTEMA(series, config.basisLen);
      case 'HullMA': return calculateHullMA(series, config.basisLen);
      default: return calculateSMA(series, config.basisLen);
    }
  };

  const closeSeries = calculateVariant(closes);
  const openSeries = calculateVariant(opens);
  const closeSeriesPrev = calculateVariant(closes.slice(0, -1));
  const openSeriesPrev = calculateVariant(opens.slice(0, -1));

  // 2. Pivot State Machine
  const stateKey = `${symbol}_v5`;
  if (nebulaStates[stateKey] === undefined) nebulaStates[stateKey] = 0;
  
  const pLow = findPivotLow(lows, config.pivotPeriod);
  const pHigh = findPivotHigh(highs, config.pivotPeriod);

  // Transition: 0 -> 1 (Wait Bullish Pivot -> Seen)
  if (nebulaStates[stateKey] === 0 && pLow !== null) {
    nebulaStates[stateKey] = 1;
  }
  // Transition: 2 -> 3 (Wait Bearish Pivot -> Seen)
  else if (nebulaStates[stateKey] === 2 && pHigh !== null) {
    nebulaStates[stateKey] = 3;
  }

  // 3. Signal Logic
  const crossover = closeSeries > openSeries && closeSeriesPrev <= openSeriesPrev;
  const crossunder = closeSeries < openSeries && closeSeriesPrev >= openSeriesPrev;

  const ema144 = calculateEMA(closes, 144);
  const isBullishTrend = currentPrice > ema144;

  let decision = TradeType.HOLD;
  let reasoning = `NEBULA V5: State ${nebulaStates[stateKey]}. P-Low: ${pLow !== null}, P-High: ${pHigh !== null}`;

  // Faster execution: If we see a pivot, we transition state immediately
  if (crossover && (nebulaStates[stateKey] === 1 || nebulaStates[stateKey] === 0) && isBullishTrend) {
    decision = TradeType.BUY;
    nebulaStates[stateKey] = 2; 
    reasoning = `NEBULA V5 BUY: Instant Signal @ ${currentPrice.toFixed(2)}`;
  } else if (crossunder && (nebulaStates[stateKey] === 3 || nebulaStates[stateKey] === 2) && !isBullishTrend) {
    decision = TradeType.SELL;
    nebulaStates[stateKey] = 0; 
    reasoning = `NEBULA V5 SELL: Instant Signal @ ${currentPrice.toFixed(2)}`;
  }

  return {
    symbol,
    timestamp: Date.now(),
    decision,
    sentimentScore: decision === TradeType.BUY ? 0.9 : decision === TradeType.SELL ? -0.9 : 0,
    sentimentCategory: decision === TradeType.BUY ? 'POSITIVE' : decision === TradeType.SELL ? 'NEGATIVE' : 'NEUTRAL',
    reasoning,
    sources: [],
    strategy: 'NEBULA_V5',
    technical: {
      rsi: 50, // Not used in primary signal
      pivotState: nebulaStates[stateKey],
      maCrossover: crossover ? 'BULLISH' : 'BEARISH',
      trend: closeSeries > openSeries ? 'UP' : 'DOWN'
    }
  };
};
