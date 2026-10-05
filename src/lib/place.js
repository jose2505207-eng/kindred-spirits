/**
 * Where somebody is, and how far they will look.
 *
 * Coordinates are rounded before they ever leave the device. numeric(6,2) in
 * the database holds about 1.1 km of precision, which answers "within 25 km"
 * and does not point at a home — so there is no reason to send more, and this
 * file is where that rounding happens.
 *
 * Nothing here filters anything that matters: public_profiles applies the
 * radius before the feed is read, and never returns lat or lon to anybody.
 * `withinRadius` is the same rule written out for demo mode, where there is no
 * database — exactly as `mutuallyInterested` is in src/lib/gender.js.
 */

export const PLACE_LABEL_MAX = 80;

/** null means anywhere, which is also the default. */
export const RADIUS_OPTIONS = [
  { km: 10, label: "10 km" },
  { km: 25, label: "25 km" },
  { km: 50, label: "50 km" },
  { km: 100, label: "100 km" },
  { km: 500, label: "500 km" },
  { km: null, label: "Anywhere" },
];

/** The ~1.1 km precision the database column holds, and no more. */
export const roundCoord = (n) => Math.round(n * 100) / 100;

const EARTH_KM = 6371;
const rad = (d) => (d * Math.PI) / 180;

/**
 * The same haversine as private.distance_km, to one decimal place. Null when
 * either side has no coordinates, which is what makes a missing location
 * permissive rather than hiding somebody.
 */
export function distanceKm(a, b) {
  if (a?.lat == null || a?.lon == null || b?.lat == null || b?.lon == null) return null;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(EARTH_KM * 2 * Math.asin(Math.min(1, Math.sqrt(h))) * 10) / 10;
}

/**
 * Whether the two of them are inside the tighter of their two radiuses. A pair
 * where either has not said where they are, or has asked for anywhere, passes.
 */
export function withinRadius(me, them) {
  const km = distanceKm(me, them);
  if (km === null) return true;
  const limit = Math.min(me?.radiusKm ?? 20000, them?.radiusKm ?? 20000);
  return km <= limit;
}

/** How a distance reads on a row. */
export function formatDistance(km) {
  if (km == null) return null;
  if (km < 1) return "under a kilometre away";
  if (km < 10) return `${Math.round(km)} km away`;
  return `${Math.round(km / 5) * 5} km away`;
}

/**
 * Asks the browser where we are, and rounds it before returning. The person
 * has to agree in their own browser; there is no fallback that guesses from an
 * IP address, because a guessed location is worse than none.
 */
export function findMe() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("This browser cannot tell us where you are."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({
        lat: roundCoord(coords.latitude),
        lon: roundCoord(coords.longitude),
      }),
      (err) => reject(new Error(
        err.code === err.PERMISSION_DENIED
          ? "You did not allow this, so your location is not set."
          : "Your location could not be read just now.",
      )),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  });
}
