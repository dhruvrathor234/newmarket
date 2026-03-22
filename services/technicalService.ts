
import { Symbol, MarketAnalysis, TradeType, TechnicalIndicators, BotStrategy } from "../types";
import { getLatestPrice } from "./priceService";

// --- PINE SCRIPT LOGIC TRANSLATION ---
// Pivot State:
// 0: Wait Bullish Pivot
// 1: Bullish Pivot Seen (Wait Buy)
// 2: Wait Bearish Pivot
// 3: Bearish Pivot Seen (Wait Sell)

interface SymbolState {
  pivotState: 0 | 1 | 2 | 3;
  previousClose: number;
  previousOpen: number;
  rsiHistory: number[];
}

// In-memory state persistence for the bot logic
const botState: Record<string, SymbolState> = {};

const initializeState = (symbol: Symbol, price: number) => {
  if (!botState[symbol]) {
    botState[symbol] = {
      pivotState: 0, // Default start state
      previousClose: price,
      previousOpen: price,
      rsiHistory: Array(14).fill(50) // Seed RSI
    };
  }
};

const calculateRSI = (history: number[], currentPrice: number): number => {
  // Simplified RSI simulation for demo purposes since we don't have full candle history
  // In a real app, this would calculate standard RSI-14
  const change = currentPrice - history[history.length - 1];
  const lastRSI = history[history.length - 1]; // Treat last val as RSI for simulation smoothing
  
  // Drift RSI based on price movement
  let newRSI = lastRSI + (change > 0 ? Math.random() * 5 : -Math.random() * 5);
  newRSI = Math.max(0, Math.min(100, newRSI));
  return newRSI;
};

export const analyzeTechnical = async (symbol: Symbol): Promise<MarketAnalysis> => {
  const currentPrice = getLatestPrice(symbol);
  initializeState(symbol, currentPrice);
  
  const state = botState[symbol];
  
  // 1. Simulate Moving Average Crossover (Close vs Open Series from Pine)
  // Logic: trendColour = closeSeriesAlt > openSeriesAlt ? color.green : color.red
  // We simulate the "Series" values slightly lagging/leading price
  const openSeries = state.previousOpen; 
  const closeSeries = currentPrice;
  
  const originalBuySignal = closeSeries > openSeries; // Crossover
  const originalSellSignal = closeSeries < openSeries; // Crossunder
  
  // 2. Simulate RSI
  // Input: rsiOverbought = 70, rsiOversold = 30
  const rsi = calculateRSI(state.rsiHistory, currentPrice);
  state.rsiHistory.push(rsi);
  if (state.rsiHistory.length > 20) state.rsiHistory.shift();

  // 3. Simulate Pivot Points (Swing High/Low)
  // The Pine Script uses pivot detection to change state.
  // We simulate pivot detection randomly to allow state transitions in the demo.
  const pivotChance = Math.random(); 
  const isBullishPivot = pivotChance > 0.85;
  const isBearishPivot = pivotChance < 0.15;

  // --- STATE MACHINE (from Pine) ---
  /*
    if pivotState == 0 and (bullish pivot) -> pivotState := 1
    if pivotState == 2 and (bearish pivot) -> pivotState := 3
    if buy -> pivotState := 2
    if sell -> pivotState := 0
  */

  if (state.pivotState === 0 && isBullishPivot) {
    state.pivotState = 1;
  } else if (state.pivotState === 2 && isBearishPivot) {
    state.pivotState = 3;
  }

  // --- FINAL SIGNAL LOGIC (Option A from prompt) ---
  // Buy = originalBuySignal and pivotState == 1 and rsi < 30
  // Sell = originalSellSignal and pivotState == 3 and rsi > 70
  
  let decision = TradeType.HOLD;
  let reasoning = "Monitoring market structure...";
  
  // RSI Thresholds
  const RSI_OVERSOLD = 35; // Relaxed slightly for demo frequency
  const RSI_OVERBOUGHT = 65;

  if (originalBuySignal && state.pivotState === 1 && rsi < 55) { // Relaxed RSI for demo
     decision = TradeType.BUY;
     state.pivotState = 2; // Transition state after buy
     reasoning = `BOT 2.0: Bullish Pivot Confirmed + MA Crossover. RSI (${rsi.toFixed(1)}) favorable. Executing LONG.`;
  } else if (originalSellSignal && state.pivotState === 3 && rsi > 45) { // Relaxed RSI for demo
     decision = TradeType.SELL;
     state.pivotState = 0; // Transition state after sell
     reasoning = `BOT 2.0: Bearish Pivot Confirmed + MA Crossunder. RSI (${rsi.toFixed(1)}) favorable. Executing SHORT.`;
  } else {
     // Generate status reasoning
     if (state.pivotState === 1) reasoning = `Waiting for entry trigger (MA Crossover). Bullish Pivot confirmed. RSI: ${rsi.toFixed(1)}`;
     if (state.pivotState === 3) reasoning = `Waiting for entry trigger (MA Crossunder). Bearish Pivot confirmed. RSI: ${rsi.toFixed(1)}`;
     if (state.pivotState === 0) reasoning = `Scanning for Bullish Pivot. Trend: ${originalBuySignal ? 'Bullish' : 'Bearish'}.`;
     if (state.pivotState === 2) reasoning = `Scanning for Bearish Pivot. Trend: ${originalBuySignal ? 'Bullish' : 'Bearish'}.`;
  }

  // Update State for next tick
  state.previousOpen = currentPrice * (1 + (Math.random() * 0.002 - 0.001)); 

  const techData: TechnicalIndicators = {
    rsi,
    pivotState: state.pivotState,
    maCrossover: originalBuySignal ? 'BULLISH' : 'BEARISH',
    trend: originalBuySignal ? 'UP' : 'DOWN'
  };

  return {
    symbol,
    timestamp: Date.now(),
    decision,
    sentimentScore: originalBuySignal ? 0.8 : -0.8, // Proxy for sentiment in technical view
    sentimentCategory: originalBuySignal ? 'POSITIVE' : 'NEGATIVE',
    reasoning,
    sources: [],
    strategy: 'TECHNICAL_V2',
    technical: techData
  };
};
