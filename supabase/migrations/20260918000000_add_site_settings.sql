-- Site-wide values that the executive team may change from the admin page.
-- Passwords are stored only as scrypt hashes; plaintext passwords never enter
-- this table.

begin;

create table if not exists public.site_settings (
  id text primary key check (id = 'club'),
  bank_name text not null,
  bank_account text not null,
  account_holder text not null,
  admin_password_hash text,
  guest_password_hash text,
  auth_version integer not null default 1 check (auth_version > 0),
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id, bank_name, bank_account, account_holder)
values ('club', '카카오뱅크', '3333335748122', '김민성')
on conflict (id) do nothing;

revoke all privileges on table public.site_settings from anon, authenticated, public;
grant all privileges on table public.site_settings to service_role;
alter table public.site_settings enable row level security;

commit;
