-- Enforce the same duplicate-application rules in PostgreSQL that the API uses.
-- This makes concurrent submissions safe. The migration intentionally refuses to
-- delete or change existing records when old duplicate applications are found.

begin;

do $$
begin
  if exists (
    select 1
    from public.applications
    where user_type in ('member', 'ob', '회장', '부회장', '임원진')
    group by event_id, lower(user_name)
    having count(*) > 1
  ) then
    raise exception 'Member or OB duplicate applications exist. Resolve them before applying this migration.';
  end if;

  if exists (
    select 1
    from public.applications
    where user_type = 'guest' and phone_number is not null and regexp_replace(phone_number, '\D', '', 'g') <> ''
    group by event_id, regexp_replace(phone_number, '\D', '', 'g')
    having count(*) > 1
  ) then
    raise exception 'Guest duplicate applications exist. Resolve them before applying this migration.';
  end if;
end;
$$;

create unique index if not exists applications_unique_non_guest_name
  on public.applications (event_id, lower(user_name))
  where user_type in ('member', 'ob', '회장', '부회장', '임원진');

create unique index if not exists applications_unique_guest_phone
  on public.applications (event_id, regexp_replace(phone_number, '\D', '', 'g'))
  where user_type = 'guest' and phone_number is not null and regexp_replace(phone_number, '\D', '', 'g') <> '';

commit;
