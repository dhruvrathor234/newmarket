
import { MarketAnalysis, TradeType, Symbol, EconomicEvent, BacktestScenario } from "../types";

export const fetchEconomicEvents = async (): Promise<EconomicEvent[]> => {
  try {
    const response = await fetch("/api/ai/economic-events", { method: "POST" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Backend error");
    }
    return await response.json();
  } catch (error: any) {
    console.error("AI Calendar Fetch Failed:", error);
    throw error; // Re-throw to let UI handle it
  }
};

export const analyzeMarket = async (symbol: Symbol): Promise<MarketAnalysis> => {
  try {
    const response = await fetch("/api/ai/analyze-market", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol })
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Backend error");
    }
    const data = await response.json();
    return {
      symbol,
      timestamp: Date.now(),
      decision: data.decision || TradeType.HOLD,
      sentimentScore: data.sentimentScore || 0,
      sentimentCategory: data.sentimentCategory || 'NEUTRAL',
      reasoning: data.reasoning || "No news found.",
      sources: data.sources || [],
      strategy: 'SENTIMENT'
    };
  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    throw error;
  }
};

export const evaluateCustomLogic = async (symbol: Symbol, price: number, logic: string): Promise<MarketAnalysis> => {
  try {
    const response = await fetch("/api/ai/evaluate-logic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol, price, logic })
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Backend error");
    }
    const data = await response.json();
    return {
      symbol,
      timestamp: Date.now(),
      decision: data.decision || TradeType.HOLD,
      sentimentScore: 0,
      sentimentCategory: 'NEUTRAL',
      reasoning: data.reasoning || "Logic evaluated.",
      sources: [],
      strategy: 'CUSTOM_AI',
      customParams: data.customParams
    };
  } catch (error: any) {
    console.error("Logic processing error:", error);
    throw error;
  }
};

export const generateChatResponse = async (message: string, contextData: string, imageBase64?: string): Promise<string> => {
  try {
    const response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, contextData, imageBase64 })
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Backend error");
    }
    const data = await response.json();
    return data.text || "No response.";
  } catch (error: any) {
    console.error("AI Chat Error:", error);
    return error.message || "Error connecting to AI core.";
  }
};

export const verifyIdentityDocuments = async (frontBase64: string, backBase64: string): Promise<{ isVerified: boolean, reason: string, dob?: string }> => {
  try {
    const response = await fetch("/api/ai/verify-identity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frontBase64, backBase64 })
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Backend error");
    }
    return await response.json();
  } catch (error: any) {
    console.error("KYC AI Error:", error);
    return { isVerified: false, reason: error.message || "Internal scanning error. Please try again with clearer photos." };
  }
};

export const generateBacktestData = async (): Promise<BacktestScenario[]> => {
  try {
    const response = await fetch("/api/ai/backtest-data", { method: "POST" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Backend error");
    }
    const data = await response.json();
    return data.map((item: any) => ({
      ...item,
      simulatedPnL: 0
    }));
  } catch (error: any) {
    console.error("Backtest Generation Failed:", error);
    return [];
  }
};
