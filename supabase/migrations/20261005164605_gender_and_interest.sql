-- Gender, who you are interested in, and mutual-interest filtering.
--
-- The vocabulary is the client's decision: woman, man, non-binary, and
-- "prefer not to say". interested_in is a set over the first three, because a
-- person can be looking for more than one; an empty set means everyone.
--
-- Both columns are NOT NULL with permissive defaults rather than being added to
-- profiles_onboarded_complete. A CHECK is validated against existing rows, so
-- requiring them would have made this migration unappliable to profiles that
-- onboarded before the questions existed. The defaults say exactly what a
-- person who never answered means: "prefer not to say", interested in everyone.
--
-- The filter lives in public_profiles, not in the client and not in the engine.
-- docs/DESIGN.md is explicit that ranking is the engine's and nothing may
-- reimplement it; mutual interest is not ranking, it decides who is a candidate
-- at all. Filtering in the view means the feed never receives people it would
-- only drop, and engine/kindredEngine.js is untouched.
--
-- "Prefer not to say" is deliberately shown to everyone whose interest is not
-- empty, rather than hidden from everyone: the alternative makes choosing it a
-- way to disappear from the app.

create type public.gender_option as enum ('woman', 'man', 'non_binary', 'prefer_not_to_say');

alter table public.profiles
  add column gender        public.gender_option   not null default 'prefer_not_to_say',
  add column interested_in public.gender_option[] not null default '{}';

-- "Prefer not to say" is an answer about yourself, not a thing to seek.
alter table public.profiles
  add constraint profiles_interested_in_is_a_set check (
    not ('prefer_not_to_say' = any (interested_in))
  );

grant insert (gender, interested_in) on public.profiles to authenticated;
grant update (gender, interested_in) on public.profiles to authenticated;

-- The feed's view, now filtering both ways. The viewer's own row comes from the
-- lateral join, which security_invoker subjects to the same profiles policy —
-- a member can always read their own row, so it resolves. If it ever did not,
-- the comparisons go null and the feed is empty, which is the safe direction.
--
-- interested_in is not exposed: who somebody is looking for is nobody else's
-- business. gender is, because the screens show it.
--
-- gender goes last in the select list on purpose. CREATE OR REPLACE VIEW can
-- only append columns — inserting one mid-list is "cannot change name of view
-- column" — and the client reads rows by name, so position does not matter.
create or replace view public.public_profiles
with (security_invoker = true)
as
select
  p.id,
  p.display_name,
  p.birthdate,
  p.bio,
  p.bowtie_emoji,
  p.bowtie_image_path,
  p.bowtie_backdrop,
  p.bowtie_caption,
  p.gender
from public.profiles p
cross join lateral (
  select me.id, me.gender, me.interested_in
  from public.profiles me
  where me.id = (select auth.uid())
) me
where p.is_visible
  and p.onboarded_at is not null
  and p.suspended_at is null
  and p.id <> me.id
  -- they are someone the viewer is looking for
  and (
    me.interested_in = '{}'
    or p.gender = any (me.interested_in)
    or p.gender = 'prefer_not_to_say'
  )
  -- and the viewer is someone they are looking for
  and (
    p.interested_in = '{}'
    or me.gender = any (p.interested_in)
    or me.gender = 'prefer_not_to_say'
  );
