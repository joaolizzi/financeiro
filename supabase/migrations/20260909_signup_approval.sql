-- Public signup requests that require admin approval before access.

create table if not exists public.finance_signup_requests (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  requested_at timestamptz not null default now(),
  decided_at timestamptz null,
  decided_by uuid null references auth.users(id) on delete set null
);

alter table public.finance_signup_requests enable row level security;

-- Managed only by trusted server-side code with the service role.
create index if not exists finance_signup_requests_status_idx
  on public.finance_signup_requests(status, requested_at desc);

comment on table public.finance_signup_requests is
  'Self-service account requests. Accounts remain banned until an admin approves them.';
