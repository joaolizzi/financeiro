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
