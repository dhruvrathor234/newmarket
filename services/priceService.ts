
import { Symbol, MarketDetails, Candle } from '../types';
import { ASSETS } from '../constants';

// --- ULTRA-HIGH PERFORMANCE MEMORY BUFFER ---
const candleCache: Record<string, Candle[]> = {};
const priceCache: Record<string, any> = {};

// Initialize basic price cache with static defaults
(Object.keys(ASSETS) as Symbol[]).forEach(sym => {
  const initial = ASSETS[sym].INITIAL_PRICE;
  priceCache[sym] = {
    price: initial,
    high: initial * 1.005,
    low: initial * 0.995,
    volume: Math.floor(Math.random() * 100000),
    openPrice: initial,
    initialized: false
  };
});

let ws: WebSocket | null = null;
const cryptoSymbolMap: Record<string, Symbol> = {
    'btcusdt': 'BTCUSD', 'ethusdt': 'ETHUSD', 'solusdt': 'SOLUSD',
    'dogeusdt': 'DOGEUSD', 'xrpusdt': 'XRPUSD', 'adausdt': 'ADAUSD',
    'avaxusdt': 'AVAXUSD', 'dotusdt': 'DOTUSD', 'linkusdt': 'LINKUSD',
    'ltcusdt': 'LTCUSD', 'paxgusdt': 'XAUUSD'
};

const binanceSymbolMap: Partial<Record<Symbol, string>> = {
  BTCUSD: 'BTCUSDT', ETHUSD: 'ETHUSDT', SOLUSD: 'SOLUSDT', DOGEUSD: 'DOGEUSDT', XRPUSD: 'XRPUSDT',
  ADAUSD: 'ADAUSDT', AVAXUSD: 'AVAXUSDT', DOTUSD: 'DOTUSDT', LINKUSD: 'LINKUSDT', LTCUSD: 'LTCUSDT', XAUUSD: 'PAXGUSDT'
};

// --- LIVE CANDLE SUBSCRIPTION SYSTEM ---
type CandleCallback = (candle: Candle) => void;
const candleSubscribers: Record<string, Set<CandleCallback>> = {};

const notifySubscribers = (symbol: Symbol, interval: string, candle: Candle) => {
    const key = `${symbol}_${interval}`;
    if (candleSubscribers[key]) {
        candleSubscribers[key].forEach(cb => cb(candle));
    }
};

let klineWs: WebSocket | null = null;
const activeKlineStreams = new Set<string>();

const connectKlineStream = (symbol: Symbol, interval: string) => {
    const binanceSymbol = binanceSymbolMap[symbol]?.toLowerCase();
    if (!binanceSymbol) {
        // Mock live updates for non-binance assets
        startMockLiveUpdates(symbol, interval);
        return;
    }

    const streamName = `${binanceSymbol}@kline_${interval}`;
    if (activeKlineStreams.has(streamName)) return;
    activeKlineStreams.add(streamName);

    // If we already have a klineWs, we might need to reconnect with new streams or use a separate one
    // For simplicity, let's just use one WS and manage streams if possible, or just open new ones
    const wsUrl = `wss://stream.binance.com:9443/ws/${streamName}`;
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.e === 'kline') {
            const k = msg.k;
            const candle: Candle = {
                time: k.t,
                open: parseFloat(k.o),
                high: parseFloat(k.h),
                low: parseFloat(k.l),
                close: parseFloat(k.c),
                volume: parseFloat(k.v)
            };
            notifySubscribers(symbol, interval, candle);
            
            // Also update price cache
            if (priceCache[symbol]) {
                priceCache[symbol].price = candle.close;
                priceCache[symbol].initialized = true;
            }
        }
    };

    socket.onclose = () => {
        activeKlineStreams.delete(streamName);
        setTimeout(() => connectKlineStream(symbol, interval), 5000);
    };
};

