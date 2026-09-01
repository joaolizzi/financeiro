create table if not exists public.finance_monthly_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month integer not null check (month between 1 and 12),
  year integer not null,
  goal numeric(14,2) default 0,
  note text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, month, year)
);

alter table public.finance_monthly_notes enable row level security;
create policy "Users can manage own monthly notes" on public.finance_monthly_notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists gastos_user_date_idx on public.gastos(user_id, data desc);
