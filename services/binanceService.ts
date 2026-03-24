
export const binanceService = {
  async getBalance(apiKey: string, apiSecret: string, tradingMode: string) {
    const response = await fetch("/api/binance/balance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey, apiSecret, tradingMode }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch balance");
    }
    const balances = await response.json();
    console.log("[Binance Service] Raw Balances:", balances);
    
    // Check if we have the total estimate from the server
    const totalEstimate = balances.find((b: any) => b.asset === 'TOTAL_ESTIMATE_USDT');
    if (totalEstimate) {
      const total = parseFloat(totalEstimate.free);
      console.log(`[Binance Service] Using Total Estimate: ${total.toFixed(4)}`);
      return total;
    }

    // Fallback to manual calculation if estimate is missing (e.g. Futures or older server)
    const stablecoins = ['USDT', 'USDC', 'BUSD', 'FDUSD', 'TUSD', 'DAI'];
    
    let total = 0;
    balances.forEach((b: any) => {
      if (stablecoins.includes(b.asset)) {
        total += (parseFloat(b.free) || 0) + (parseFloat(b.locked) || 0);
      }
    });
    
    console.log(`[Binance Service] Calculated Balance: ${total.toFixed(4)}`);
    
    return total;
  },

  async placeOrder(apiKey: string, apiSecret: string, symbol: string, side: 'BUY' | 'SELL', quantity: string, tradingMode: string, type: 'MARKET' | 'LIMIT' = 'MARKET', price?: string, leverage?: number) {
    const response = await fetch("/api/binance/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey, apiSecret, symbol, side, quantity, tradingMode, type, price, leverage }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to place order");
    }
    return response.json();
  }
};
