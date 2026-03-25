
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import BinanceFactory from 'binance-api-node';
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from 'dotenv';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import admin from 'firebase-admin';
import firebaseConfig from './firebase-applet-config.json';

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

// --- FIREBASE ADMIN SETUP ---
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}
const dbAdmin = admin.firestore();

// --- RAZORPAY SETUP ---
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_live_SVUMHcTC82q1XW',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '2fA8XWIMqjkKM8T7pJjzQUXx'
});

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

export const app = express();
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
    env: process.env.NODE_ENV,
    vercel: !!process.env.VERCEL
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
      recvWindow: 60000 
    });

    if (tradingMode === 'FUTURES') {
      console.log("[Binance] Fetching Futures Balance...");
      const accountInfo = await client.futuresAccountInfo();
      
      if (!accountInfo || !accountInfo.assets) {
        console.error("[Binance] Invalid Futures response:", accountInfo);
        return res.status(500).json({ error: "Invalid response from Binance Futures API" });
      }

      const balances = accountInfo.assets.map((a: any) => ({
        asset: a.asset,
        free: a.availableBalance,
        locked: (parseFloat(a.walletBalance) - parseFloat(a.availableBalance)).toString()
      }));
      
      const nonZero = balances.filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0);
      console.log(`[Binance] Futures Non-Zero Balances:`, JSON.stringify(nonZero));

      // Calculate total estimate for Futures
      let totalEstUSDT = 0;
      nonZero.forEach((b: any) => {
        // In futures, walletBalance is the total for that asset
        // We find the original asset in accountInfo.assets to get walletBalance
        const original = accountInfo.assets.find((a: any) => a.asset === b.asset);
        if (original) {
          totalEstUSDT += parseFloat(original.walletBalance);
        }
      });

      const responseData = [...balances];
      responseData.push({ asset: 'TOTAL_ESTIMATE_USDT', free: totalEstUSDT.toString(), locked: '0' });
      
      res.json(responseData);
    } else {
      console.log("[Binance] Fetching Spot Balance...");
      const [accountInfo, allPrices] = await Promise.all([
        client.accountInfo(),
        client.prices()
      ]);

      if (!accountInfo || !accountInfo.balances) {
        console.error("[Binance] Invalid Spot response:", accountInfo);
        return res.status(500).json({ error: "Invalid response from Binance Spot API" });
      }
      
      const nonZero = accountInfo.balances.filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0);
      console.log(`[Binance] Spot Non-Zero Balances:`, JSON.stringify(nonZero));
      
      // Calculate estimated total in USDT
      let totalEstUSDT = 0;
      const stablecoins = ['USDT', 'USDC', 'BUSD', 'FDUSD', 'TUSD', 'DAI'];
      
      nonZero.forEach((b: any) => {
        const amount = parseFloat(b.free) + parseFloat(b.locked);
        if (stablecoins.includes(b.asset)) {
          totalEstUSDT += amount;
        } else {
          // Try to find price for assetUSDT
          const price = allPrices[`${b.asset}USDT`];
          if (price) {
            totalEstUSDT += amount * parseFloat(price);
          } else if (b.asset === 'USDT') {
            totalEstUSDT += amount;
          }
        }
      });

      console.log(`[Binance] Estimated Total Balance: ${totalEstUSDT.toFixed(4)} USDT`);
      
      // We return the balances array but also include the total estimate if needed
      // Actually, let's just return the balances array as before to keep compatibility,
      // but we'll add a special 'TOTAL_ESTIMATE' entry at the end.
      const responseData = [...accountInfo.balances];
      responseData.push({ asset: 'TOTAL_ESTIMATE_USDT', free: totalEstUSDT.toString(), locked: '0' });
      
      res.json(responseData);
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
      if (leverage) {
        try { await client.futuresLeverage({ symbol, leverage }); } catch (e) {}
      }
      const orderOptions: any = { symbol, side, quantity, type: type || 'MARKET' };
      if (type === 'LIMIT' && price) {
        orderOptions.price = price.toString();
        orderOptions.timeInForce = 'GTC';
      }
      const order = await client.futuresOrder(orderOptions);
      res.json(order);
    } else {
      const orderOptions: any = { symbol, side, quantity, type: type || 'MARKET' };
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
  if (!GEMINI_API_KEY || isPlaceholder(GEMINI_API_KEY)) {
    return res.status(500).json({ error: "Neural core offline." });
  }
  const now = Date.now();
  if (cache.economicEvents.data && (now - cache.economicEvents.timestamp < cache.economicEvents.ttl)) {
    return res.json(cache.economicEvents.data);
  }
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "List the top 10 most critical global economic events for this week (USD, EUR, GBP).",
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              time: { type: Type.STRING },
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
    cache.economicEvents.data = events;
    cache.economicEvents.timestamp = now;
    res.json(events);
  } catch (error: any) {
    console.error("[Neural Core] Economic Events Error:", error);
    if (error.message?.includes("leaked")) {
      return res.status(403).json({ 
        error: "Neural core key compromised. Please update GEMINI_API_KEY in Settings.",
        details: error.message
      });
    }
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/ai/analyze-market", async (req, res) => {
  const { symbol } = req.body;
  if (!GEMINI_API_KEY || isPlaceholder(GEMINI_API_KEY)) return res.status(500).json({ error: "Offline" });
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  try {
    const response = await ai.models.generateContent({ 
      model: "gemini-3-flash-preview", 
      contents: `Analyze ${symbol} market news.`, 
      config: { tools: [{ googleSearch: {} }] } 
    });
    const text = response.text || "{}";
    const cleaned = text.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1').trim();
    const data = JSON.parse(cleaned);
    const sources = (response.candidates?.[0]?.groundingMetadata?.groundingChunks || [])
      .filter((c: any) => c.web?.uri)
      .map((c: any) => ({ title: c.web.title, url: c.web.uri }));
    res.json({ ...data, sources });
  } catch (error: any) {
    console.error("[Neural Core] Market Analysis Error:", error);
    if (error.message?.includes("leaked")) {
      return res.status(403).json({ 
        error: "Neural core key compromised. Please update GEMINI_API_KEY in Settings.",
        details: error.message
      });
    }
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/ai/evaluate-logic", async (req, res) => {
  const { symbol, price, logic } = req.body;
  if (!GEMINI_API_KEY || isPlaceholder(GEMINI_API_KEY)) return res.status(500).json({ error: "Offline" });
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  try {
    const response = await ai.models.generateContent({ 
      model: "gemini-3-flash-preview", 
      contents: `Evaluate logic: ${logic} for ${symbol} at ${price}`,
      config: { responseMimeType: "application/json" }
    });
    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("[Neural Core] Logic Evaluation Error:", error);
    if (error.message?.includes("leaked")) {
      return res.status(403).json({ 
        error: "Neural core key compromised. Please update GEMINI_API_KEY in Settings.",
        details: error.message
      });
    }
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/ai/chat", async (req, res) => {
  const { message, contextData, imageBase64 } = req.body;
  if (!GEMINI_API_KEY || isPlaceholder(GEMINI_API_KEY)) return res.status(500).json({ error: "Offline" });
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
    console.error("[Neural Core] Chat Error:", error);
    if (error.message?.includes("leaked")) {
      return res.status(403).json({ 
        error: "Neural core key compromised. Please update GEMINI_API_KEY in Settings.",
        details: error.message
      });
    }
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/ai/verify-identity", async (req, res) => {
  const { frontBase64, backBase64 } = req.body;
  if (!GEMINI_API_KEY || isPlaceholder(GEMINI_API_KEY)) return res.status(500).json({ error: "Offline" });
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: frontBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, ""), mimeType: "image/png" } },
          { inlineData: { data: backBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, ""), mimeType: "image/png" } },
          { text: "Analyze identity document." }
        ]
      },
      config: { responseMimeType: "application/json" }
    });
    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("[Neural Core] Identity Verification Error:", error);
    if (error.message?.includes("leaked")) {
      return res.status(403).json({ 
        error: "Neural core key compromised. Please update GEMINI_API_KEY in Settings.",
        details: error.message
      });
    }
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/ai/backtest-data", async (req, res) => {
  if (!GEMINI_API_KEY || isPlaceholder(GEMINI_API_KEY)) return res.status(500).json({ error: "Offline" });
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Generate 10 backtest scenarios.",
      config: { responseMimeType: "application/json" }
    });
    res.json(JSON.parse(response.text || "[]"));
  } catch (error: any) {
    console.error("[Neural Core] Backtest Data Error:", error);
    if (error.message?.includes("leaked")) {
      return res.status(403).json({ 
        error: "Neural core key compromised. Please update GEMINI_API_KEY in Settings.",
        details: error.message
      });
    }
    res.status(500).json({ error: error.message });
  }
});

