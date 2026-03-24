
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
    
    // We'll look for USDT or USDC as common stablecoins
    const usdtBalance = balances.find((b: any) => b.asset === 'USDT');
    const usdcBalance = balances.find((b: any) => b.asset === 'USDC');
    
    let total = 0;
    if (usdtBalance) {
      total += (parseFloat(usdtBalance.free) || 0) + (parseFloat(usdtBalance.locked) || 0);
    }
    if (usdcBalance) {
      total += (parseFloat(usdcBalance.free) || 0) + (parseFloat(usdcBalance.locked) || 0);
    }
    
    console.log(`[Binance Service] Calculated Balance: ${total} (USDT: ${usdtBalance?.free || 0}, USDC: ${usdcBalance?.free || 0})`);
    
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
