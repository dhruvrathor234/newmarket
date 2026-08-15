-- Subscription tracking: server records the active plan and its current billing
-- period on the users table. Access is derived from period_end (is_subscribed
-- is kept only as a legacy convenience flag and is recomputed on the server).

alter table public.users
  add column if not exists subscription_plan     text,
  add column if not exists billing_cycle         text,            -- WEEKLY | MONTHLY | 6MONTHS | YEARLY
  add column if not exists subscription_start    timestamptz,
  add column if not exists subscription_end      timestamptz;

-- Index so the server can quickly find expiring subscriptions for reminders.
create index if not exists idx_users_subscription_end on public.users (subscription_end);
