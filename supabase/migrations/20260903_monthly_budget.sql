create table if not exists public.finance_monthly_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mes integer not null check (mes between 1 and 12),
  ano integer not null check (ano >= 2020),
  valor numeric(12,2) not null check (valor > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,mes,ano)
);
alter table public.finance_monthly_budgets enable row level security;
drop policy if exists "monthly budgets own rows" on public.finance_monthly_budgets;
create policy "monthly budgets own rows" on public.finance_monthly_budgets
for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create index if not exists finance_monthly_budgets_user_idx on public.finance_monthly_budgets(user_id,ano,mes);
