-- Apply only after the matching Next.js API routes have been deployed and tested.
-- The public site must access these tables through /api/public/*, never Supabase's browser client.

begin;

-- Old versions stored the shared guest code alongside applications. It is no longer
-- needed after server-side verification, so remove any remaining plaintext values.
update public.applications
set guest_password = null
where guest_password is not null;

-- Existing policies are intentionally retained but made inactive by the revoked
-- table grants below. Retaining them keeps the migration recoverable if needed.
-- The server uses the service_role/secret key after it performs its own checks,
-- so no browser-facing policy is required for normal operation.

revoke all privileges on table public.events, public.members, public.applications, public.polls from anon, authenticated;
revoke all privileges on table public.events, public.members, public.applications, public.polls from public;
grant all privileges on table public.events, public.members, public.applications, public.polls to service_role;

alter table public.events enable row level security;
alter table public.members enable row level security;
alter table public.applications enable row level security;
alter table public.polls enable row level security;

commit;