const mockIntervals: Record<string, any> = {};
const startMockLiveUpdates = (symbol: Symbol, interval: string) => {
    const key = `${symbol}_${interval}`;
    if (mockIntervals[key]) return;

    mockIntervals[key] = setInterval(() => {
        const lastCandles = candleCache[key];
        if (!lastCandles || lastCandles.length === 0) return;

        const lastCandle = lastCandles[lastCandles.length - 1];
        const multipliers: Record<string, number> = { '1m': 60, '5m': 300, '15m': 900, '1h': 3600, '4h': 14400, '1d': 86400 };
        const step = (multipliers[interval] || 900) * 1000;
        
        const now = Date.now();
        const candleStartTime = Math.floor(now / step) * step;
        
        let currentCandle: Candle;
        
        if (lastCandle.time === candleStartTime) {
            // Update existing candle
            const volatility = lastCandle.close * 0.0002;
            const change = (Math.random() - 0.5) * volatility;
            const newClose = lastCandle.close + change;
            currentCandle = {
                ...lastCandle,
                close: newClose,
                high: Math.max(lastCandle.high, newClose),
                low: Math.min(lastCandle.low, newClose),
                volume: lastCandle.volume + Math.random() * 10
            };
            lastCandles[lastCandles.length - 1] = currentCandle;
        } else {
            // Start new candle
            currentCandle = {
                time: candleStartTime,
                open: lastCandle.close,
                high: lastCandle.close,
                low: lastCandle.close,
                close: lastCandle.close,
                volume: Math.random() * 10
            };
            lastCandles.push(currentCandle);
            if (lastCandles.length > 2000) lastCandles.shift();
        }
        
        notifySubscribers(symbol, interval, currentCandle);
        if (priceCache[symbol]) priceCache[symbol].price = currentCandle.close;
    }, 200); // 200ms for "smooth" feel
};

export const subscribeToCandleUpdates = (symbol: Symbol, interval: string, callback: CandleCallback) => {
    const key = `${symbol}_${interval}`;
    if (!candleSubscribers[key]) {
        candleSubscribers[key] = new Set();
        connectKlineStream(symbol, interval);
    }
    candleSubscribers[key].add(callback);
    
    return () => {
        candleSubscribers[key].delete(callback);
    };
};

const connectCryptoStream = () => {
    if (ws) return;
    const streams = Object.keys(cryptoSymbolMap).map(s => `${s}@ticker`).join('/');
    ws = new WebSocket(`wss://stream.binance.com:9443/ws/${streams}`);
    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.s) {
            const targetSymbol = cryptoSymbolMap[message.s.toLowerCase()];
            if (targetSymbol && priceCache[targetSymbol]) {
                priceCache[targetSymbol].price = parseFloat(message.c);
                priceCache[targetSymbol].high = parseFloat(message.h);
                priceCache[targetSymbol].low = parseFloat(message.l);
                priceCache[targetSymbol].volume = parseFloat(message.v);
                priceCache[targetSymbol].openPrice = parseFloat(message.o);
                priceCache[targetSymbol].initialized = true;
            }
        }
    };
    ws.onclose = () => { ws = null; setTimeout(connectCryptoStream, 5000); };
};

connectCryptoStream();

export const getLatestPrice = (symbol: Symbol): number => priceCache[symbol]?.price || ASSETS[symbol].INITIAL_PRICE;

export const getMarketDetails = (symbol: Symbol): MarketDetails => {
   const data = priceCache[symbol];
   const asset = ASSETS[symbol];
   const bid = data.price - (asset.SPREAD / 2);
   const ask = data.price + (asset.SPREAD / 2);
   const change24hPercent = data.openPrice !== 0 ? ((data.price - data.openPrice) / data.openPrice) * 100 : 0;
   return { price: data.price, bid, ask, high: data.high, low: data.low, volume: data.volume, change24h: data.price - data.openPrice, change24hPercent, category: asset.CATEGORY };
};

