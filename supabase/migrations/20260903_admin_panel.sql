-- Admin roles for Finanças
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('owner','admin')),
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id) on delete set null
);

alter table public.app_admins enable row level security;

create or replace function public.is_app_admin(check_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.app_admins where user_id = check_user);
$$;

revoke all on function public.is_app_admin(uuid) from public;
grant execute on function public.is_app_admin(uuid) to authenticated;

create policy "admins can read admin list"
on public.app_admins for select
to authenticated
using (public.is_app_admin(auth.uid()));

-- Bootstrap: the oldest existing account becomes owner if no admin exists yet.
insert into public.app_admins (user_id, role)
select id, 'owner'
from auth.users
where not exists (select 1 from public.app_admins)
order by created_at asc
limit 1
on conflict (user_id) do nothing;
