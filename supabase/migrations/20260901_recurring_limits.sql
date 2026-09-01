create table if not exists public.finance_recurring (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  descricao text not null,
  valor numeric(12,2) not null check (valor > 0),
  categoria text not null,
  dia integer not null default 1 check (dia between 1 and 31),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.finance_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  categoria text not null,
  valor numeric(12,2) not null check (valor > 0),
  created_at timestamptz not null default now(),
  unique(user_id,categoria)
);
alter table public.finance_recurring enable row level security;
alter table public.finance_limits enable row level security;
drop policy if exists "recurring own rows" on public.finance_recurring;
drop policy if exists "limits own rows" on public.finance_limits;
create policy "recurring own rows" on public.finance_recurring for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "limits own rows" on public.finance_limits for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create index if not exists finance_recurring_user_idx on public.finance_recurring(user_id,ativo);
create index if not exists finance_limits_user_idx on public.finance_limits(user_id);
