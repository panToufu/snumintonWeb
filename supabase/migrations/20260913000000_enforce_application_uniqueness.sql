-- Preserve existing application history, including any legacy duplicates.
-- Every application created after this migration is protected by the unique
-- indexes below. The API also continues to reject applications that duplicate
-- a legacy record.

begin;

alter table public.applications
  add column if not exists enforce_application_uniqueness boolean;

-- Rows that existed before the constraint are legacy records. Marking them
-- separately keeps the migration non-destructive when historical duplicates
-- are present, while new rows use the default value of true.
update public.applications
set enforce_application_uniqueness = false
where enforce_application_uniqueness is null;

alter table public.applications
  alter column enforce_application_uniqueness set default true,
  alter column enforce_application_uniqueness set not null;

-- One non-guest application per name per event for newly created records.
create unique index if not exists applications_unique_new_member_name_per_event
  on public.applications (event_id, lower(user_name))
  where enforce_application_uniqueness is true
    and user_type in ('member', 'ob', '회장', '부회장', '임원진');

-- One guest application per normalized phone number per event for newly
-- created records. The expression treats 010-1234-5678 and 01012345678 as
-- the same phone number.
create unique index if not exists applications_unique_new_guest_phone_per_event
  on public.applications (event_id, regexp_replace(phone_number, '[^0-9]', '', 'g'))
  where enforce_application_uniqueness is true
    and user_type = 'guest'
    and phone_number is not null
    and regexp_replace(phone_number, '[^0-9]', '', 'g') <> '';

commit;
