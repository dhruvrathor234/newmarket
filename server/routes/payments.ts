import { Router, Request } from 'express';
import {
  ETHERSCAN_API_KEY,
  PAYMENT_ETH_ADDRESS,
  ALLOW_MOCK_VERIFICATION,
  CASHFREE_API_KEY,
  CASHFREE_SECRET_KEY,
  CASHFREE_BASE_URL,
  CASHFREE_API_VERSION,
} from '../config';
import { requireAuth, rateLimit } from '../middleware';
import { getSupabaseServer } from '../supabase';

type AuthedRequest = Request & { userId?: string };

// Subscription plans (INR) — server-side whitelist so clients can't tamper with the amount.
// Each plan maps to a billing cycle; the server uses it to compute the subscription period.
interface PlanDef {
  amount: number;
  cycle: 'WEEKLY' | 'MONTHLY' | '6MONTHS' | 'YEARLY';
  days: number;
}
const PLAN_CATALOG: Record<string, PlanDef> = {
  'Starter Pro': { amount: 95, cycle: 'WEEKLY', days: 7 },
  'Expert Weekly': { amount: 950, cycle: 'WEEKLY', days: 7 },
  'Neural Monthly': { amount: 3299, cycle: 'MONTHLY', days: 30 },
  'Pro 6-Months': { amount: 18999, cycle: '6MONTHS', days: 180 },
  'Ultimate Annual': { amount: 32999, cycle: 'YEARLY', days: 365 },
};
const ALLOWED_PLAN_AMOUNTS = new Set(Object.values(PLAN_CATALOG).map(p => p.amount));

const router = Router();

router.use(requireAuth, rateLimit({ windowMs: 60_000, max: 30 }));

interface VerificationResult {
  isValid: boolean;
  message: string;
}

const getEthPrice = async (): Promise<number> => {
  try {
    const response = await fetch(
      `https://api.etherscan.io/v2/api?chainid=1&module=stats&action=ethprice&apikey=${ETHERSCAN_API_KEY}`
    );
    const data = await response.json();
    if (data.status === '1' && data.result?.ethusd) {
      return parseFloat(data.result.ethusd);
    }
    return 2500; // Fallback price if API fails
  } catch (error) {
    console.error('Failed to fetch ETH price:', error);
    return 2500;
  }
};

const verifyTransaction = async (txHash: string, expectedAmountUsd: number): Promise<VerificationResult> => {
  try {
    const cleanHash = (txHash || '').trim().toLowerCase();

    // Demo verification path — only enabled outside production builds.
    if (
      ALLOW_MOCK_VERIFICATION &&
      (cleanHash.includes('mock') || cleanHash.includes('demo') ||
        cleanHash === '0x0000000000000000000000000000000000000000000000000000000000000000')
    ) {
      console.log(`[Payments] Mock verification triggered for: ${txHash}`);
      await new Promise(resolve => setTimeout(resolve, 2500));
      return { isValid: true, message: 'Transaction verified successfully (Mock Environment)!' };
    }

    if (!cleanHash || !cleanHash.startsWith('0x') || cleanHash.length !== 66) {
      return { isValid: false, message: 'Invalid transaction hash format.' };
    }

    // 1. Get Transaction Details
    const apiUrl = `https://api.etherscan.io/v2/api?chainid=1&module=proxy&action=eth_getTransactionByHash&txhash=${cleanHash}&apikey=${ETHERSCAN_API_KEY}`;

    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    if (!data || data.error || !data.result) {
      return { isValid: false, message: data?.error?.message || 'Transaction not found on Etherscan.' };
    }

    const tx = data.result;
    const input = tx.input || '0x';
    const txTo = tx.to?.toLowerCase();
    const isTransfer = input.startsWith('0xa9059cbb');
    const isTransferFrom = input.startsWith('0x23b872dd');

    let recipient = '';
    let amountUsd = 0;
    let tokenAmount = 0;
    let isEth = false;

    // Case 1: Direct interaction with TARGET_ADDRESS (Direct ETH Payment)
    if (txTo === PAYMENT_ETH_ADDRESS) {
      recipient = txTo;
      tokenAmount = parseInt(tx.value, 16) / 1e18;
      isEth = true;

      const ethPrice = await getEthPrice();
      amountUsd = tokenAmount * ethPrice;
    }
    // Case 2: Standard ERC-20 Transfer (USDT/WBTC/BOMB)
    else if (isTransfer || isTransferFrom) {
      let amountHex = '0x0';
      if (isTransfer) {
        recipient = '0x' + input.substring(34, 74).toLowerCase();
        amountHex = '0x' + input.substring(74);
      } else {
        recipient = '0x' + input.substring(98, 138).toLowerCase();
        amountHex = '0x' + input.substring(138);
      }

      let decimals = 18;
      if (txTo === '0xdac17f958d2ee523a2206206994597c13d831ec7') decimals = 6; // USDT
      else if (txTo === '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599') decimals = 8; // WBTC

      tokenAmount = parseInt(amountHex, 16) / Math.pow(10, decimals);
      amountUsd = tokenAmount;
    } else {
      return { isValid: false, message: 'Neither a direct transfer nor a standard ERC-20 transfer.' };
    }

    if (recipient !== PAYMENT_ETH_ADDRESS) {
      console.warn(`[Payments] Recipient mismatch. Expected: ${PAYMENT_ETH_ADDRESS}, Found: ${recipient}`);
      return { isValid: false, message: `Recipient mismatch. Sent to ${recipient.substring(0, 10)}...` };
    }

    // 2. Check Receipt for confirmation status
    const receiptUrl = `https://api.etherscan.io/v2/api?chainid=1&module=proxy&action=eth_getTransactionReceipt&txhash=${cleanHash}&apikey=${ETHERSCAN_API_KEY}`;
    const receiptResponse = await fetch(receiptUrl);
    const receiptData = await receiptResponse.json();

    if (!receiptData.result || receiptData.result.status !== '0x1') {
      return { isValid: false, message: 'Transaction failed or is still pending on the blockchain.' };
    }

    // 3. Final USD check (5% tolerance for crypto volatility)
    if (amountUsd < expectedAmountUsd * 0.95) {
      return { isValid: false, message: `Amount sent ($${amountUsd.toFixed(2)}) is less than required ($${expectedAmountUsd}).` };
    }

    return { isValid: true, message: 'Transaction verified successfully!' };
  } catch (error) {
    console.error('Verification error:', error);
    return { isValid: false, message: 'Neural link to Etherscan failed. Please try again.' };
  }
};

