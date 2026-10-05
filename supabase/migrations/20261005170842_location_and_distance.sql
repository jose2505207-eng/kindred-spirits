-- Where somebody is, and how far away they will look for people.
--
-- The client's decision, from the three designs put to them: rounded
-- coordinates, no PostGIS, and distance as a hard filter that runs before the
-- engine ranks anything.
--
-- Why rounded. numeric(6,2) holds about 1.1 km of precision at the equator,
-- which is enough to answer "within 25 km" and not enough to point at a home.
-- Exact coordinates would be the most sensitive column in a database where
-- every signed-in member can already read every birthdate — see "Who can see
-- a birth year" — so the app never stores them and the view never exposes the
-- rounded ones either. What leaves the server is a distance in kilometres and
-- a place label the member wrote themselves.
--
-- Why no PostGIS. One haversine in `private` and one more AND in the view does
-- the whole job. A GiST index would beat it at a scale this project is nowhere
-- near, and the extension would be a second place the schema has to be
-- understood.
--
-- Missing locations are permissive, the same way an empty interested_in is:
-- somebody who has not said where they are is not hidden from everybody, and
-- does not have everybody hidden from them. distance_km() returns null when
-- either side has no coordinates, and the filter lets a null through.

create function private.distance_km(
  lat_a numeric, lon_a numeric, lat_b numeric, lon_b numeric
)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case
    when lat_a is null or lon_a is null or lat_b is null or lon_b is null then null
    else round(
      (6371 * 2 * asin(least(1, sqrt(
        power(sin(radians(lat_b::double precision - lat_a::double precision) / 2), 2)
        + cos(radians(lat_a::double precision)) * cos(radians(lat_b::double precision))
          * power(sin(radians(lon_b::double precision - lon_a::double precision) / 2), 2)
      ))))::numeric,
      1)
  end;
$$;

revoke execute on function private.distance_km(numeric, numeric, numeric, numeric) from public;
grant execute on function private.distance_km(numeric, numeric, numeric, numeric) to authenticated;

alter table public.profiles
  add column lat         numeric(6, 2),
  add column lon         numeric(6, 2),
  add column radius_km   smallint,
  add column place_label text;

alter table public.profiles
  add constraint profiles_lat_range check (lat is null or lat between -90 and 90),
  add constraint profiles_lon_range check (lon is null or lon between -180 and 180),
  -- A coordinate is a pair or it is nothing.
  add constraint profiles_latlon_together check ((lat is null) = (lon is null)),
  -- null means anywhere. 20000 km is past the far side of the planet.
  add constraint profiles_radius_range check (radius_km is null or radius_km between 1 and 20000),
  add constraint profiles_place_label_length check (char_length(place_label) <= 80);

grant insert (lat, lon, radius_km, place_label) on public.profiles to authenticated;
grant update (lat, lon, radius_km, place_label) on public.profiles to authenticated;

-- place_label and distance_km append to the end of the select list: CREATE OR
-- REPLACE VIEW can only add columns there, and rows are read by name.
--
-- distance_km is computed per viewer, which is the point — it is the one
-- distance fact a member needs and the only one they get. lat and lon stay
-- behind the view exactly as interested_in does.
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
  p.gender,
  p.place_label,
  private.distance_km(me.lat, me.lon, p.lat, p.lon) as distance_km
from public.profiles p
cross join lateral (
  select me.id, me.gender, me.interested_in, me.lat, me.lon, me.radius_km
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
  )
  -- and they are inside the tighter of the two radiuses, if both of them have
  -- said where they are. A null distance means somebody has not, and passes.
  and (
    private.distance_km(me.lat, me.lon, p.lat, p.lon) is null
    or private.distance_km(me.lat, me.lon, p.lat, p.lon)
         <= least(coalesce(me.radius_km, 20000), coalesce(p.radius_km, 20000))
  );
