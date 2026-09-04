create table if not exists public.finance_wealth_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ano integer not null check (ano between 2000 and 2200),
  mes integer not null check (mes between 1 and 12),
  disponivel numeric(14,2) not null default 0,
  guardado numeric(14,2) not null default 0,
  investimentos numeric(14,2) not null default 0,
  ativos numeric(14,2) not null default 0,
  divida_cartoes numeric(14,2) not null default 0,
  patrimonio_liquido numeric(14,2) not null default 0,
  limite_cartoes numeric(14,2) not null default 0,
  captured_at timestamptz not null default now(),
  unique(user_id, ano, mes)
);

alter table public.finance_wealth_snapshots enable row level security;

create policy "Users can manage own wealth snapshots" on public.finance_wealth_snapshots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists finance_wealth_snapshots_user_period_idx
  on public.finance_wealth_snapshots(user_id, ano desc, mes desc);