// --- RAZORPAY ENDPOINTS ---

app.post("/api/razorpay/create-order", async (req, res) => {
  try {
    const options = {
      amount: 100, // ₹1 in paise
      currency: "INR",
      receipt: "order_rcptid_" + Date.now()
    };

    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error: any) {
    console.error("Razorpay order error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/razorpay/verify-payment", async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || '2fA8XWIMqjkKM8T7pJjzQUXx')
    .update(body)
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    try {
      // Update Firebase user stats
      const userStatsRef = dbAdmin.collection('user_stats').doc(userId);
      const userStatsDoc = await userStatsRef.get();

      const now = new Date();
      const expiry = new Date();
      expiry.setDate(now.getDate() + 30);

      if (userStatsDoc.exists) {
        await userStatsRef.update({
          subscriptionActive: true,
          subscriptionExpiry: expiry.toISOString(),
          lastUpdated: now.toISOString()
        });
      } else {
        // Should not happen if trial was set up on signup, but handle just in case
        await userStatsRef.set({
          userId,
          totalProfit: 0,
          totalFeesOwed: 0,
          totalFeesPaid: 0,
          amountOwed: 0,
          isLocked: false,
          subscriptionActive: true,
          subscriptionExpiry: expiry.toISOString(),
          trialStart: now.toISOString(),
          trialEnd: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          lastUpdated: now.toISOString()
        });
      }

      res.json({ status: "success" });
    } catch (error: any) {
      console.error("Firebase update error:", error);
      res.status(500).json({ error: "Payment verified but failed to update subscription status" });
    }
  } else {
    res.status(400).json({ status: "failed" });
  }
});

