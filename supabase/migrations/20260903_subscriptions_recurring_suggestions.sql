alter table public.finance_recurring
  add column if not exists last_confirmed_month text;

create table if not exists public.finance_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  valor numeric(12,2) not null check (valor > 0),
  dia integer not null default 1 check (dia between 1 and 31),
  categoria text not null default 'Assinaturas',
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.finance_subscriptions enable row level security;
drop policy if exists "subscriptions own rows" on public.finance_subscriptions;
create policy "subscriptions own rows" on public.finance_subscriptions
for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create index if not exists finance_subscriptions_user_idx on public.finance_subscriptions(user_id,ativo);
