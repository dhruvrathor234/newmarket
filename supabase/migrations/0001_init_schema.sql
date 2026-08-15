-- ============================================================================
-- Nebulamarket schema (idempotent: safe to run on a fresh or existing DB)
-- Mirrors the columns used by src/services/databaseService.ts and billingService.
-- NOTE: exchange credentials (binance_api_key/secret, mt_master_password) are
-- intentionally NOT persisted by the app anymore — they are session-only.
-- ============================================================================

create table if not exists public.users (
  user_id              uuid primary key,
  email                text,
  balance              numeric default 500,
  equity               numeric default 500,
  paper_balance        numeric default 500,
  paper_equity         numeric default 500,
  real_balance         numeric default 0,
  real_equity          numeric default 0,
  account_type         text default 'PAPER',
  strategy             text default 'NEBULA_V5',
  trading_mode         text default 'SPOT',
  status_message       text default '',
  is_running           boolean default false,
  last_run_time        bigint,
  custom_logic         text default '',
  binance_api_key      text default '',
  binance_api_secret   text default '',
  is_binance_connected boolean default false,
  mt_account_id        text default '',
  mt_master_password   text default '',
  mt_server            text default '',
  is_mt_connected      boolean default false,
  connection_type      text default 'BINANCE',
  is_subscribed        boolean default false,
  -- billing columns
  trade_count          integer default 0,
  net_profit           numeric default 0,
  unpaid_profit_share  numeric default 0,
  is_service_paused    boolean default false,
  last_payment_date    timestamptz,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

create table if not exists public.trades (
  id                text primary key,
  user_id           uuid not null,
  symbol            text,
  trade_type        text,
  lot_size          numeric default 0,
  entry_price       numeric default 0,
  limit_price       numeric,
  close_price       numeric,
  pnl               numeric default 0,
  status            text default 'OPEN',
  account_type      text default 'PAPER',
  open_time         timestamptz,
  close_time        timestamptz,
  stop_loss         numeric,
  take_profit       numeric,
  risk_percentage   numeric default 0,
  binance_order_id  text
);

create table if not exists public.transactions (
  id          text primary key,
  user_id     uuid not null,
  amount      numeric,
  plan_name   text,
  method      text,
  status      text,
  created_at  timestamptz default now()
);

create table if not exists public.logs (
  id         text primary key,
  user_id    uuid not null,
  time       text,
  message    text,
  type       text,
  created_at timestamptz default now()
);

create table if not exists public.payments (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null,
  amount         numeric,
  method         text,
  status         text,
  transaction_id text,
  created_at     timestamptz default now()
);

create table if not exists public.user_stats (
  user_id          uuid primary key,
  total_profit     numeric default 0,
  total_fees_owed  numeric default 0,
  total_fees_paid  numeric default 0,
  amount_owed      numeric default 0,
  is_locked        boolean default false,
  last_updated     timestamptz default now()
);

-- Indexes for the queries the app makes
create index if not exists idx_trades_user_id on public.trades (user_id);
create index if not exists idx_transactions_user_id on public.transactions (user_id);
create index if not exists idx_logs_user_id on public.logs (user_id);
create index if not exists idx_payments_user_id on public.payments (user_id);
