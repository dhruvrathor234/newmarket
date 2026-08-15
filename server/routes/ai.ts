import { Router } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { GEMINI_API_KEY, isPlaceholder, CACHE_TTL, ALLOW_MOCK_VERIFICATION } from '../config';
import { requireAuth, rateLimit } from '../middleware';

const router = Router();

// All AI routes require a valid Supabase session and are rate limited
// to protect the shared Gemini quota from abuse.
router.use(requireAuth, rateLimit({ windowMs: 60_000, max: 120 }));

const AI_MODEL = 'gemini-flash-latest';
const AI_MODEL_INTELLIGENCE = 'gemini-3.5-flash';

const isAiAvailable = () => !!GEMINI_API_KEY && !isPlaceholder(GEMINI_API_KEY);

const ai = () => new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const withRetry = async (fn: () => Promise<any>, retries = 3, delay = 2000) => {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const isQuotaError = error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED');
      if (i < retries && isQuotaError) {
        console.warn(`[Neural Core] Quota hit, retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await new Promise(res => setTimeout(res, delay));
        delay *= 2;
        continue;
      }
      throw error;
    }
  }
};

// --- IN-MEMORY CACHE ---
const cache: Record<string, { data: any; timestamp: number; ttl: number }> = {
  economicEvents: { data: null, timestamp: 0, ttl: CACHE_TTL.economicEvents },
  marketAnalysis: { data: {} as Record<string, { data: any; timestamp: number }>, timestamp: 0, ttl: CACHE_TTL.marketAnalysis },
  chat: { data: {} as Record<string, { data: any; timestamp: number }>, timestamp: 0, ttl: CACHE_TTL.chat },
};

const stripImages = (base64: string | undefined): string =>
  (base64 || '').replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

const isLeakError = (message: string | undefined) => !!message?.includes('leaked');

const sendAiError = (res: any, error: any) => {
  console.error('[Neural Core] Error:', error);
  if (isLeakError(error.message)) {
    return res.status(403).json({
      error: 'Neural core key compromised. Please update the API key in the server environment.',
      details: error.message,
    });
  }
  res.status(error.message?.includes('429') ? 429 : 500).json({ error: error.message });
};

router.get('/economic-events', async (req, res) => {
  const now = Date.now();
  if (cache.economicEvents.data && now - cache.economicEvents.timestamp < cache.economicEvents.ttl) {
    return res.json(cache.economicEvents.data);
  }
  if (!isAiAvailable()) return res.status(500).json({ error: 'Neural core offline.' });

  try {
    const response = await withRetry(() => ai().models.generateContent({
      model: AI_MODEL,
      contents: 'List the top 10 most critical global economic events for this week (USD, EUR, GBP).',
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              time: { type: Type.STRING },
              currency: { type: Type.STRING },
              event: { type: Type.STRING },
              impact: { type: Type.STRING, enum: ['HIGH', 'MEDIUM', 'LOW'] },
              forecast: { type: Type.STRING },
              previous: { type: Type.STRING },
            },
            required: ['time', 'currency', 'event', 'impact', 'forecast', 'previous'],
          },
        },
      },
    }));
    const events = JSON.parse(response.text || '[]');
    cache.economicEvents.data = events;
    cache.economicEvents.timestamp = now;
    res.json(events);
  } catch (error: any) {
    sendAiError(res, error);
  }
});

router.post('/analyze-market', async (req, res) => {
  const { symbol } = req.body || {};
  if (!isAiAvailable()) return res.status(500).json({ error: 'Offline' });
  if (typeof symbol !== 'string' || !/^[A-Z0-9]{4,10}$/.test(symbol)) {
    return res.status(400).json({ error: 'Invalid symbol.' });
  }

  const now = Date.now();
  const symbolCache = cache.marketAnalysis.data[symbol];
  if (symbolCache && now - symbolCache.timestamp < cache.marketAnalysis.ttl) {
    return res.json(symbolCache.data);
  }

  try {
    const response = await withRetry(() => ai().models.generateContent({
      model: AI_MODEL,
      contents: `Analyze ${symbol} market news and sentiment. Provide technical and fundamental insights.`,
      config: { tools: [{ googleSearch: {} }] },
    }));
    const text = response.text || '{}';
    const cleaned = text.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1').trim();
    const data = JSON.parse(cleaned);
    const sources = (response.candidates?.[0]?.groundingMetadata?.groundingChunks || [])
      .filter((c: any) => c.web?.uri)
      .map((c: any) => ({ title: c.web.title, url: c.web.uri }));

    const result = { ...data, sources };
    cache.marketAnalysis.data[symbol] = { data: result, timestamp: now };
    res.json(result);
  } catch (error: any) {
    sendAiError(res, error);
  }
});

router.post('/evaluate-logic', async (req, res) => {
  const { symbol, price, logic } = req.body || {};
  if (!isAiAvailable()) return res.status(500).json({ error: 'Offline' });
  if (typeof symbol !== 'string' || !/^[A-Z0-9]{4,10}$/.test(symbol)) {
    return res.status(400).json({ error: 'Invalid symbol.' });
  }
  if (typeof logic !== 'string' || logic.length > 2000) {
    return res.status(400).json({ error: 'Invalid logic (max 2000 chars).' });
  }
  if (typeof price !== 'number' || !isFinite(price)) {
    return res.status(400).json({ error: 'Invalid price.' });
  }

  try {
    const response = await withRetry(() => ai().models.generateContent({
      model: AI_MODEL,
      contents: `Evaluate logic: ${logic} for ${symbol} at ${price}`,
      config: { responseMimeType: 'application/json' },
    }));
    res.json(JSON.parse(response.text || '{}'));
  } catch (error: any) {
    sendAiError(res, error);
  }
});

router.post('/chat', async (req, res) => {
  const { message, contextData, imageBase64 } = req.body || {};
  if (!isAiAvailable()) return res.status(500).json({ error: 'Offline' });
  if (typeof message !== 'string' || message.length > 20000) {
    return res.status(400).json({ error: 'Invalid message (max 20000 chars).' });
  }
  if (typeof contextData !== 'string' || contextData.length > 50000) {
    return res.status(400).json({ error: 'Invalid context (max 50000 chars).' });
  }
  if (imageBase64 && (typeof imageBase64 !== 'string' || imageBase64.length > 8_000_000)) {
    return res.status(400).json({ error: 'Image too large.' });
  }

  const parts: any[] = [];
  if (imageBase64) {
    parts.push({ inlineData: { data: stripImages(imageBase64), mimeType: 'image/png' } });
  }
  parts.push({ text: `Context: ${contextData}\n\nUser: ${message}` });

  try {
    const response = await withRetry(() => ai().models.generateContent({
      model: AI_MODEL,
      contents: { parts },
      config: { tools: [{ googleSearch: {} }] },
    }));
    res.json({ text: response.text || 'No response.' });
  } catch (error: any) {
    sendAiError(res, error);
  }
});

router.post('/verify-identity', async (req, res) => {
  const { frontBase64, backBase64 } = req.body || {};
  if (!isAiAvailable()) return res.status(500).json({ error: 'Offline' });
  if (!frontBase64 || !backBase64 || frontBase64.length > 8_000_000 || backBase64.length > 8_000_000) {
    return res.status(400).json({ error: 'Invalid identity document images.' });
  }

  try {
    const response = await withRetry(() => ai().models.generateContent({
      model: AI_MODEL,
      contents: {
        parts: [
          { inlineData: { data: stripImages(frontBase64), mimeType: 'image/png' } },
          { inlineData: { data: stripImages(backBase64), mimeType: 'image/png' } },
          { text: 'Analyze identity document.' },
        ],
      },
      config: { responseMimeType: 'application/json' },
    }));
    res.json(JSON.parse(response.text || '{}'));
  } catch (error: any) {
    sendAiError(res, error);
  }
});

router.post('/backtest-data', async (req, res) => {
  if (!isAiAvailable()) return res.status(500).json({ error: 'Offline' });
  try {
    const response = await ai().models.generateContent({
      model: AI_MODEL,
      contents: 'Generate 10 backtest scenarios.',
      config: { responseMimeType: 'application/json' },
    });
    res.json(JSON.parse(response.text || '[]'));
  } catch (error: any) {
    sendAiError(res, error);
  }
});

// Deep technical AI analysis with candle data (previously ran client-side with the
// Gemini key baked into the bundle — moved here so the key never ships to the browser).
router.post('/analyze-intelligence', async (req, res) => {
  const { symbol, candles, timeframe } = req.body || {};
  if (!isAiAvailable()) return res.status(500).json({ error: 'Offline' });
  if (typeof symbol !== 'string' || !/^[A-Z0-9]{4,10}$/.test(symbol)) {
    return res.status(400).json({ error: 'Invalid symbol.' });
  }
  if (!Array.isArray(candles) || candles.length > 200) {
    return res.status(400).json({ error: 'Invalid candle data (max 200).' });
  }
  if (typeof timeframe !== 'string' || timeframe.length > 10) {
    return res.status(400).json({ error: 'Invalid timeframe.' });
  }

  const candleData = candles.slice(-50).map((c: any) => ({
    t: new Date(c.time).toISOString(),
    o: c.open,
    h: c.high,
    l: c.low,
    c: c.close,
    v: c.volume,
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

  try {
    const response = await withRetry(() => ai().models.generateContent({
      model: AI_MODEL_INTELLIGENCE,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            decision: { type: Type.STRING, enum: ['BUY', 'SELL', 'HOLD'] },
            sentimentScore: { type: Type.NUMBER, description: '0 to 100' },
            sentimentCategory: { type: Type.STRING, enum: ['POSITIVE', 'NEGATIVE', 'NEUTRAL'] },
            reasoning: { type: Type.STRING },
            suggestedSL: { type: Type.NUMBER },
            suggestedTP: { type: Type.NUMBER },
            technical: {
              type: Type.OBJECT,
              properties: {
                rsi: { type: Type.NUMBER },
                trend: { type: Type.STRING, enum: ['UP', 'DOWN', 'SIDEWAYS'] },
              },
            },
          },
          required: ['decision', 'sentimentScore', 'sentimentCategory', 'reasoning'],
        },
      },
    }));

    res.json(JSON.parse(response.text || '{}'));
  } catch (error: any) {
    sendAiError(res, error);
  }
});

// Backtest signal generation (previously ran client-side with the Gemini key in the bundle).
router.post('/backtest-signals', async (req, res) => {
  const { strategy, candles, logic } = req.body || {};
  if (!isAiAvailable()) return res.status(500).json({ error: 'Offline' });
  if (typeof strategy !== 'string' || strategy.length > 50) {
    return res.status(400).json({ error: 'Invalid strategy.' });
  }
  if (!Array.isArray(candles) || candles.length > 2000) {
    return res.status(400).json({ error: 'Invalid candle data (max 2000).' });
  }
  if (logic && (typeof logic !== 'string' || logic.length > 2000)) {
    return res.status(400).json({ error: 'Invalid logic (max 2000 chars).' });
  }

  const sampledCandles = candles.filter((_, i) => i % 5 === 0);

  const prompt = `
    You are a professional quantitative trading backtester.
    Analyze the following historical candle data and the strategy logic provided.
    Generate a list of BUY and SELL signals based on the strategy.

    Strategy: ${strategy}
    Description/Logic: "${logic || 'Follow the user\'s custom trading rules.'}"

    Candle Data (Sampled every 5th candle):
    ${JSON.stringify(sampledCandles.map((c: any) => ({ t: c.time, o: c.open, h: c.high, l: c.low, c: c.close })))}

    Return the signals in JSON format as an array of objects:
    [{ "time": timestamp_in_seconds, "type": "BUY" | "SELL" }]

    IMPORTANT:
    - Only return signals that clearly match the strategy.
    - Do not return too many signals; quality over quantity.
    - Ensure the timestamps match the provided candle data.
  `;

  try {
    const response = await withRetry(() => ai().models.generateContent({
      model: AI_MODEL_INTELLIGENCE,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              time: { type: Type.NUMBER },
              type: { type: Type.STRING, enum: ['BUY', 'SELL'] },
            },
            required: ['time', 'type'],
          },
        },
      },
    }));

    res.json(JSON.parse(response.text || '[]'));
  } catch (error: any) {
    sendAiError(res, error);
  }
});

export default router;
