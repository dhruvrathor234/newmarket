
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode, IChartApi, ISeriesApi, LineStyle, IPriceLine } from 'lightweight-charts';
import { Symbol, Trade, ChartMarker } from '../types';
import { fetchCandles, getCachedCandlesSync, subscribeToCandleUpdates } from '../services/priceService';
import { ASSETS } from '../constants';
import { X, Timer } from 'lucide-react';
import { calculateEMA, calculateSMA, calculateRSI, calculateBollingerBands, calculateMACD, calculateATR, calculateStochastic, calculateVWAP, calculateSupertrend, calculateIchimoku, calculateDonchian } from '../services/indicatorService';

interface CandlestickChartProps {
  symbol: Symbol;
  currentPrice: number;
  timeframe: string;
  trades?: Trade[];
  markers?: ChartMarker[];
  onUpdateTrade?: (id: string, sl: number, tp: number) => void;
  indicators?: string[];
}

const CandlestickChart: React.FC<CandlestickChartProps> = ({ 
  symbol, 
  currentPrice, 
  timeframe, 
  trades = [], 
  markers = [], 
  onUpdateTrade,
  indicators = ['VOLUME', 'EMA']
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  
  // Indicator Series Refs
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const smaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbUpperRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbMiddleRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbLowerRef = useRef<ISeriesApi<"Line"> | null>(null);
  const macdLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const macdSignalRef = useRef<ISeriesApi<"Line"> | null>(null);
  const macdHistRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const atrSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const stochKRef = useRef<ISeriesApi<"Line"> | null>(null);
  const stochDRef = useRef<ISeriesApi<"Line"> | null>(null);
  const vwapSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const supertrendSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ichimokuTenkanRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ichimokuKijunRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ichimokuSpanARef = useRef<ISeriesApi<"Line"> | null>(null);
  const ichimokuSpanBRef = useRef<ISeriesApi<"Line"> | null>(null);
  const donchianUpperRef = useRef<ISeriesApi<"Line"> | null>(null);
  const donchianMiddleRef = useRef<ISeriesApi<"Line"> | null>(null);
  const donchianLowerRef = useRef<ISeriesApi<"Line"> | null>(null);

  const isFirstLoad = useRef(true);
  const currentCandlesRef = useRef<any[]>([]);
  
  const [dragTarget, setDragTarget] = useState<{ id: string, type: 'SL' | 'TP', price: number } | null>(null);
  const [pendingModify, setPendingModify] = useState<{ trade: Trade, type: 'SL' | 'TP', newPrice: number } | null>(null);
  const [countdown, setCountdown] = useState<string>('');
  const [timerY, setTimerY] = useState<number | null>(null);
  const [timerColor, setTimerColor] = useState<string>('#3b82f6');
  const priceLinesRef = useRef<Record<string, IPriceLine>>({});

  // 1. Chart Instance Lifecycle
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    
    const chart = createChart(containerRef.current, {
      layout: { 
        background: { type: ColorType.Solid, color: '#0b0c10' }, 
        textColor: '#64748b',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 10,
      },
      grid: { 
        vertLines: { color: 'rgba(255, 255, 255, 0.02)' }, 
        horzLines: { color: 'rgba(255, 255, 255, 0.02)' } 
      },
      width: containerRef.current.clientWidth || 800,
      height: containerRef.current.clientHeight || 500,
      crosshair: { 
        mode: CrosshairMode.Normal,
        vertLine: { color: '#3b82f6', width: 1, style: LineStyle.Dashed },
        horzLine: { color: '#3b82f6', width: 1, style: LineStyle.Dashed },
      },
      timeScale: { 
        borderColor: 'rgba(255, 255, 255, 0.05)', 
        timeVisible: true,
        rightOffset: 12,
        barSpacing: 10,
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
        scaleMargins: { top: 0.1, bottom: 0.2 },
        autoScale: true,
      },
    });

    const series = chart.addCandlestickSeries({ 
        upColor: '#10b981', 
        downColor: '#ef4444', 
        borderVisible: false, 
        wickUpColor: '#10b981', 
        wickDownColor: '#ef4444' 
    });

    // Initialize all indicator series (hidden by default)
    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: '', // overlay
      visible: false,
    });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    const emaSeries = chart.addLineSeries({ color: '#3b82f6', lineWidth: 2, priceLineVisible: false, lastValueVisible: false, visible: false });
    const smaSeries = chart.addLineSeries({ color: '#f59e0b', lineWidth: 2, priceLineVisible: false, lastValueVisible: false, visible: false });
    
    // RSI in separate pane
    const rsiSeries = chart.addLineSeries({ 
      color: '#8b5cf6', 
      lineWidth: 2, 
      priceLineVisible: false, 
      lastValueVisible: true, 
      visible: false,
      priceScaleId: 'rsi-scale'
    });
    chart.priceScale('rsi-scale').applyOptions({
      scaleMargins: { top: 0.7, bottom: 0.1 },
      borderColor: 'rgba(255, 255, 255, 0.05)',
    });

    const bbUpper = chart.addLineSeries({ color: 'rgba(59, 130, 246, 0.3)', lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false, visible: false });
    const bbMiddle = chart.addLineSeries({ color: 'rgba(59, 130, 246, 0.5)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, visible: false });
    const bbLower = chart.addLineSeries({ color: 'rgba(59, 130, 246, 0.3)', lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false, visible: false });
    
    // MACD in separate pane
    const macdLine = chart.addLineSeries({ color: '#2962FF', lineWidth: 2, priceLineVisible: false, lastValueVisible: false, visible: false, priceScaleId: 'macd-scale' });
    const macdSignal = chart.addLineSeries({ color: '#FF6D00', lineWidth: 2, priceLineVisible: false, lastValueVisible: false, visible: false, priceScaleId: 'macd-scale' });
    const macdHist = chart.addHistogramSeries({ priceScaleId: 'macd-scale', visible: false });
    
    chart.priceScale('macd-scale').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
      borderColor: 'rgba(255, 255, 255, 0.05)',
    });

    // ATR in separate pane
    const atrSeries = chart.addLineSeries({ color: '#f44336', lineWidth: 2, priceLineVisible: false, lastValueVisible: false, visible: false, priceScaleId: 'atr-scale' });
    chart.priceScale('atr-scale').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
      borderColor: 'rgba(255, 255, 255, 0.05)',
    });

    // Stochastic in separate pane
    const stochK = chart.addLineSeries({ color: '#2196F3', lineWidth: 2, priceLineVisible: false, lastValueVisible: false, visible: false, priceScaleId: 'stoch-scale' });
    const stochD = chart.addLineSeries({ color: '#FF9800', lineWidth: 2, priceLineVisible: false, lastValueVisible: false, visible: false, priceScaleId: 'stoch-scale' });
    chart.priceScale('stoch-scale').applyOptions({
      scaleMargins: { top: 0.75, bottom: 0.05 },
      borderColor: 'rgba(255, 255, 255, 0.05)',
    });

    // VWAP & Supertrend on main chart
    const vwapSeries = chart.addLineSeries({ color: '#ffeb3b', lineWidth: 2, priceLineVisible: false, lastValueVisible: false, visible: false });
    const supertrendSeries = chart.addLineSeries({ color: '#00e676', lineWidth: 2, priceLineVisible: false, lastValueVisible: false, visible: false });

    // Ichimoku
    const tenkan = chart.addLineSeries({ color: '#0496ff', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, visible: false });
    const kijun = chart.addLineSeries({ color: '#99154e', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, visible: false });
    const spanA = chart.addLineSeries({ color: 'rgba(0, 255, 0, 0.2)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, visible: false });
    const spanB = chart.addLineSeries({ color: 'rgba(255, 0, 0, 0.2)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, visible: false });

    // Donchian
    const dUpper = chart.addLineSeries({ color: 'rgba(255, 255, 255, 0.2)', lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false, visible: false });
    const dMiddle = chart.addLineSeries({ color: 'rgba(255, 255, 255, 0.1)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, visible: false });
    const dLower = chart.addLineSeries({ color: 'rgba(255, 255, 255, 0.2)', lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false, visible: false });

    chartRef.current = chart;
    seriesRef.current = series;
    volumeSeriesRef.current = volumeSeries;
    emaSeriesRef.current = emaSeries;
    smaSeriesRef.current = smaSeries;
    rsiSeriesRef.current = rsiSeries;
    bbUpperRef.current = bbUpper;
    bbMiddleRef.current = bbMiddle;
    bbLowerRef.current = bbLower;
    macdLineRef.current = macdLine;
    macdSignalRef.current = macdSignal;
    macdHistRef.current = macdHist;
    atrSeriesRef.current = atrSeries;
    stochKRef.current = stochK;
    stochDRef.current = stochD;
    vwapSeriesRef.current = vwapSeries;
    supertrendSeriesRef.current = supertrendSeries;
    ichimokuTenkanRef.current = tenkan;
    ichimokuKijunRef.current = kijun;
    ichimokuSpanARef.current = spanA;
    ichimokuSpanBRef.current = spanB;
    donchianUpperRef.current = dUpper;
    donchianMiddleRef.current = dMiddle;
    donchianLowerRef.current = dLower;

    const resizeObserver = new ResizeObserver(entries => {
      if (entries.length === 0 || !chartRef.current || !containerRef.current) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        chartRef.current.applyOptions({ width, height });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => { 
        resizeObserver.disconnect();
        chart.remove(); 
    };
  }, []);

  // 2. Data Management
  useLayoutEffect(() => {
    if (!seriesRef.current || !chartRef.current) return;
    
    const updateAllData = (candles: any[]) => {
      currentCandlesRef.current = candles;
      const times = candles.map(c => (c.time / 1000) as any);
      const closes = candles.map(c => c.close);

      // Main Series
      seriesRef.current?.setData(candles.map(c => ({ 
        time: (c.time / 1000) as any, 
        open: c.open, high: c.high, low: c.low, close: c.close 
      })));

      // Volume
      volumeSeriesRef.current?.setData(candles.map(c => ({
        time: (c.time / 1000) as any,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'
      })));

      // EMA 20
      const emaValues = calculateEMA(closes, 20);
      emaSeriesRef.current?.setData(emaValues.map((v, i) => ({ time: times[i], value: v })).filter(d => !isNaN(d.value)));

      // SMA 50
      const smaValues = calculateSMA(closes, 50);
      smaSeriesRef.current?.setData(smaValues.map((v, i) => ({ time: times[i], value: v })).filter(d => !isNaN(d.value)));

      // RSI 14
      const rsiValues = calculateRSI(closes, 14);
      rsiSeriesRef.current?.setData(rsiValues.map((v, i) => ({ time: times[i], value: v })).filter(d => !isNaN(d.value)));

      // Bollinger Bands
      const bb = calculateBollingerBands(closes, 20, 2);
      bbUpperRef.current?.setData(bb.upper.map((v, i) => ({ time: times[i], value: v })).filter(d => !isNaN(d.value)));
      bbMiddleRef.current?.setData(bb.middle.map((v, i) => ({ time: times[i], value: v })).filter(d => !isNaN(d.value)));
      bbLowerRef.current?.setData(bb.lower.map((v, i) => ({ time: times[i], value: v })).filter(d => !isNaN(d.value)));

      // MACD
      const macd = calculateMACD(closes);
      macdLineRef.current?.setData(macd.macdLine.map((v, i) => ({ time: times[i], value: v })).filter(d => !isNaN(d.value)));
      macdSignalRef.current?.setData(macd.signalLine.map((v, i) => ({ time: times[i], value: v })).filter(d => !isNaN(d.value)));
      macdHistRef.current?.setData(macd.histogram.map((v, i) => ({ 
        time: times[i], 
        value: v,
        color: v >= 0 ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'
      })).filter(d => !isNaN(d.value)));

      // ATR
      const highs = candles.map(c => c.high);
      const lows = candles.map(c => c.low);
      const atr = calculateATR(highs, lows, closes);
      atrSeriesRef.current?.setData(atr.map((v, i) => ({ time: times[i], value: v })).filter(d => !isNaN(d.value)));

      // Stochastic
      const stoch = calculateStochastic(highs, lows, closes);
      stochKRef.current?.setData(stoch.kLine.map((v, i) => ({ time: times[i], value: v })).filter(d => !isNaN(d.value)));
      stochDRef.current?.setData(stoch.dLine.map((v, i) => ({ time: times[i], value: v })).filter(d => !isNaN(d.value)));

      // VWAP
      const vwap = calculateVWAP(candles);
      vwapSeriesRef.current?.setData(vwap.map((v, i) => ({ time: times[i], value: v })).filter(d => !isNaN(d.value)));

      // Supertrend
      const supertrend = calculateSupertrend(highs, lows, closes);
      supertrendSeriesRef.current?.setData(supertrend.supertrend.map((v, i) => ({ time: times[i], value: v })).filter(d => !isNaN(d.value)));

      // Ichimoku
      const ichimoku = calculateIchimoku(highs, lows, closes);
      ichimokuTenkanRef.current?.setData(ichimoku.tenkanSen.map((v, i) => ({ time: times[i], value: v })).filter(d => !isNaN(d.value)));
      ichimokuKijunRef.current?.setData(ichimoku.kijunSen.map((v, i) => ({ time: times[i], value: v })).filter(d => !isNaN(d.value)));
      ichimokuSpanARef.current?.setData(ichimoku.senkouSpanA.map((v, i) => ({ time: times[i], value: v })).filter(d => !isNaN(d.value)));
      ichimokuSpanBRef.current?.setData(ichimoku.senkouSpanB.map((v, i) => ({ time: times[i], value: v })).filter(d => !isNaN(d.value)));

      // Donchian
      const donchian = calculateDonchian(highs, lows);
      donchianUpperRef.current?.setData(donchian.upper.map((v, i) => ({ time: times[i], value: v })).filter(d => !isNaN(d.value)));
      donchianMiddleRef.current?.setData(donchian.middle.map((v, i) => ({ time: times[i], value: v })).filter(d => !isNaN(d.value)));
      donchianLowerRef.current?.setData(donchian.lower.map((v, i) => ({ time: times[i], value: v })).filter(d => !isNaN(d.value)));

      if (isFirstLoad.current) {
        chartRef.current?.timeScale().fitContent();
        isFirstLoad.current = false;
      }
    };

    const syncData = getCachedCandlesSync(symbol, timeframe);
    if (syncData) updateAllData(syncData);

    fetchCandles(symbol, timeframe as any, 1000).then(candles => {
        updateAllData(candles);
    });

    // 2.1 Live Subscription
    const unsubscribe = subscribeToCandleUpdates(symbol, timeframe, (liveCandle) => {
      if (!seriesRef.current || !chartRef.current) return;

      const time = (liveCandle.time / 1000) as any;
      
      // Update Main Series
      seriesRef.current.update({
        time,
        open: liveCandle.open,
        high: liveCandle.high,
        low: liveCandle.low,
        close: liveCandle.close
      });

      // Update Volume
      volumeSeriesRef.current?.update({
        time,
        value: liveCandle.volume,
        color: liveCandle.close >= liveCandle.open ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'
      });

      // Update Indicators (Recalculate with the new live bar)
      // For performance, we only update if it's the same bar or a new one
      // In a real app, we'd only recalculate the last N bars. 
      // Here we'll just update the currentCandlesRef and trigger a partial update if needed,
      // but for "nano-second" feel, we just update the series directly if possible.
      // However, indicators depend on previous bars. 
      // Simple approach: append/update currentCandlesRef and recalculate last values.
      const lastIdx = currentCandlesRef.current.length - 1;
      if (lastIdx >= 0) {
        if (currentCandlesRef.current[lastIdx].time === liveCandle.time) {
          currentCandlesRef.current[lastIdx] = liveCandle;
        } else {
          currentCandlesRef.current.push(liveCandle);
          if (currentCandlesRef.current.length > 2000) currentCandlesRef.current.shift();
        }
      }

      // Update indicators that are visible
      const closes = currentCandlesRef.current.map(c => c.close);
      const highs = currentCandlesRef.current.map(c => c.high);
      const lows = currentCandlesRef.current.map(c => c.low);

      if (indicators.includes('EMA')) {
        const ema = calculateEMA(closes, 20);
        emaSeriesRef.current?.update({ time, value: ema[ema.length - 1] });
      }
      if (indicators.includes('SMA')) {
        const sma = calculateSMA(closes, 50);
        smaSeriesRef.current?.update({ time, value: sma[sma.length - 1] });
      }
      if (indicators.includes('VWAP')) {
        const vwap = calculateVWAP(currentCandlesRef.current);
        vwapSeriesRef.current?.update({ time, value: vwap[vwap.length - 1] });
      }
      // ... other indicators could be updated similarly if needed for real-time precision
    });

    return () => {
      unsubscribe();
    };
  }, [symbol, timeframe, indicators]);

  // 2.2 Countdown Timer
  useEffect(() => {
    const intervalMap: Record<string, number> = {
      '1m': 60, '5m': 300, '15m': 900, '1h': 3600, '4h': 14400, '1d': 86400
    };
    const seconds = intervalMap[timeframe] || 900;

    const updateTimer = () => {
      const now = Date.now();
      const candleDurationMs = seconds * 1000;
      const nextCandleTime = Math.ceil(now / candleDurationMs) * candleDurationMs;
      const diff = nextCandleTime - now;

      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);

      let timeStr = '';
      if (h > 0) timeStr += `${h}:`;
      timeStr += `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      setCountdown(timeStr);
    };

    const timerId = setInterval(updateTimer, 1000);
    updateTimer();

    return () => clearInterval(timerId);
  }, [timeframe]);

  // 2.3 Dynamic Timer Position & Color
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return;

    const updatePosition = () => {
      if (!seriesRef.current) return;
      const y = seriesRef.current.priceToCoordinate(currentPrice);
      setTimerY(y);

      const lastCandle = currentCandlesRef.current[currentCandlesRef.current.length - 1];
      if (lastCandle) {
        setTimerColor(currentPrice >= lastCandle.open ? '#10b981' : '#ef4444');
      }
    };

    updatePosition();
    chartRef.current.timeScale().subscribeVisibleLogicalRangeChange(updatePosition);
    
    // Also need to handle price scale changes (zoom/pan on Y axis)
    // Lightweight charts doesn't have a direct "onPriceScaleChange" but visibleLogicalRangeChange 
    // often fires during these interactions. For extra safety, we can use a small interval or 
    // rely on the fact that currentPrice updates will trigger this effect anyway.

    return () => {
      chartRef.current?.timeScale().unsubscribeVisibleLogicalRangeChange(updatePosition);
    };
  }, [currentPrice, symbol, timeframe]);

  // 3. Indicator Visibility
  useEffect(() => {
    volumeSeriesRef.current?.applyOptions({ visible: indicators.includes('VOLUME') });
    emaSeriesRef.current?.applyOptions({ visible: indicators.includes('EMA') });
    smaSeriesRef.current?.applyOptions({ visible: indicators.includes('SMA') });
    rsiSeriesRef.current?.applyOptions({ visible: indicators.includes('RSI') });
    const bbVisible = indicators.includes('BB');
    bbUpperRef.current?.applyOptions({ visible: bbVisible });
    bbMiddleRef.current?.applyOptions({ visible: bbVisible });
    bbLowerRef.current?.applyOptions({ visible: bbVisible });

    const macdVisible = indicators.includes('MACD');
    macdLineRef.current?.applyOptions({ visible: macdVisible });
    macdSignalRef.current?.applyOptions({ visible: macdVisible });
    macdHistRef.current?.applyOptions({ visible: macdVisible });

    atrSeriesRef.current?.applyOptions({ visible: indicators.includes('ATR') });

    const stochVisible = indicators.includes('STOCH');
    stochKRef.current?.applyOptions({ visible: stochVisible });
    stochDRef.current?.applyOptions({ visible: stochVisible });

    vwapSeriesRef.current?.applyOptions({ visible: indicators.includes('VWAP') });
    supertrendSeriesRef.current?.applyOptions({ visible: indicators.includes('SUPERTREND') });

    const ichimokuVisible = indicators.includes('ICHIMOKU');
    ichimokuTenkanRef.current?.applyOptions({ visible: ichimokuVisible });
    ichimokuKijunRef.current?.applyOptions({ visible: ichimokuVisible });
    ichimokuSpanARef.current?.applyOptions({ visible: ichimokuVisible });
    ichimokuSpanBRef.current?.applyOptions({ visible: ichimokuVisible });

    const donchianVisible = indicators.includes('DONCHIAN');
    donchianUpperRef.current?.applyOptions({ visible: donchianVisible });
    donchianMiddleRef.current?.applyOptions({ visible: donchianVisible });
    donchianLowerRef.current?.applyOptions({ visible: donchianVisible });
  }, [indicators]);

  // 3. Markers Overlay
  useEffect(() => {
    if (!seriesRef.current) return;
    seriesRef.current.setMarkers(markers);
  }, [markers]);

  // 4. Trade Lines Overlay
  useEffect(() => {
    if (!seriesRef.current) return;
    Object.values(priceLinesRef.current).forEach(line => {
        try { seriesRef.current?.removePriceLine(line); } catch (e) {}
    });
    priceLinesRef.current = {};

    trades.filter(t => t.symbol === symbol && t.status === 'OPEN').forEach(t => {
        const slPrice = (dragTarget?.id === t.id && dragTarget?.type === 'SL') ? dragTarget.price : t.stopLoss;
        const tpPrice = (dragTarget?.id === t.id && dragTarget?.type === 'TP') ? dragTarget.price : t.takeProfit;

        priceLinesRef.current[`${t.id}_entry`] = seriesRef.current!.createPriceLine({ 
            price: t.entryPrice, 
            color: '#3b82f6', 
            lineWidth: 2, 
            title: `${t.type} ${t.lotSize}`,
            axisLabelVisible: true,
        });
        
        if (t.stopLoss) {
            priceLinesRef.current[`${t.id}_sl`] = seriesRef.current!.createPriceLine({ 
                price: slPrice, 
                color: '#ef4444', 
                lineWidth: 1, 
                lineStyle: LineStyle.Dashed, 
                title: 'SL',
                axisLabelVisible: true,
            });
        }
        if (t.takeProfit) {
            priceLinesRef.current[`${t.id}_tp`] = seriesRef.current!.createPriceLine({ 
                price: tpPrice || 0, 
                color: '#10b981', 
                lineWidth: 1, 
                lineStyle: LineStyle.Dashed, 
                title: 'TP',
                axisLabelVisible: true,
            });
        }
    });
  }, [trades, symbol, dragTarget]);

  return (
    <div className="h-full w-full relative select-none overflow-hidden">
        <div ref={containerRef} className="h-full w-full" />
        
        {/* Live Price & Timer Label (TradingView Style) */}
        {timerY !== null && timerY > 0 && timerY < (containerRef.current?.clientHeight || 0) && (
          <div 
            className="absolute right-0 z-50 flex items-center transition-all duration-100 ease-out pointer-events-none"
            style={{ top: timerY, transform: 'translateY(-50%)' }}
          >
            {/* Timer Box */}
            <div 
              className="px-1.5 py-0.5 text-[9px] font-mono font-bold text-white rounded-l shadow-lg backdrop-blur-sm border-y border-l border-white/10"
              style={{ backgroundColor: timerColor, opacity: 0.9 }}
            >
              {countdown}
            </div>
            {/* Price Box */}
            <div 
              className="px-2 py-0.5 text-[10px] font-black text-white shadow-lg border-y border-white/20"
              style={{ backgroundColor: timerColor }}
            >
              {currentPrice.toFixed(ASSETS[symbol].DECIMALS || 2)}
            </div>
          </div>
        )}

        {pendingModify && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] z-[500] animate-fade-in">
                <div className="glass-panel border-blue-500/20 bg-[#121418] rounded-xl overflow-hidden shadow-2xl border border-blue-500/10">
                    <div className="p-4 border-b border-white/5 flex items-center justify-between">
                        <span className="text-[11px] font-black text-white uppercase tracking-widest">Modify Order</span>
                        <button onClick={() => setPendingModify(null)} className="text-slate-500 hover:text-white"><X size={16}/></button>
                    </div>
                    <div className="p-6 space-y-6 text-center">
                        <div className="flex flex-col">
                            <span className="text-[9px] text-zinc-500 uppercase font-black">{pendingModify.type === 'SL' ? 'Stop Loss' : 'Take Profit'}</span>
                            <span className="text-xl font-mono font-bold text-white">{pendingModify.newPrice.toFixed(2)}</span>
                        </div>
                        <button 
                          onClick={() => { onUpdateTrade?.(pendingModify.trade.id, pendingModify.type === 'SL' ? pendingModify.newPrice : pendingModify.trade.stopLoss, pendingModify.type === 'TP' ? pendingModify.newPrice : (pendingModify.trade.takeProfit || 0)); setPendingModify(null); }}
                          className="w-full py-4 bg-blue-600 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-lg hover:bg-blue-500 shadow-xl shadow-blue-500/10 transition-all active:scale-[0.98]"
                        >
                            Confirm Update
                        </button>
                    </div>
                </div>
            </div>
        )}
        {/* Removed old static price/timer boxes */}
    </div>
  );
};

export default CandlestickChart;
