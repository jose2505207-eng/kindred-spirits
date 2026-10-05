/**
 * Gender, and who you are interested in.
 *
 * The vocabulary is fixed, and mirrors the gender_option enum in
 * supabase/migrations exactly — a value is added in both places or neither.
 *
 * Mutual interest decides who is a candidate at all, which is a different
 * question from how candidates are ordered. Ordering is the engine's and
 * nothing here touches it; the filter runs first, in the public_profiles view,
 * so the feed never receives people it would only drop. `mutuallyInterested`
 * below is the same rule written out for demo mode, where there is no database
 * to enforce anything.
 */

export const GENDERS = [
  { id: "woman", label: "Woman" },
  { id: "man", label: "Man" },
  { id: "non_binary", label: "Non-binary" },
  { id: "prefer_not_to_say", label: "Prefer not to say" },
];

/**
 * The three a person can be looking for. "Prefer not to say" is an answer about
 * yourself, not a thing to seek, and the database refuses it in interested_in.
 */
export const SEEKING = GENDERS.filter((g) => g.id !== "prefer_not_to_say");

export const DEFAULT_GENDER = "prefer_not_to_say";

export const genderLabel = (id) =>
  GENDERS.find((g) => g.id === id)?.label ?? "Prefer not to say";

/**
 * Whether `seeker` would be shown `candidate`, one direction only.
 *
 * An empty interest means everyone. Somebody who would rather not say their
 * gender is shown to anyone who is looking for someone, rather than hidden from
 * everyone — the alternative turns that answer into a way to vanish from the
 * app.
 */
export function wouldSee(seeker, candidate) {
  const wanted = seeker?.interestedIn ?? [];
  if (wanted.length === 0) return true;
  if (candidate?.gender === "prefer_not_to_say") return true;
  return wanted.includes(candidate?.gender);
}

/** Mutual interest: each would be shown the other. Mirrors public_profiles. */
export const mutuallyInterested = (a, b) => wouldSee(a, b) && wouldSee(b, a);
