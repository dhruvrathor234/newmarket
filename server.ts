
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import BinanceFactory from 'binance-api-node';
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config({ override: true });

// Fix for ESM default import issues with binance-api-node
const Binance = (BinanceFactory as any).default || BinanceFactory;

// Prioritize user-provided GEMINI_API_KEY from .env or Settings
// Fallback to API_KEY only if it looks like a real key (not a placeholder)
const getGeminiKey = () => {
  const envKey = process.env.GEMINI_API_KEY;
  const platformKey = process.env.API_KEY;
  
  const isPlaceholder = (key: string | undefined) => {
    if (!key) return true;
    const placeholders = ['YOUR_KEY_HERE', 'YOUR_API_KEY', 'PASTE_KEY_HERE', 'TODO', 'GEMINI_API_KEY'];
    return placeholders.some(p => key.toUpperCase().includes(p.toUpperCase()));
  };

  if (envKey && !isPlaceholder(envKey)) return envKey;
  if (platformKey && !isPlaceholder(platformKey)) return platformKey;
  
  return envKey || platformKey || "";
};

const GEMINI_API_KEY = getGeminiKey();

// --- IN-MEMORY CACHE ---
const cache = {
  economicEvents: {
    data: null as any,
    timestamp: 0,
    ttl: 1000 * 60 * 60 // 1 hour
  }
};

const isPlaceholder = (key: string | undefined) => {
  if (!key) return true;
  const placeholders = ['YOUR_KEY_HERE', 'YOUR_API_KEY', 'PASTE_KEY_HERE', 'TODO', 'GEMINI_API_KEY'];
  return placeholders.some(p => key.toUpperCase().includes(p.toUpperCase()));
};