router.post('/verify-transaction', async (req, res) => {
  const { txHash, expectedAmountUsd } = req.body || {};

  if (typeof txHash !== 'string' || txHash.length > 200) {
    return res.status(400).json({ error: 'Invalid transaction hash.' });
  }
  if (typeof expectedAmountUsd !== 'number' || !isFinite(expectedAmountUsd) || expectedAmountUsd <= 0 || expectedAmountUsd > 1e9) {
    return res.status(400).json({ error: 'Invalid expected amount.' });
  }

  const result = await verifyTransaction(txHash, expectedAmountUsd);
  res.json(result);
});

// --- CASHFREE PAYMENT GATEWAY (sandbox/test) ---
// Order creation must happen server-side: it requires the secret key.
const cashfreeHeaders = () => ({
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'x-api-version': CASHFREE_API_VERSION,
  'x-client-id': CASHFREE_API_KEY,
  'x-client-secret': CASHFREE_SECRET_KEY,
});

const isCashfreeConfigured = () => !!CASHFREE_API_KEY && !!CASHFREE_SECRET_KEY;

router.post('/cashfree/create-order', async (req: AuthedRequest, res) => {
  if (!isCashfreeConfigured()) {
    return res.status(503).json({ error: 'Cashfree not configured on the server.' });
  }

  const { planName, amountInr, customerEmail } = req.body || {};

  const plan = typeof planName === 'string' ? PLAN_CATALOG[planName] : undefined;
  if (!plan) {
    return res.status(400).json({ error: 'Invalid plan name.' });
  }
  if (typeof amountInr !== 'number' || !Number.isInteger(amountInr) || amountInr !== plan.amount) {
    return res.status(400).json({ error: 'Invalid plan amount.' });
  }
  if (customerEmail !== undefined && (typeof customerEmail !== 'string' || customerEmail.length > 200)) {
    return res.status(400).json({ error: 'Invalid customer email.' });
  }

  const orderId = `NBL${Date.now()}`;

  try {
    const response = await fetch(`${CASHFREE_BASE_URL}/pg/orders`, {
      method: 'POST',
      headers: cashfreeHeaders(),
      body: JSON.stringify({
        order_id: orderId,
        order_amount: plan.amount,
        order_currency: 'INR',
        order_note: `Nebulamarket ${planName} subscription (${plan.cycle})`,
        customer_details: {
          customer_id: req.userId || orderId,
          customer_name: customerEmail?.split('@')[0] || 'Nebula Trader',
          customer_email: customerEmail || 'trader@nebulamarket.ai',
          customer_phone: '9999999999', // dummy phone required by Cashfree for sandbox
        },
        order_meta: {
          return_url: `${req.protocol}://${req.get('host')}/`,
        },
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.payment_session_id) {
      console.error('[Cashfree] Create order failed:', data);
      return res.status(response.status || 500).json({ error: data.message || 'Cashfree order creation failed.' });
    }

    res.json({
      orderId: data.order_id,
      cfOrderId: data.cf_order_id,
      paymentSessionId: data.payment_session_id,
      orderStatus: data.order_status,
    });
  } catch (error: any) {
    console.error('[Cashfree] Create order error:', error);
    res.status(500).json({ error: 'Failed to create Cashfree order.' });
  }
});

// Activate (or renew) a subscription in the users table after a confirmed payment.
// Idempotent: re-checking the same order simply returns the current grant.
const activateSubscription = async (userId: string, planName: string) => {
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error('Database not configured.');

  const plan = PLAN_CATALOG[planName];
  if (!plan) throw new Error('Unknown plan.');

  const now = new Date();
  const periodEnd = new Date(now.getTime() + plan.days * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('users')
    .update({
      subscription_plan: planName,
      billing_cycle: plan.cycle,
      subscription_start: now.toISOString(),
      subscription_end: periodEnd.toISOString(),
      is_subscribed: true,
      last_payment_date: now.toISOString(),
    })
    .eq('user_id', userId)
    .select('user_id, subscription_plan, billing_cycle, subscription_start, subscription_end')
    .single();

  if (error) throw error;
  return data;
};

router.post('/cashfree/order-status', async (req: AuthedRequest, res) => {
  const { orderId, planName } = req.body || {};

  if (typeof orderId !== 'string' || !/^[A-Za-z0-9_-]{3,45}$/.test(orderId)) {
    return res.status(400).json({ error: 'Invalid order id.' });
  }
  const plan = typeof planName === 'string' ? PLAN_CATALOG[planName] : undefined;
  if (!plan) {
    return res.status(400).json({ error: 'Invalid plan name.' });
  }

  try {
    const response = await fetch(`${CASHFREE_BASE_URL}/pg/orders/${encodeURIComponent(orderId)}`, {
      headers: cashfreeHeaders(),
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || 'Cashfree order lookup failed.' });
    }

    // Only record the grant when Cashfree says the payment is settled.
    if (data.order_status === 'PAID' && req.userId) {
      const grant = await activateSubscription(req.userId, planName);
      return res.json({
        orderId: data.order_id,
        orderStatus: data.order_status,
        orderAmount: data.order_amount,
        orderCurrency: data.order_currency,
        subscription: {
          planName: grant.subscription_plan,
          billingCycle: grant.billing_cycle,
          periodEnd: grant.subscription_end,
        },
      });
    }

    res.json({
      orderId: data.order_id,
      orderStatus: data.order_status,
      orderAmount: data.order_amount,
      orderCurrency: data.order_currency,
    });
  } catch (error: any) {
    console.error('[Cashfree] Order status error:', error);
    res.status(500).json({ error: 'Failed to fetch Cashfree order.' });
  }
});

// Current subscription status for the signed-in user — the client uses this to
// decide whether to gate access and when to prompt for renewal.
router.get('/subscription-status', async (req: AuthedRequest, res) => {
  const supabase = getSupabaseServer();
  if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

  const { data, error } = await supabase
    .from('users')
    .select('user_id, subscription_plan, billing_cycle, subscription_start, subscription_end')
    .eq('user_id', req.userId)
    .maybeSingle();

  if (error) return res.status(500).json({ error: 'Failed to load subscription.' });

  const periodEnd = data?.subscription_end ? new Date(data.subscription_end) : null;
  const isSubscribed = !!periodEnd && periodEnd.getTime() > Date.now();

  res.json({
    isSubscribed,
    planName: data?.subscription_plan ?? null,
    billingCycle: data?.billing_cycle ?? null,
    periodStart: data?.subscription_start ?? null,
    periodEnd: data?.subscription_end ?? null,
    daysRemaining: isSubscribed && periodEnd ? Math.max(0, Math.ceil((periodEnd.getTime() - Date.now()) / 86400000)) : 0,
  });
});

export default router;
