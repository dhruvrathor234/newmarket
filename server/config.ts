import dotenv from 'dotenv';

dotenv.config({ override: true });

const PLACEHOLDER_MARKERS = ['YOUR_KEY_HERE', 'YOUR_API_KEY', 'PASTE_KEY_HERE', 'TODO', 'VITE_GEMINI_API_KEY', 'CHANGE_ME'];

export const isPlaceholder = (key: string | undefined): boolean => {
  if (!key) return true;
  return PLACEHOLDER_MARKERS.some(p => key.toUpperCase().includes(p.toUpperCase()));
};

// Prioritize user-provided VITE_GEMINI_API_KEY from .env, fall back to API_KEY.
// Kept server-side only — never expose through VITE_-prefixed client bundles.
const getGeminiKey = (): string => {
  const envKey = process.env.VITE_GEMINI_API_KEY;
  const platformKey = process.env.API_KEY;

  if (envKey && !isPlaceholder(envKey)) return envKey;
  if (platformKey && !isPlaceholder(platformKey)) return platformKey;
  return envKey || platformKey || '';
};

export const GEMINI_API_KEY = getGeminiKey();

export const ETHERSCAN_API_KEY =
  process.env.ETHERSCAN_API_KEY || process.env.VITE_ETHERSCAN_KEY || '';

// Wallet that crypto payments are verified against. Move to env per environment.
export const PAYMENT_ETH_ADDRESS = (
  process.env.PAYMENT_ETH_ADDRESS || '0x388C818CA8B9251b393131C08a736A67ccB19297'
).toLowerCase();

// --- Cashfree Payment Gateway (SERVER-ONLY — the secret must never ship to the browser) ---
export const CASHFREE_API_KEY = process.env.CASHFREE_API_KEY || '';
export const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY || '';
export const CASHFREE_ENV = (process.env.CASHFREE_ENV || 'sandbox').toLowerCase();
export const CASHFREE_API_VERSION = process.env.CASHFREE_API_VERSION || '2025-01-01';
export const CASHFREE_BASE_URL =
  CASHFREE_ENV === 'production' ? 'https://api.cashfree.com' : 'https://sandbox.cashfree.com';

export const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

export const NODE_ENV = process.env.NODE_ENV;
export const IS_VERCEL = !!process.env.VERCEL;

// Allow the mock/demo payment verification path only outside production.
export const ALLOW_MOCK_VERIFICATION = NODE_ENV !== 'production';

export const CACHE_TTL = {
  economicEvents: 1000 * 60 * 60, // 1 hour
  marketAnalysis: 1000 * 60 * 30, // 30 minutes
  chat: 1000 * 60 * 5, // 5 minutes
};