if (GEMINI_API_KEY && !isPlaceholder(GEMINI_API_KEY)) {
  console.log(`[Neural Core] API Key detected. Prefix: ${GEMINI_API_KEY.substring(0, 4)}... (Length: ${GEMINI_API_KEY.length})`);
} else {
  console.warn("[Neural Core] No valid API Key found. Please set GEMINI_API_KEY in the Settings menu or .env file.");
  if (process.env.GEMINI_API_KEY) console.warn(`[Neural Core] GEMINI_API_KEY exists but might be a placeholder: ${process.env.GEMINI_API_KEY.substring(0, 4)}...`);
  if (process.env.API_KEY) console.warn(`[Neural Core] API_KEY exists but might be a placeholder: ${process.env.API_KEY.substring(0, 4)}...`);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- HEALTH CHECK ---
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      ai: {
        keyDetected: !!GEMINI_API_KEY,
        keyLength: GEMINI_API_KEY?.length || 0,
        isPlaceholder: isPlaceholder(GEMINI_API_KEY)
      },
      env: process.env.NODE_ENV
    });
  });

  // --- BINANCE API ENDPOINTS ---

  app.post("/api/binance/balance", async (req, res) => {
    const { apiKey, apiSecret, tradingMode } = req.body;
    
    const trimmedKey = apiKey?.toString().trim();
    const trimmedSecret = apiSecret?.toString().trim();

    if (!trimmedKey || !trimmedSecret) {
      return res.status(400).json({ error: "Missing API credentials" });
    }

    try {
      const client = Binance({ 
        apiKey: trimmedKey, 
        apiSecret: trimmedSecret, 
        useServerTime: true,
        recvWindow: 60000 // Increase receive window for laggy connections
      });

      if (tradingMode === 'FUTURES') {
        console.log("[Binance] Fetching Futures Balance for key:", trimmedKey.substring(0, 6) + "...");
        const accountInfo = await client.futuresAccountInfo();
        
        if (!accountInfo || !accountInfo.assets) {
          console.error("[Binance] Invalid Futures account info response:", accountInfo);
          return res.status(500).json({ error: "Invalid response from Binance Futures API" });
        }

        // Map futures assets to common balance format
        const balances = accountInfo.assets.map((a: any) => ({
          asset: a.asset,
          free: a.availableBalance,
          locked: (parseFloat(a.walletBalance) - parseFloat(a.availableBalance)).toString()
        }));
        
        const usdt = balances.find((b: any) => b.asset === 'USDT');
        console.log(`[Binance] Futures USDT Balance: ${usdt ? usdt.free : 'Not found'}`);
        
        res.json(balances);
      } else {
        console.log("[Binance] Fetching Spot Balance for key:", trimmedKey.substring(0, 6) + "...");
        const accountInfo = await client.accountInfo();
        
        if (!accountInfo || !accountInfo.balances) {
          console.error("[Binance] Invalid Spot account info response:", accountInfo);
          return res.status(500).json({ error: "Invalid response from Binance Spot API" });
        }

        const usdt = accountInfo.balances.find((b: any) => b.asset === 'USDT');
        console.log(`[Binance] Spot USDT Balance: ${usdt ? usdt.free : 'Not found'}`);
        
        res.json(accountInfo.balances);
      }
    } catch (error: any) {
      console.error("Binance balance error:", error);
      res.status(500).json({ 
        error: error.message || "Failed to fetch Binance balance",
        code: error.code,
        details: error.toString()
      });
    }
  });

  app.post("/api/binance/order", async (req, res) => {
    const { apiKey, apiSecret, symbol, side, quantity, type, price, leverage, tradingMode } = req.body;
    if (!apiKey || !apiSecret || !symbol || !side || !quantity) {
      return res.status(400).json({ error: "Missing order parameters" });
    }

    try {
      const client = Binance({ apiKey, apiSecret, useServerTime: true });
      if (tradingMode === 'FUTURES') {
        console.log(`[Binance] Placing Futures ${side} Order for ${symbol}...`);
        // Set leverage if provided
        if (leverage) {
          try {
            await client.futuresLeverage({ symbol, leverage });
          } catch (e) {
            console.warn("Failed to set leverage, might already be set or symbol doesn't support it:", e);
          }
        }

        const orderOptions: any = {
          symbol,
          side,
          quantity,
          type: type || 'MARKET',
        };
        if (type === 'LIMIT' && price) {
          orderOptions.price = price.toString();
          orderOptions.timeInForce = 'GTC';
        }
        const order = await client.futuresOrder(orderOptions);
        res.json(order);
      } else {
        const orderOptions: any = {
          symbol,
          side,
          quantity,
          type: type || 'MARKET',
        };
        if (type === 'LIMIT' && price) {
          orderOptions.price = price.toString();
          orderOptions.timeInForce = 'GTC';
        }
        const order = await client.order(orderOptions);
        res.json(order);
      }
    } catch (error: any) {
      console.error("Binance order error:", error);
      res.status(500).json({ error: error.message || "Failed to place Binance order" });
    }
  });

  // --- GEMINI AI ENDPOINTS ---

  app.post("/api/ai/economic-events", async (req, res) => {
    if (!GEMINI_API_KEY || GEMINI_API_KEY.length < 10 || isPlaceholder(GEMINI_API_KEY)) {
      return res.status(500).json({ error: "Neural core offline. Please provide a valid GEMINI_API_KEY in the Settings menu." });
    }

    // Check Cache
    const now = Date.now();
    if (cache.economicEvents.data && (now - cache.economicEvents.timestamp < cache.economicEvents.ttl)) {
      console.log("[Neural Core] Serving economic events from cache.");
      return res.json(cache.economicEvents.data);
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "List the top 10 most critical global economic events for this week (USD, EUR, GBP). Focus on High Impact data like CPI, Rates, or NFP.",
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                time: { type: Type.STRING, description: "Format: Day HH:MM (e.g., Wed 14:30)" },
                currency: { type: Type.STRING },
                event: { type: Type.STRING },
                impact: { type: Type.STRING, enum: ["HIGH", "MEDIUM", "LOW"] },
                forecast: { type: Type.STRING },
                previous: { type: Type.STRING }
              },
              required: ["time", "currency", "event", "impact", "forecast", "previous"]
            }
          }
        },
      });
      
      const events = JSON.parse(response.text || "[]");
      
      // Update Cache
      cache.economicEvents.data = events;
      cache.economicEvents.timestamp = now;
      
      res.json(events);
    } catch (error: any) {
      console.error("AI Calendar Fetch Failed Full Error:", JSON.stringify(error, null, 2));
      console.error("AI Calendar Fetch Failed Message:", error.message);
      
      const errorMessage = error.message || "";
      
      // Handle Quota Error (429)
      if (errorMessage.includes("quota") || errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
        // If we have stale cache, serve it as a fallback
        if (cache.economicEvents.data) {
          console.warn("[Neural Core] Quota exceeded. Serving stale cache as fallback.");
          return res.json(cache.economicEvents.data);
        }
        return res.status(429).json({ 
          error: "AI Quota exceeded. The neural core is cooling down. Please try again in an hour or use a different API key." 
        });
      }

      if (errorMessage.includes("API key not valid") || errorMessage.includes("API_KEY_INVALID")) {
        return res.status(401).json({ error: "Invalid API Key. Please update your GEMINI_API_KEY in the Settings menu." });
      }
      res.status(500).json({ error: "Failed to fetch economic events: " + (error.message || "Backend error") });
    }
  });

  app.post("/api/ai/analyze-market", async (req, res) => {
    const { symbol } = req.body;
    if (!GEMINI_API_KEY || GEMINI_API_KEY.length < 10 || isPlaceholder(GEMINI_API_KEY)) {
      return res.status(500).json({ error: "Neural core offline. Please provide a valid GEMINI_API_KEY in the Settings menu." });
    }
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const prompt = `Perform a high-precision market analysis for ${symbol} based on real-time global news, economic reports (inflation, interest rates), and geopolitical events. 
    Respond ONLY with a JSON object:
    {
      "decision": "BUY" | "SELL" | "HOLD",
      "sentimentScore": number (between 0.0 and 1.0),
      "sentimentCategory": "POSITIVE" | "NEGATIVE" | "NEUTRAL",
      "reasoning": "A concise explanation of the most relevant news found"
    }`;
    try {
      const response = await ai.models.generateContent({ 
        model: "gemini-3-flash-preview", 
        contents: prompt, 
        config: { tools: [{ googleSearch: {} }] } 
      });
      const text = response.text || "{}";
      const cleaned = text.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1').trim();
      const data = JSON.parse(cleaned);
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = groundingChunks
        .filter((c: any) => c.web?.uri)
        .map((c: any) => ({ title: c.web.title || "Market News Source", url: c.web.uri }));
      res.json({ ...data, sources });
    } catch (error: any) {
      console.error("AI Analysis Error:", error);
      const errorMessage = error.message || "";
      
      if (errorMessage.includes("quota") || errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
        return res.status(429).json({ 
          error: "AI Quota exceeded. The market analysis core is cooling down. Please try again later." 
        });
      }

      if (errorMessage.includes("API key not valid") || errorMessage.includes("API_KEY_INVALID")) {
        return res.status(401).json({ error: "Invalid API Key. Please update your GEMINI_API_KEY in the Settings menu." });
      }
      res.status(500).json({ error: "Failed to analyze market: " + (error.message || "Backend error") });
    }
  });

  app.post("/api/ai/evaluate-logic", async (req, res) => {
    const { symbol, price, logic } = req.body;
    if (!GEMINI_API_KEY || GEMINI_API_KEY.length < 10 || isPlaceholder(GEMINI_API_KEY)) {
      return res.status(500).json({ error: "Neural core offline. Please provide a valid GEMINI_API_KEY in the Settings menu." });
    }
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const prompt = `You are a Trading Logic Runtime. Evaluate a user's custom trading logic against current market data.
    User Symbol: ${symbol}
    Current Price: ${price}
    User Logic: "${logic}"
    Respond ONLY with a JSON object:
    {
      "decision": "BUY" | "SELL" | "HOLD",
      "reasoning": "Explain why the logic was or wasn't triggered based on current data",
      "customParams": { "lotSize": number, "stopLoss": number, "takeProfit": number }
    }`;
    try {
      const response = await ai.models.generateContent({ 
        model: "gemini-3-flash-preview", 
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      res.json(JSON.parse(response.text || "{}"));
    } catch (error: any) {
      console.error("Logic processing error:", error);
      const errorMessage = error.message || "";
      
      if (errorMessage.includes("quota") || errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
        return res.status(429).json({ 
          error: "AI Quota exceeded. Logic evaluation is temporarily unavailable." 
        });
      }

      if (errorMessage.includes("API key not valid") || errorMessage.includes("API_KEY_INVALID")) {
        return res.status(401).json({ error: "Invalid API Key. Please update your GEMINI_API_KEY in the Settings menu." });
      }
      res.status(500).json({ error: "Failed to evaluate logic: " + (error.message || "Backend error") });
    }
  });

  app.post("/api/ai/chat", async (req, res) => {
    const { message, contextData, imageBase64 } = req.body;
    if (!GEMINI_API_KEY || GEMINI_API_KEY.length < 10 || isPlaceholder(GEMINI_API_KEY)) {
      return res.status(500).json({ error: "Neural core offline. Please provide a valid GEMINI_API_KEY in the Settings menu." });
    }
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const parts: any[] = [];
    if (imageBase64) parts.push({ inlineData: { data: imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, ""), mimeType: "image/png" } });
    parts.push({ text: `Context: ${contextData}\n\nUser: ${message}` });
    try {
      const response = await ai.models.generateContent({ 
        model: "gemini-3-flash-preview", 
        contents: { parts }, 
        config: { tools: [{ googleSearch: {} }] } 
      });
      res.json({ text: response.text || "No response." });
    } catch (error: any) {
      console.error("AI Chat Error:", error);
      const errorMessage = error.message || "";
      
      if (errorMessage.includes("quota") || errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
        return res.status(429).json({ 
          error: "AI Quota exceeded. The chat assistant is resting. Please try again in a few minutes." 
        });
      }

      if (errorMessage.includes("API key not valid") || errorMessage.includes("API_KEY_INVALID")) {
        return res.status(401).json({ error: "Invalid API Key. Please update your GEMINI_API_KEY in the Settings menu." });
      }
      res.status(500).json({ error: "Failed to connect to AI core: " + (error.message || "Backend error") });
    }
  });

  app.post("/api/ai/verify-identity", async (req, res) => {
    const { frontBase64, backBase64 } = req.body;
    if (!GEMINI_API_KEY || GEMINI_API_KEY.length < 10 || isPlaceholder(GEMINI_API_KEY)) {
      return res.status(500).json({ error: "Neural core offline. Please provide a valid GEMINI_API_KEY in the Settings menu." });
    }
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const prompt = `Analyze these two identity document images (front and back). 
    Extract the Date of Birth (DOB). The current date is ${new Date().toLocaleDateString()}.
    RULES: 1. User MUST be 18 years or older. 2. If DOB missing, reject. 3. If under 18, reject.
    Return ONLY a JSON object: { "isVerified": boolean, "reason": string, "dob": "YYYY-MM-DD" }`;
    try {
      const frontData = frontBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
      const backData = backBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { data: frontData, mimeType: "image/png" } },
            { inlineData: { data: backData, mimeType: "image/png" } },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isVerified: { type: Type.BOOLEAN },
              reason: { type: Type.STRING },
              dob: { type: Type.STRING }
            },
            required: ["isVerified", "reason"]
          }
        }
      });
      res.json(JSON.parse(response.text || "{}"));
    } catch (error: any) {
      console.error("KYC AI Error:", error);
      const errorMessage = error.message || "";
      if (errorMessage.includes("API key not valid") || errorMessage.includes("API_KEY_INVALID")) {
        return res.status(401).json({ error: "Invalid API Key. Please update your GEMINI_API_KEY in the Settings menu." });
      }
      res.status(500).json({ error: "Internal scanning error: " + (error.message || "Backend error") });
    }
  });

  app.post("/api/ai/backtest-data", async (req, res) => {
    if (!GEMINI_API_KEY || GEMINI_API_KEY.length < 10 || isPlaceholder(GEMINI_API_KEY)) {
      return res.status(500).json({ error: "Neural core offline. Please provide a valid GEMINI_API_KEY in the Settings menu." });
    }
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const prompt = `Generate 10 hypothetical historical market news scenarios for backtesting a trading strategy.
    Each scenario needs a unique ID, a date, a news headline, a sentiment (POSITIVE, NEGATIVE, or NEUTRAL), and a price change value.
    Return as a JSON array of objects.`;
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
                id: { type: Type.STRING },
                date: { type: Type.STRING },
                headline: { type: Type.STRING },
                sentiment: { type: Type.STRING, enum: ["POSITIVE", "NEGATIVE", "NEUTRAL"] },
                priceChange: { type: Type.NUMBER },
              },
              required: ["id", "date", "headline", "sentiment", "priceChange"]
            }
          }
        },
      });
      res.json(JSON.parse(response.text || "[]"));
    } catch (error: any) {
      console.error("Backtest Generation Failed:", error);
      const errorMessage = error.message || "";
      if (errorMessage.includes("API key not valid") || errorMessage.includes("API_KEY_INVALID")) {
        return res.status(401).json({ error: "Invalid API Key. Please update your GEMINI_API_KEY in the Settings menu." });
      }
      res.status(500).json({ error: "Failed to generate backtest data: " + (error.message || "Backend error") });
    }
  });

  // --- VITE MIDDLEWARE ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
