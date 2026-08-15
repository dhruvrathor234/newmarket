import { apiRequest } from './apiClient';

export const binanceService = {
  async getBalance(apiKey: string, apiSecret: string, tradingMode: string) {
    const response = await apiRequest('/api/binance/balance', {
      method: 'POST',
      body: JSON.stringify({ apiKey, apiSecret, tradingMode }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to fetch balance');
    }
    const balances = await response.json();

    // Prefer the server-computed total estimate
    const totalEstimate = balances.find((b: any) => b.asset === 'TOTAL_ESTIMATE_USDT');
    if (totalEstimate) {
      return parseFloat(totalEstimate.free);
    }

    // Fallback: stablecoin-only manual calculation
    const stablecoins = ['USDT', 'USDC', 'BUSD', 'FDUSD', 'TUSD', 'DAI'];
    let total = 0;
    balances.forEach((b: any) => {
      if (stablecoins.includes(b.asset)) {
        total += (parseFloat(b.free) || 0) + (parseFloat(b.locked) || 0);
      }
    });
    return total;
  },

  async placeOrder(
    apiKey: string,
    apiSecret: string,
    symbol: string,
    side: 'BUY' | 'SELL',
    quantity: string,
    tradingMode: string,
    type: 'MARKET' | 'LIMIT' = 'MARKET',
    price?: string,
    leverage?: number,
  ) {
    const response = await apiRequest('/api/binance/order', {
      method: 'POST',
      body: JSON.stringify({ apiKey, apiSecret, symbol, side, quantity, tradingMode, type, price, leverage }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to place order');
    }
    return response.json();
  },
};
