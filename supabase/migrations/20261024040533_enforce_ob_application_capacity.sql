-- Apply before deploying the matching API/UI change. The API count check alone
-- cannot prevent simultaneous requests from taking the last OB place.
-- Existing applications, including sessions with more than four OBs, are kept.
begin;

create index if not exists applications_ob_event_id
  on public.applications (event_id)
  where user_type = 'ob';

create or replace function public.enforce_ob_application_capacity()
returns trigger
language plpgsql
volatile
security invoker
set search_path = pg_catalog
as $$
begin
  if new.user_type is distinct from 'ob' then
    return new;
  end if;

  -- Updating attendance/payment/etc. must remain possible for legacy sessions
  -- already over capacity. Only taking a new OB place needs the capacity check.
  if tg_op = 'UPDATE' then
    if old.user_type = 'ob' and old.event_id = new.event_id then
      return new;
    end if;
  end if;

  -- Serialize OB registrations for this session in the API's READ COMMITTED
  -- transactions. NO KEY UPDATE remains compatible with foreign-key checks.
  -- The following count gets a fresh snapshot after a competing insert commits.
  perform 1 from public.events where id = new.event_id for no key update;

  if (select count(*) from public.applications
      where event_id = new.event_id and user_type = 'ob') >= 4 then
    raise exception using
      errcode = 'P0001',
      message = 'OB_CAPACITY_REACHED';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_ob_application_capacity() from public, anon, authenticated;
grant execute on function public.enforce_ob_application_capacity() to service_role;

create trigger enforce_ob_application_capacity
  before insert or update of event_id, user_type on public.applications
  for each row execute function public.enforce_ob_application_capacity();

commit;
