-- ============================================================================
-- Row Level Security: every table is locked down so clients can only touch
-- their OWN rows. This is the critical defense for the anon key the browser
-- uses. Without these policies any visitor could read/modify any user's
-- trades, balances, and subscription state.
-- ============================================================================

alter table public.users enable row level security;
alter table public.trades enable row level security;
alter table public.transactions enable row level security;
alter table public.logs enable row level security;
alter table public.payments enable row level security;
alter table public.user_stats enable row level security;

-- Helper: policies keyed on auth.uid() = user_id for every table
do $$
begin
  -- USERS
  drop policy if exists "users_select_own" on public.users;
  create policy "users_select_own" on public.users
    for select using (auth.uid() = user_id);
  drop policy if exists "users_insert_own" on public.users;
  create policy "users_insert_own" on public.users
    for insert with check (auth.uid() = user_id);
  drop policy if exists "users_update_own" on public.users;
  create policy "users_update_own" on public.users
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  drop policy if exists "users_delete_own" on public.users;
  create policy "users_delete_own" on public.users
    for delete using (auth.uid() = user_id);

  -- TRADES
  drop policy if exists "trades_select_own" on public.trades;
  create policy "trades_select_own" on public.trades
    for select using (auth.uid() = user_id);
  drop policy if exists "trades_insert_own" on public.trades;
  create policy "trades_insert_own" on public.trades
    for insert with check (auth.uid() = user_id);
  drop policy if exists "trades_update_own" on public.trades;
  create policy "trades_update_own" on public.trades
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  drop policy if exists "trades_delete_own" on public.trades;
  create policy "trades_delete_own" on public.trades
    for delete using (auth.uid() = user_id);

  -- TRANSACTIONS
  drop policy if exists "transactions_select_own" on public.transactions;
  create policy "transactions_select_own" on public.transactions
    for select using (auth.uid() = user_id);
  drop policy if exists "transactions_insert_own" on public.transactions;
  create policy "transactions_insert_own" on public.transactions
    for insert with check (auth.uid() = user_id);
  drop policy if exists "transactions_update_own" on public.transactions;
  create policy "transactions_update_own" on public.transactions
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  drop policy if exists "transactions_delete_own" on public.transactions;
  create policy "transactions_delete_own" on public.transactions
    for delete using (auth.uid() = user_id);

  -- LOGS
  drop policy if exists "logs_select_own" on public.logs;
  create policy "logs_select_own" on public.logs
    for select using (auth.uid() = user_id);
  drop policy if exists "logs_insert_own" on public.logs;
  create policy "logs_insert_own" on public.logs
    for insert with check (auth.uid() = user_id);
  drop policy if exists "logs_update_own" on public.logs;
  create policy "logs_update_own" on public.logs
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  drop policy if exists "logs_delete_own" on public.logs;
  create policy "logs_delete_own" on public.logs
    for delete using (auth.uid() = user_id);

  -- PAYMENTS
  drop policy if exists "payments_select_own" on public.payments;
  create policy "payments_select_own" on public.payments
    for select using (auth.uid() = user_id);
  drop policy if exists "payments_insert_own" on public.payments;
  create policy "payments_insert_own" on public.payments
    for insert with check (auth.uid() = user_id);
  drop policy if exists "payments_update_own" on public.payments;
  create policy "payments_update_own" on public.payments
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  drop policy if exists "payments_delete_own" on public.payments;
  create policy "payments_delete_own" on public.payments
    for delete using (auth.uid() = user_id);

  -- USER_STATS
  drop policy if exists "user_stats_select_own" on public.user_stats;
  create policy "user_stats_select_own" on public.user_stats
    for select using (auth.uid() = user_id);
  drop policy if exists "user_stats_insert_own" on public.user_stats;
  create policy "user_stats_insert_own" on public.user_stats
    for insert with check (auth.uid() = user_id);
  drop policy if exists "user_stats_update_own" on public.user_stats;
  create policy "user_stats_update_own" on public.user_stats
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  drop policy if exists "user_stats_delete_own" on public.user_stats;
  create policy "user_stats_delete_own" on public.user_stats
    for delete using (auth.uid() = user_id);
end $$;

-- Enable realtime for the tables the app subscribes to
do $$
begin
  alter publication supabase_realtime add table public.users;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.trades;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.transactions;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.logs;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.user_stats;
exception when duplicate_object then null;
end $$;
