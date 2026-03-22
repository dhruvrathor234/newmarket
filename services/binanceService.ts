
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
    // For simplicity, we'll sum up the USDT balance. 
    // In a more advanced version, we'd convert all assets to USDT using current prices.
    const usdtBalance = balances.find((b: any) => b.asset === 'USDT');
    return usdtBalance ? parseFloat(usdtBalance.free) + parseFloat(usdtBalance.locked) : 0;
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
