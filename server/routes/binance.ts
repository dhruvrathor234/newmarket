import { Router } from 'express';
import crypto from 'crypto';
import { requireAuth, rateLimit } from '../middleware';

const router = Router();

router.use(requireAuth, rateLimit({ windowMs: 60_000, max: 60 }));

const VALID_SIDES = ['BUY', 'SELL'];
const VALID_TYPES = ['MARKET', 'LIMIT'];
const VALID_MODES = ['SPOT', 'FUTURES', 'MARGIN'];

const isCredential = (v: unknown, maxLen: number) =>
  typeof v === 'string' && v.trim().length > 0 && v.trim().length <= maxLen;

const signQuery = (queryString: string, secret: string): string => {
  return crypto.createHmac('sha256', secret).update(queryString).digest('hex');
};

const binanceRequest = async (baseUrl: string, endpoint: string, apiKey: string, apiSecret: string, method = 'GET', params: Record<string, string | number> = {}) => {
  const timestamp = Date.now();
  const queryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      queryParams.append(key, String(value));
    }
  }
  queryParams.append('timestamp', String(timestamp));
  queryParams.append('recvWindow', '60000');

  const queryString = queryParams.toString();
  const signature = signQuery(queryString, apiSecret);
  const fullQuery = `${queryString}&signature=${signature}`;

  let url = `${baseUrl}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      'X-MBX-APIKEY': apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };

  if (method === 'GET') {
    url += `?${fullQuery}`;
  } else {
    options.body = fullQuery;
  }

  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.msg || `Binance API error (${response.status})`);
  }
  return data;
};

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
    if (tradingMode === 'FUTURES') {
      const accountInfo = await binanceRequest('https://fapi.binance.com', '/fapi/v2/account', trimmedKey, trimmedSecret);

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
      const [accountInfo, priceList] = await Promise.all([
        binanceRequest('https://api.binance.com', '/api/v3/account', trimmedKey, trimmedSecret),
        fetch('https://api.binance.com/api/v3/ticker/price').then(r => r.json()).catch(() => []),
      ]);

      if (!accountInfo || !accountInfo.balances) {
        return res.status(500).json({ error: 'Invalid response from Binance Spot API' });
      }

      const priceMap: Record<string, string> = {};
      if (Array.isArray(priceList)) {
        for (const item of priceList) {
          if (item.symbol && item.price) priceMap[item.symbol] = item.price;
        }
      }

      const nonZero = accountInfo.balances.filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0);

      let totalEstUSDT = 0;
      const stablecoins = ['USDT', 'USDC', 'BUSD', 'FDUSD', 'TUSD', 'DAI'];

      nonZero.forEach((b: any) => {
        const amount = parseFloat(b.free) + parseFloat(b.locked);
        if (stablecoins.includes(b.asset)) {
          totalEstUSDT += amount;
        } else {
          const price = priceMap[`${b.asset}USDT`];
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
    const orderType = type || 'MARKET';
    const trimmedKey = apiKey.trim();
    const trimmedSecret = apiSecret.trim();

    if (tradingMode === 'FUTURES') {
      if (leverage) {
        try {
          await binanceRequest('https://fapi.binance.com', '/fapi/v1/leverage', trimmedKey, trimmedSecret, 'POST', { symbol, leverage });
        } catch { /* non-fatal */ }
      }
      const orderOptions: Record<string, any> = { symbol, side, quantity, type: orderType };
      if (orderType === 'LIMIT' && price) {
        orderOptions.price = price;
        orderOptions.timeInForce = 'GTC';
      }
      const order = await binanceRequest('https://fapi.binance.com', '/fapi/v1/order', trimmedKey, trimmedSecret, 'POST', orderOptions);
      res.json(order);
    } else {
      const orderOptions: Record<string, any> = { symbol, side, quantity, type: orderType };
      if (orderType === 'LIMIT' && price) {
        orderOptions.price = price;
        orderOptions.timeInForce = 'GTC';
      }
      const order = await binanceRequest('https://api.binance.com', '/api/v3/order', trimmedKey, trimmedSecret, 'POST', orderOptions);
      res.json(order);
    }
  } catch (error: any) {
    console.error('Binance order error:', error);
    res.status(500).json({ error: error.message || 'Failed to place Binance order' });
  }
});

export default router;