app.post("/api/subscription/start-trial", async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    const userStatsRef = dbAdmin.collection('user_stats').doc(userId);
    const userStatsDoc = await userStatsRef.get();

    const now = new Date();
    const trialEnd = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    if (userStatsDoc.exists) {
      const data = userStatsDoc.data();
      // Only allow starting trial if it hasn't been started before (trialStart is in the past or null)
      // Or if the user explicitly wants to start it now.
      // The user said "as soon as they click free trial".
      
      await userStatsRef.update({
        trialStart: now.toISOString(),
        trialEnd: trialEnd.toISOString(),
        lastUpdated: now.toISOString()
      });
    } else {
      await userStatsRef.set({
        userId,
        totalProfit: 0,
        totalFeesOwed: 0,
        totalFeesPaid: 0,
        amountOwed: 0,
        isLocked: false,
        subscriptionActive: false,
        trialStart: now.toISOString(),
        trialEnd: trialEnd.toISOString(),
        lastUpdated: now.toISOString()
      });
    }
    res.json({ status: "success", trialEnd: trialEnd.toISOString() });
  } catch (error: any) {
    console.error("Trial start error:", error);
    res.status(500).json({ error: error.message });
  }
});

// --- VITE MIDDLEWARE ---

async function setupVite() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
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
}

setupVite();

if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
