create table if not exists public.finance_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('disponivel','guardado','investimentos')),
  valor numeric(14,2) not null default 0 check (valor >= 0),
  updated_at timestamptz not null default now(),
  unique(user_id, tipo)
);

create table if not exists public.finance_transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  de text not null check (de in ('disponivel','guardado','investimentos')),
  para text not null check (para in ('disponivel','guardado','investimentos')),
  valor numeric(14,2) not null check (valor > 0),
  descricao text not null default 'Transferência',
  created_at timestamptz not null default now(),
  check (de <> para)
);

alter table public.finance_balances enable row level security;
alter table public.finance_transfers enable row level security;

create policy "Users can manage own finance balances" on public.finance_balances
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own finance transfers" on public.finance_transfers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists finance_transfers_user_date_idx on public.finance_transfers(user_id, created_at desc);
