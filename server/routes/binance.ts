import { Router } from 'express';
import BinanceFactory from 'binance-api-node';
import { requireAuth, rateLimit } from '../middleware';

const router = Router();

router.use(requireAuth, rateLimit({ windowMs: 60_000, max: 60 }));

// Fix for ESM default import issues with binance-api-node
const Binance = (BinanceFactory as any).default || BinanceFactory;

const VALID_SIDES = ['BUY', 'SELL'];
const VALID_TYPES = ['MARKET', 'LIMIT'];
const VALID_MODES = ['SPOT', 'FUTURES', 'MARGIN'];

const isCredential = (v: unknown, maxLen: number) =>
  typeof v === 'string' && v.trim().length > 0 && v.trim().length <= maxLen;

router.post('/balance', async (req, res) => {
  const { apiKey, apiSecret, tradingMode } = req.body || {};

  if (!isCredential(apiKey, 200) || !isCredential(apiSecret, 200)) {
    return res.status(400).json({ error: 'Missing API credentials' });
  }
  if (tradingMode && !VALID_MODES.includes(tradingMode)) {
    return res.status(400).json({ error: 'Invalid trading mode' });
  }

  const trimmedKey = apiKey.trim();
  const trimmedSecret = apiSecret.trim();

  try {
    const client = Binance({
      apiKey: trimmedKey,
      apiSecret: trimmedSecret,
      useServerTime: true,
      recvWindow: 60000,
    });

    if (tradingMode === 'FUTURES') {
      const accountInfo = await client.futuresAccountInfo();

      if (!accountInfo || !accountInfo.assets) {
        return res.status(500).json({ error: 'Invalid response from Binance Futures API' });
      }

      const balances = accountInfo.assets.map((a: any) => ({
        asset: a.asset,
        free: a.availableBalance,
        locked: (parseFloat(a.walletBalance) - parseFloat(a.availableBalance)).toString(),
      }));

      const nonZero = balances.filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0);

      let totalEstUSDT = 0;
      nonZero.forEach((b: any) => {
        const original = accountInfo.assets.find((a: any) => a.asset === b.asset);
        if (original) totalEstUSDT += parseFloat(original.walletBalance);
      });

      const responseData = [...balances];
      responseData.push({ asset: 'TOTAL_ESTIMATE_USDT', free: totalEstUSDT.toString(), locked: '0' });

      res.json(responseData);
    } else {
      const [accountInfo, allPrices] = await Promise.all([client.accountInfo(), client.prices()]);

      if (!accountInfo || !accountInfo.balances) {
        return res.status(500).json({ error: 'Invalid response from Binance Spot API' });
      }

      const nonZero = accountInfo.balances.filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0);

      let totalEstUSDT = 0;
      const stablecoins = ['USDT', 'USDC', 'BUSD', 'FDUSD', 'TUSD', 'DAI'];

      nonZero.forEach((b: any) => {
        const amount = parseFloat(b.free) + parseFloat(b.locked);
        if (stablecoins.includes(b.asset)) {
          totalEstUSDT += amount;
        } else {
          const price = allPrices[`${b.asset}USDT`];
          if (price) totalEstUSDT += amount * parseFloat(price);
        }
      });

      const responseData = [...accountInfo.balances];
      responseData.push({ asset: 'TOTAL_ESTIMATE_USDT', free: totalEstUSDT.toString(), locked: '0' });

      res.json(responseData);
    }
  } catch (error: any) {
    console.error('Binance balance error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch Binance balance' });
  }
});

router.post('/order', async (req, res) => {
  const { apiKey, apiSecret, symbol, side, quantity, type, price, leverage, tradingMode } = req.body || {};

  if (!isCredential(apiKey, 200) || !isCredential(apiSecret, 200)) {
    return res.status(400).json({ error: 'Missing API credentials' });
  }
  if (typeof symbol !== 'string' || !/^[A-Z0-9]{5,20}$/.test(symbol)) {
    return res.status(400).json({ error: 'Invalid symbol' });
  }
  if (!VALID_SIDES.includes(side)) {
    return res.status(400).json({ error: 'Invalid side' });
  }
  if (typeof quantity !== 'string' || !/^\d+(\.\d+)?$/.test(quantity) || parseFloat(quantity) <= 0) {
    return res.status(400).json({ error: 'Invalid quantity' });
  }
  if (type && !VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: 'Invalid order type' });
  }
  if (type === 'LIMIT' && (typeof price !== 'string' || !/^\d+(\.\d+)?$/.test(price))) {
    return res.status(400).json({ error: 'Invalid limit price' });
  }
  if (leverage != null && (typeof leverage !== 'number' || !isFinite(leverage) || leverage < 1 || leverage > 125)) {
    return res.status(400).json({ error: 'Invalid leverage (1-125)' });
  }
  if (tradingMode && !VALID_MODES.includes(tradingMode)) {
    return res.status(400).json({ error: 'Invalid trading mode' });
  }

  try {
    const client = Binance({ apiKey: apiKey.trim(), apiSecret: apiSecret.trim(), useServerTime: true });
    const orderType = type || 'MARKET';

    if (tradingMode === 'FUTURES') {
      if (leverage) {
        try { await client.futuresLeverage({ symbol, leverage }); } catch (e) { /* non-fatal */ }
      }
      const orderOptions: any = { symbol, side, quantity, type: orderType };
      if (orderType === 'LIMIT' && price) {
        orderOptions.price = price;
        orderOptions.timeInForce = 'GTC';
      }
      const order = await client.futuresOrder(orderOptions);
      res.json(order);
    } else {
      const orderOptions: any = { symbol, side, quantity, type: orderType };
      if (orderType === 'LIMIT' && price) {
        orderOptions.price = price;
        orderOptions.timeInForce = 'GTC';
      }
      const order = await client.order(orderOptions);
      res.json(order);
    }
  } catch (error: any) {
    console.error('Binance order error:', error);
    res.status(500).json({ error: error.message || 'Failed to place Binance order' });
  }
});

export default router;
