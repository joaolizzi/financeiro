-- Private authentication allowlist.
-- Existing Auth users are automatically allowed so this migration is safe to apply
-- to an already-running installation.

create table if not exists public.app_access_emails (
  email text primary key,
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id) on delete set null
);

alter table public.app_access_emails enable row level security;

-- No client-side policies on purpose. The allowlist is managed only by trusted
-- server-side code using the Supabase service role.

insert into public.app_access_emails (email)
select distinct lower(trim(email))
from auth.users
where email is not null and trim(email) <> ''
on conflict (email) do nothing;

comment on table public.app_access_emails is
  'Private allowlist for accounts authorized to access Financas. Existing Auth users are seeded during migration.';

-- Supabase "Before User Created" hook. After running this migration, configure
-- this function in Authentication > Hooks > Before User Created:
-- public.hook_restrict_financas_signup
create or replace function public.hook_restrict_financas_signup(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  signup_email text;
begin
  signup_email := lower(trim(coalesce(event->'user'->>'email','')));
  if signup_email = '' or not exists (
    select 1 from public.app_access_emails a where a.email = signup_email
  ) then
    raise sqlstate '28000' using message = 'Conta não autorizada para acessar o Finanças.';
  end if;
  return event;
end;
$$;

revoke execute on function public.hook_restrict_financas_signup(jsonb) from public, anon, authenticated;
grant execute on function public.hook_restrict_financas_signup(jsonb) to supabase_auth_admin;
