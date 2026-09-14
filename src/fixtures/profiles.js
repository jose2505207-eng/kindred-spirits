/**
 * Seeded candidate profiles. No backend — these are the whole population.
 *
 * The birthdates are not decorative. They were chosen by searching the year
 * for a set of 35 that gives a genuine mix of verdicts for *any* user
 * birthdate, not just for one demo date: across all 365 possible readings in
 * love mode, every date sees at least four strong matches (natural fit or
 * strongly compatible) and at least one outright rejection, and the 35 cover
 * 27 distinct birth cards.
 *
 * Two known thin spots, both structural rather than fixable by reseeding:
 *   - December 31 is the Joker, so that user has an empty Kindred Spirits
 *     list and no strong matches at all. See docs/ALGORITHM.md, bug 4.
 *   - July 30 in business mode also lands with no strong match.
 *
 * No profile is itself a December 31 Joker.
 */

import { forecast } from "../../engine/kindredEngine.js";

export const PROFILES = [
  { name: "Rosa Delgado",       birthdate: "1993-01-05", bio: "Restores old bicycles. Cooks for six even when it's two." },
  { name: "Ines Okonkwo",       birthdate: "1990-03-01", bio: "Structural engineer. Swims outdoors year round and complains throughout." },
  { name: "Marcus Reyner",      birthdate: "1987-03-08", bio: "Runs a two-table pasta place. Closed Mondays, always." },
  { name: "Priya Balakrishnan", birthdate: "1990-03-09", bio: "Reads three books at once. Finishes roughly one." },
  { name: "Theo Lindqvist",     birthdate: "1999-03-20", bio: "Sound engineer for small venues. Knows every fire exit in town." },
  { name: "Amara Boateng",      birthdate: "2002-03-29", bio: "Paediatric nurse. Grows chillies on a north-facing sill and wins anyway." },
  { name: "Dev Chaudhary",      birthdate: "1999-04-05", bio: "Teaches secondary maths. Weekend birder, unembarrassed about it." },
  { name: "Noor Haddad",        birthdate: "1990-04-10", bio: "Ceramicist. Her flat is forty percent unfired mugs." },
  { name: "Elliot Vance",       birthdate: "1987-04-17", bio: "Ex-chef, now writes menus for other people. Sharp about salt." },
  { name: "Sunniva Bergström",  birthdate: "1984-04-24", bio: "Cartographer. Will detour an hour for a good ridge line." },
  { name: "Kwame Asante",       birthdate: "1999-04-29", bio: "Physio for a rugby club. Gentle hands, brutal honesty." },
  { name: "Beatriz Salgado",    birthdate: "1981-05-17", bio: "Translates Portuguese poetry. Bad at small talk, excellent at long." },
  { name: "Yusuf Demir",        birthdate: "1996-05-30", bio: "Fixes espresso machines. Drinks tea." },
  { name: "Halina Wozniak",     birthdate: "1981-06-18", bio: "Archivist. Keeps a list of every film she has walked out of." },
  { name: "Camille Trudeau",    birthdate: "1993-07-24", bio: "Landscape painter, mostly grey weather. Sings in a choir on Tuesdays." },
  { name: "Rafael Ferreira",    birthdate: "1999-07-26", bio: "Marine biologist on contract. Ashore until spring." },
  { name: "Mei-Lin Chow",       birthdate: "1999-08-03", bio: "Second violin. Learning to skate, badly, on purpose." },
  { name: "Jonah Adeyemi",      birthdate: "2002-08-04", bio: "Apprentice carpenter. Building a boat he has never sailed." },
  { name: "Sofia Kalogeras",    birthdate: "1996-08-10", bio: "Runs a dog rescue. Owns four, intended to own none." },
  { name: "Tobias Brandt",      birthdate: "1999-08-11", bio: "Climate modeller. Bakes to cope with the numbers." },
  { name: "Anjali Rao",         birthdate: "1996-08-26", bio: "Immigration lawyer. Terrible sleeper, formidable arguer." },
  { name: "Gregor Novak",       birthdate: "1981-09-30", bio: "Beekeeper and part-time locksmith. Both quieter than they sound." },
  { name: "Zainab Al-Rashid",   birthdate: "1993-10-12", bio: "Documentary editor. Notices the moment a room goes quiet." },
  { name: "Felix Moreau",       birthdate: "1990-10-27", bio: "Sommelier turned cider maker. Left the city, kept the palate." },
  { name: "Nadia Petrova",      birthdate: "1990-11-04", bio: "Neonatal researcher. Runs at five so the day cannot take it." },
  { name: "Idris Cole",         birthdate: "1987-11-11", bio: "Session drummer. Reads on tour buses, mostly history." },
  { name: "Leona Kaur",         birthdate: "1990-11-12", bio: "Set designer for theatre. Everything she owns folds flat." },
  { name: "Marco Bellini",      birthdate: "1987-11-19", bio: "Restores frescoes. Patient to a fault, allegedly." },
  { name: "Thandiwe Mbeki",     birthdate: "1999-11-23", bio: "Human rights researcher. Fluent in four languages, funny in two." },
  { name: "Anders Holm",        birthdate: "1984-11-26", bio: "Boat builder. Talks about wood the way others talk about people." },
  { name: "Valentina Cruz",     birthdate: "1990-11-28", bio: "Trauma surgeon. Off shift she gardens and says nothing." },
  { name: "Omar Sultani",       birthdate: "1999-12-17", bio: "Cartoonist for a weekly. Draws strangers on the bus." },
  { name: "Hazel Brennan",      birthdate: "1990-12-22", bio: "Midwife. Keeps a shortwave radio for the quiet hours." },
  { name: "Stefan Kovac",       birthdate: "1981-12-27", bio: "Glassblower. Deaf in one ear from the furnace, hears everything." },
  { name: "Juno Nakamura",      birthdate: "1993-12-30", bio: "Astronomer, radio arrays. Sleeps while the sun is up." },
];

export function ageOn(birthdate, today = new Date()) {
  const [y, m, d] = birthdate.split("-").map(Number);
  let age = today.getFullYear() - y;
  const monthNow = today.getMonth() + 1;
  if (monthNow < m || (monthNow === m && today.getDate() < d)) age -= 1;
  return age;
}

/** The profiles with a reading attached, for the connection being read. */
export function readProfiles(business) {
  return PROFILES.map((p, i) => {
    const [y, m, d] = p.birthdate.split("-").map(Number);
    return { ...p, id: i, age: ageOn(p.birthdate), fc: forecast(m, d, y, business) };
  });
}
