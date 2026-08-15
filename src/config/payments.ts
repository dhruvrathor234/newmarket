/**
 * Payment destinations shown to users in the UI.
 * The server independently reads PAYMENT_ETH_ADDRESS from env (server/config.ts)
 * for verification, so these are display-only values that must match deployment env.
 */
export const PAYMENT_CONFIG = {
  ETH_ADDRESS: '0x388C818CA8B9251b393131C08a736A67ccB19297',
  USDT_TRC20_ADDRESS: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
  UPI_ID: 'nebulamarket@upi',
} as const;

// Cashfree Payment Gateway client settings.
// MODE: 'sandbox' for the test net, 'production' for live. Override with
// VITE_CASHFREE_MODE so going live needs no code change (set the matching
// CASHFREE_ENV=production on the server too). The API keys live server-side
// (env) — the client only ever holds the payment_session_id.
export const CASHFREE_CONFIG = {
  MODE: (import.meta.env.VITE_CASHFREE_MODE || 'sandbox') as 'sandbox' | 'production',
  SDK_URL: 'https://sdk.cashfree.com/js/v3/cashfree.js',
} as const;
