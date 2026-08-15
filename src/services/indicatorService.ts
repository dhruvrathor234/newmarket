
export function calculateSMA(values: number[], period: number): number[] {
  const results: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      results.push(NaN);
      continue;
    }
    const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    results.push(sum / period);
  }
  return results;
}

export function calculateEMA(values: number[], period: number): number[] {
  const results: number[] = [];
  const alpha = 2 / (period + 1);
  let ema = values[0];
  for (let i = 0; i < values.length; i++) {
    ema = alpha * values[i] + (1 - alpha) * ema;
    if (i < period - 1) {
      results.push(NaN);
    } else {
      results.push(ema);
    }
  }
  return results;
}

export function calculateRSI(values: number[], period: number = 14): number[] {
  const results: number[] = [];
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < values.length; i++) {
    if (i === 0) {
      results.push(NaN);
      continue;
    }

    const diff = values[i] - values[i - 1];
    const gain = Math.max(0, diff);
    const loss = Math.max(0, -diff);

    if (i < period) {
      avgGain += gain;
      avgLoss += loss;
      results.push(NaN);
      if (i === period - 1) {
        avgGain /= period;
        avgLoss /= period;
      }
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = 100 - 100 / (1 + rs);
      results.push(rsi);
    }
  }
  return results;
}

export function calculateBollingerBands(values: number[], period: number = 20, stdDev: number = 2) {
  const middle = calculateSMA(values, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < values.length; i++) {
    if (isNaN(middle[i])) {
      upper.push(NaN);
      lower.push(NaN);
      continue;
    }
    const slice = values.slice(i - period + 1, i + 1);
    const mean = middle[i];
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
    const sd = Math.sqrt(variance);
    upper.push(mean + stdDev * sd);
    lower.push(mean - stdDev * sd);
  }

  return { middle, upper, lower };
}

export function calculateMACD(values: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9) {
  const fastEMA = calculateEMA(values, fastPeriod);
  const slowEMA = calculateEMA(values, slowPeriod);
  const macdLine: number[] = [];

  for (let i = 0; i < values.length; i++) {
    if (isNaN(fastEMA[i]) || isNaN(slowEMA[i])) {
      macdLine.push(NaN);
    } else {
      macdLine.push(fastEMA[i] - slowEMA[i]);
    }
  }

  const signalLine = calculateEMA(macdLine.filter(v => !isNaN(v)), signalPeriod);
  const fullSignalLine: number[] = new Array(macdLine.length).fill(NaN);
  
  let signalIdx = 0;
  for (let i = 0; i < macdLine.length; i++) {
    if (!isNaN(macdLine[i])) {
      if (signalIdx < signalLine.length) {
        fullSignalLine[i] = signalLine[signalIdx];
        signalIdx++;
      }
    }
  }

  const histogram: number[] = macdLine.map((v, i) => v - fullSignalLine[i]);

  return { macdLine, signalLine: fullSignalLine, histogram };
}

export function calculateATR(highs: number[], lows: number[], closes: number[], period: number = 14): number[] {
  const tr: number[] = [NaN];
  for (let i = 1; i < closes.length; i++) {
    const hl = highs[i] - lows[i];
    const hc = Math.abs(highs[i] - closes[i - 1]);
    const lc = Math.abs(lows[i] - closes[i - 1]);
    tr.push(Math.max(hl, hc, lc));
  }

  const atr: number[] = new Array(tr.length).fill(NaN);
  let sum = 0;
  for (let i = 1; i <= period; i++) {
    sum += tr[i];
  }
  atr[period] = sum / period;

  for (let i = period + 1; i < tr.length; i++) {
    atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
  }

  return atr;
}

export function calculateStochastic(highs: number[], lows: number[], closes: number[], kPeriod: number = 14, dPeriod: number = 3) {
  const kLine: number[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i < kPeriod - 1) {
      kLine.push(NaN);
      continue;
    }
    
    const highSlice = highs.slice(i - kPeriod + 1, i + 1);
    const lowSlice = lows.slice(i - kPeriod + 1, i + 1);
    
    const highestHigh = Math.max(...highSlice);
    const lowestLow = Math.min(...lowSlice);
    
    const k = ((closes[i] - lowestLow) / (highestHigh - lowestLow)) * 100;
    kLine.push(k);
  }
  
  const dLine = calculateSMA(kLine.filter(v => !isNaN(v)), dPeriod);
  const fullDLine: number[] = new Array(kLine.length).fill(NaN);
  
  let dIdx = 0;
  for (let i = 0; i < kLine.length; i++) {
    if (!isNaN(kLine[i])) {
      if (dIdx < dLine.length) {
        fullDLine[i] = dLine[dIdx];
        dIdx++;
      }
    }
  }
  
  return { kLine, dLine: fullDLine };
}

