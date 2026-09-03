create table if not exists public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  limite numeric(12,2) not null default 0 check (limite >= 0),
  dia_fechamento integer not null default 1 check (dia_fechamento between 1 and 28),
  dia_vencimento integer not null default 10 check (dia_vencimento between 1 and 28),
  created_at timestamptz not null default now()
);

create table if not exists public.credit_card_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references public.credit_cards(id) on delete cascade,
  descricao text not null,
  categoria text not null default 'Outros',
  valor_total numeric(12,2) not null check (valor_total > 0),
  parcelas integer not null default 1 check (parcelas between 1 and 60),
  data_compra date not null,
  created_at timestamptz not null default now()
);

alter table public.credit_cards enable row level security;
alter table public.credit_card_purchases enable row level security;

drop policy if exists "credit_cards_select_own" on public.credit_cards;
drop policy if exists "credit_cards_insert_own" on public.credit_cards;
drop policy if exists "credit_cards_update_own" on public.credit_cards;
drop policy if exists "credit_cards_delete_own" on public.credit_cards;
create policy "credit_cards_select_own" on public.credit_cards for select using (auth.uid() = user_id);
create policy "credit_cards_insert_own" on public.credit_cards for insert with check (auth.uid() = user_id);
create policy "credit_cards_update_own" on public.credit_cards for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "credit_cards_delete_own" on public.credit_cards for delete using (auth.uid() = user_id);

drop policy if exists "credit_card_purchases_select_own" on public.credit_card_purchases;
drop policy if exists "credit_card_purchases_insert_own" on public.credit_card_purchases;
drop policy if exists "credit_card_purchases_update_own" on public.credit_card_purchases;
drop policy if exists "credit_card_purchases_delete_own" on public.credit_card_purchases;
create policy "credit_card_purchases_select_own" on public.credit_card_purchases for select using (auth.uid() = user_id);
create policy "credit_card_purchases_insert_own" on public.credit_card_purchases for insert with check (auth.uid() = user_id);
create policy "credit_card_purchases_update_own" on public.credit_card_purchases for update using (auth.uid() = user_id);
create policy "credit_card_purchases_delete_own" on public.credit_card_purchases for delete using (auth.uid() = user_id);

create index if not exists credit_cards_user_id_idx on public.credit_cards(user_id);
create index if not exists credit_card_purchases_user_id_idx on public.credit_card_purchases(user_id);
create index if not exists credit_card_purchases_card_id_idx on public.credit_card_purchases(card_id);
