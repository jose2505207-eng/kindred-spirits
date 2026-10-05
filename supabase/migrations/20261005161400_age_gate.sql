-- An 18+ age gate, enforced in the database.
--
-- A dating app has to be 18+ to ship on either store, and onboarding asks for
-- a birthdate before anything else, so the bound belongs next to the data
-- rather than in the form. src/screens/Onboarding.jsx mirrors it as a
-- courtesy; this is the source of truth.
--
-- A CHECK constraint cannot reference current_date, so this is a trigger, the
-- same shape as profiles_reject_future_birthdate in the profiles migration.
-- It is deliberately a second trigger rather than a rewrite of that one: the
-- future-date message is more specific for an obviously wrong date, and BEFORE
-- triggers fire in name order, so profiles_reject_future_birthdate still
-- answers first for a date that is both future and underage.
--
-- Existing rows are not revalidated — a trigger only sees writes. Any profile
-- already under 18 keeps its row until it is next written; docs/TESTING.md
-- carries the query that checks whether there are any.

create function private.profiles_require_adult()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Null until onboarding: handle_new_user() inserts the stub row before the
  -- person has typed anything.
  if new.birthdate is not null
     and new.birthdate > (current_date - interval '18 years')::date then
    raise exception 'Kindred Spirits is for people of 18 and over.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke execute on function private.profiles_require_adult() from public;

create trigger profiles_require_adult
  before insert or update of birthdate on public.profiles
  for each row execute function private.profiles_require_adult();
