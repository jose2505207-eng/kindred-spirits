-- Foundation for every later migration.
--
-- `private` holds the helpers that policies and triggers call. It is not an
-- exposed Data API schema, so nothing in it is reachable over REST. Postgres
-- grants EXECUTE on new functions to PUBLIC, and that default cannot be revoked
-- per schema, so every function created in `private` revokes it by name.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function private.set_updated_at() from public;