export function calculateVWAP(candles: any[]): number[] {
  const results: number[] = [];
  let cumulativePV = 0;
  let cumulativeV = 0;

  for (let i = 0; i < candles.length; i++) {
    const typicalPrice = (candles[i].high + candles[i].low + candles[i].close) / 3;
    cumulativePV += typicalPrice * candles[i].volume;
    cumulativeV += candles[i].volume;
    results.push(cumulativePV / cumulativeV);
  }
  return results;
}

export function calculateSupertrend(highs: number[], lows: number[], closes: number[], period: number = 10, multiplier: number = 3) {
  const atr = calculateATR(highs, lows, closes, period);
  const upperBand: number[] = new Array(closes.length).fill(NaN);
  const lowerBand: number[] = new Array(closes.length).fill(NaN);
  const supertrend: number[] = new Array(closes.length).fill(NaN);
  const direction: number[] = new Array(closes.length).fill(1); // 1 for up, -1 for down

  for (let i = 0; i < closes.length; i++) {
    if (isNaN(atr[i])) continue;

    const basicUpperBand = (highs[i] + lows[i]) / 2 + multiplier * atr[i];
    const basicLowerBand = (highs[i] + lows[i]) / 2 - multiplier * atr[i];

    if (i === 0) {
      upperBand[i] = basicUpperBand;
      lowerBand[i] = basicLowerBand;
      supertrend[i] = basicLowerBand;
      continue;
    }

    upperBand[i] = (basicUpperBand < upperBand[i - 1] || closes[i - 1] > upperBand[i - 1]) ? basicUpperBand : upperBand[i - 1];
    lowerBand[i] = (basicLowerBand > lowerBand[i - 1] || closes[i - 1] < lowerBand[i - 1]) ? basicLowerBand : lowerBand[i - 1];

    if (supertrend[i - 1] === upperBand[i - 1]) {
      direction[i] = closes[i] > upperBand[i] ? 1 : -1;
    } else {
      direction[i] = closes[i] < lowerBand[i] ? -1 : 1;
    }

    supertrend[i] = direction[i] === 1 ? lowerBand[i] : upperBand[i];
  }

  return { supertrend, direction };
}

export function calculateIchimoku(highs: number[], lows: number[], closes: number[]) {
  const tenkanPeriod = 9;
  const kijunPeriod = 26;
  const senkouBPeriod = 52;
  const displacement = 26;

  const calculateHighLowAverage = (h: number[], l: number[], period: number) => {
    const result: number[] = new Array(h.length).fill(NaN);
    for (let i = period - 1; i < h.length; i++) {
      const sliceH = h.slice(i - period + 1, i + 1);
      const sliceL = l.slice(i - period + 1, i + 1);
      result[i] = (Math.max(...sliceH) + Math.min(...sliceL)) / 2;
    }
    return result;
  };

  const tenkanSen = calculateHighLowAverage(highs, lows, tenkanPeriod);
  const kijunSen = calculateHighLowAverage(highs, lows, kijunPeriod);
  
  const senkouSpanA: number[] = new Array(closes.length).fill(NaN);
  for (let i = 0; i < closes.length; i++) {
    if (!isNaN(tenkanSen[i]) && !isNaN(kijunSen[i])) {
      senkouSpanA[i] = (tenkanSen[i] + kijunSen[i]) / 2;
    }
  }

  const senkouSpanB = calculateHighLowAverage(highs, lows, senkouBPeriod);
  
  // Note: Span A and B are usually plotted 26 periods ahead. 
  // For simplicity in this chart, we'll return them as is and the chart component can handle displacement if needed, 
  // or we just plot them at current index for a "live" feel.
  
  return { tenkanSen, kijunSen, senkouSpanA, senkouSpanB };
}

export function calculateDonchian(highs: number[], lows: number[], period: number = 20) {
  const upper: number[] = new Array(highs.length).fill(NaN);
  const lower: number[] = new Array(lows.length).fill(NaN);
  const middle: number[] = new Array(highs.length).fill(NaN);

  for (let i = period - 1; i < highs.length; i++) {
    const sliceH = highs.slice(i - period + 1, i + 1);
    const sliceL = lows.slice(i - period + 1, i + 1);
    upper[i] = Math.max(...sliceH);
    lower[i] = Math.min(...sliceL);
    middle[i] = (upper[i] + lower[i]) / 2;
  }

  return { upper, lower, middle };
}
