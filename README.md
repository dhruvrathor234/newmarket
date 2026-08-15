# Nebulamarket AI Trading

Professional AI-powered trading terminal: paper/real Binance trading for FX,
commodities and crypto with Gemini-powered analysis, backtesting, and billing.

## Stack

- **Frontend:** React 19 + Vite + Tailwind (CDN) + lightweight-charts, in `src/`
- **Backend:** Express 5 (Node) in `server/` — Gemini AI, Binance proxy, payment verification
- **Data:** Supabase (Postgres) with RLS — see `supabase/migrations/`
- **Auth:** Supabase email/Google; the browser attaches the session token to every `/api` call

## Project layout

```
src/
  main.tsx              app entry
  App.tsx               top-level state + composition
  components/           UI widgets & modals
  components/views/     page-level views (Dashboard, Terminal, ...)
  hooks/                useCloudSync (auth/DB sync), useBotLoop (trading loop)
  services/             data + business logic (database, binance, gemini, backtest, ...)
  lib/                  supabase client setup
  config/               constants + payment destinations
  types/                shared TypeScript types
server/
  index.ts              Express app (mounts routers, static serving)
  config.ts             env resolution, keys, cache TTLs
  middleware.ts         Supabase JWT auth + rate limiting
  routes/               ai, binance, payments
supabase/migrations/    schema + Row Level Security policies
```

## Run locally

1. `npm install`
2. Copy `.env.example` to `.env` and fill in real values (see below).
3. `npm run dev` — starts the Express + Vite server on http://localhost:3000

## Environment variables (`.env`)

| Variable | Where used | Secret? |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | client + server auth | no (public) |
| `VITE_SUPABASE_ANON_KEY` | client + server auth | no (public, RLS protects data) |
| `GEMINI_API_KEY` | **server only** (`server/config.ts`) | **yes — never use a `VITE_` prefix** |
| `ETHERSCAN_API_KEY` | **server only** (`/api/payments/verify-transaction`) | yes |
| `PAYMENT_ETH_ADDRESS` | server verification target | no (public address) |

**Never** prefix a secret with `VITE_`: Vite inlines `VITE_*` variables into the
client bundle, exposing them to anyone who views the site.

## Security model

- All `/api/*` routes require a valid Supabase access token (`Authorization: Bearer ...`) and are rate limited.
- Gemini and Etherscan keys live only in the server environment.
- **Exchange credentials (Binance API key/secret, MetaTrader master password) are session-only** — they are never written to the database, so they cannot leak via the anon key, realtime channels, or RLS mistakes.
- Supabase RLS policies (in `supabase/migrations/0002_enable_rls.sql`) restrict every table to the owner's rows. Apply them to your Supabase project and verify in the dashboard.
- Mock/demo payment verification is only enabled outside production builds.

## Known follow-ups

- Replace the Tailwind CDN script with a build-time Tailwind setup.
- The billing/paywall (`is_subscribed`, profit share) is still enforced client-side; a production deployment should verify subscription state server-side.