const generateMockCandles = (symbol: Symbol, interval: string, limit: number): Candle[] => {
    const candles: Candle[] = [];
    let price = getLatestPrice(symbol) || ASSETS[symbol].INITIAL_PRICE;
    const now = Date.now();
    const multipliers: Record<string, number> = { '1m': 60, '5m': 300, '15m': 900, '1h': 3600, '4h': 14400, '1d': 86400 };
    const step = (multipliers[interval] || 900) * 1000;
    const volatility = price * 0.001;

    for (let i = limit; i > 0; i--) {
        const change = (Math.random() - 0.5) * volatility;
        const o = price;
        const c = price + change;
        candles.push({
            time: now - (i * step), open: o, high: Math.max(o, c) + Math.random()*volatility*0.2,
            low: Math.min(o, c) - Math.random()*volatility*0.2, close: c, volume: Math.random()*500
        });
        price = c;
    }
    return candles;
};

/**
 * SYNCHRONOUS GETTER
 * Returns cached data immediately if available. Used for "nanosecond" chart loads.
 */
export const getCachedCandlesSync = (symbol: Symbol, interval: string): Candle[] | null => {
    const key = `${symbol}_${interval}`;
    return candleCache[key] || null;
};

/**
 * FAST FETCH ENGINE
 */
export const fetchCandles = async (symbol: Symbol, interval: string = '15m', limit: number = 1000): Promise<Candle[]> => {
    const key = `${symbol}_${interval}`;
    
    // Check memory first
    if (candleCache[key]) {
        // Return instantly, fetch fresh in background
        fetchFreshCandles(symbol, interval, limit, key);
        return [...candleCache[key]];
    }

    return fetchFreshCandles(symbol, interval, limit, key);
};

const fetchFreshCandles = async (symbol: Symbol, interval: string, limit: number, key: string): Promise<Candle[]> => {
    const binanceSymbol = binanceSymbolMap[symbol];
    let candles: Candle[];
    
    if (!binanceSymbol) {
        if (symbol === 'XAUUSD') console.log(`[PriceService Debug] No Binance symbol for XAUUSD, generating mock candles`);
        candles = generateMockCandles(symbol, interval, limit);
    } else {
        try {
            if (symbol === 'XAUUSD') console.log(`[PriceService Debug] Fetching candles for XAUUSD using Binance symbol: ${binanceSymbol} (${interval})`);
            const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`);
            if (!res.ok) {
                if (symbol === 'XAUUSD') console.error(`[PriceService Debug] Binance fetch failed for XAUUSD: ${res.status} ${res.statusText}`);
                throw new Error();
            }
            const data = await res.json();
            if (symbol === 'XAUUSD') console.log(`[PriceService Debug] Received ${data.length} candles for XAUUSD from Binance`);
            candles = data.map((d: any) => ({
                time: d[0], 
                open: parseFloat(d[1]), 
                high: parseFloat(d[2]),
                low: parseFloat(d[3]), 
                close: parseFloat(d[4]), 
                volume: parseFloat(d[5])
            }));
        } catch (e) {
            candles = generateMockCandles(symbol, interval, limit);
        }
    }
    
    candleCache[key] = candles;
    return candles;
};

/**
 * AGGRESSIVE PRE-SEEDER
 */
const preseedCache = async () => {
    const intervals = ['1m', '5m', '15m', '1h', '4h', '1d'];
    const priority: Symbol[] = ['XAUUSD', 'BTCUSD', 'ETHUSD', 'SOLUSD'];
    const allSymbols = Object.keys(ASSETS) as Symbol[];
    
    // Immediate Priority
    for (const sym of priority) {
        for (const tf of intervals) {
            fetchFreshCandles(sym, tf, 1000, `${sym}_${tf}`);
        }
    }

    // Secondary background fill
    setTimeout(() => {
        allSymbols.forEach(sym => {
            if (!priority.includes(sym)) {
                intervals.forEach(tf => fetchFreshCandles(sym, tf, 1000, `${sym}_${tf}`));
            }
        });
    }, 1500);
};

preseedCache();
