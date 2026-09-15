/**
 * Seeded candidate profiles: the whole population in demo mode
 * (VITE_DEMO_MODE=true), and unused when signed in.
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
 *
 * Each carries a bowtie, the emblem shown in place of a photo — see
 * src/lib/bowtie.js.
 */

import { tie } from "../lib/bowtie.js";
import { withReading } from "../lib/reading.js";

export { ageOn } from "../lib/reading.js";

export const PROFILES = [
  { name: "Rosa Delgado",       birthdate: "1993-01-05", bio: "Restores old bicycles. Cooks for six even when it's two.",
    bowtie: tie("🚲", "amber", "Six chairs, two guests, one pot.") },
  { name: "Ines Okonkwo",       birthdate: "1990-03-01", bio: "Structural engineer. Swims outdoors year round and complains throughout.",
    bowtie: tie("🌊", "slate", "Cold water, warm opinions.") },
  { name: "Marcus Reyner",      birthdate: "1987-03-08", bio: "Runs a two-table pasta place. Closed Mondays, always.",
    bowtie: tie("🍝", "claret", "Closed Mondays. Open otherwise.") },
  { name: "Priya Balakrishnan", birthdate: "1990-03-09", bio: "Reads three books at once. Finishes roughly one.",
    bowtie: tie("📚", "plum", "Three bookmarks on the go.") },
  { name: "Theo Lindqvist",     birthdate: "1999-03-20", bio: "Sound engineer for small venues. Knows every fire exit in town.",
    bowtie: tie("🎧", "slate", "Knows where the exits are.") },
  { name: "Amara Boateng",      birthdate: "2002-03-29", bio: "Paediatric nurse. Grows chillies on a north-facing sill and wins anyway.",
    bowtie: tie("🌶️", "claret", "North-facing sill, south-facing attitude.") },
  { name: "Dev Chaudhary",      birthdate: "1999-04-05", bio: "Teaches secondary maths. Weekend birder, unembarrassed about it.",
    bowtie: tie("🦉", "jade", "Show your working.") },
  { name: "Noor Haddad",        birthdate: "1990-04-10", bio: "Ceramicist. Her flat is forty percent unfired mugs.",
    bowtie: tie("🏺", "amber", "Forty percent mugs.") },
  { name: "Elliot Vance",       birthdate: "1987-04-17", bio: "Ex-chef, now writes menus for other people. Sharp about salt.",
    bowtie: tie("🧂", "ivory", "Season as you go.") },
  { name: "Sunniva Bergström",  birthdate: "1984-04-24", bio: "Cartographer. Will detour an hour for a good ridge line.",
    bowtie: tie("🧭", "jade", "Worth the detour.") },
  { name: "Kwame Asante",       birthdate: "1999-04-29", bio: "Physio for a rugby club. Gentle hands, brutal honesty.",
    bowtie: tie("🏉", "brass", "Gentle hands, honest answers.") },
  { name: "Beatriz Salgado",    birthdate: "1981-05-17", bio: "Translates Portuguese poetry. Bad at small talk, excellent at long.",
    bowtie: tie("🪶", "rose", "Better at the long talk.") },
  { name: "Yusuf Demir",        birthdate: "1996-05-30", bio: "Fixes espresso machines. Drinks tea.",
    bowtie: tie("☕", "amber", "Fixes espresso, drinks tea.") },
  { name: "Halina Wozniak",     birthdate: "1981-06-18", bio: "Archivist. Keeps a list of every film she has walked out of.",
    bowtie: tie("🎞️", "plum", "Keeps a list of walk-outs.") },
  { name: "Camille Trudeau",    birthdate: "1993-07-24", bio: "Landscape painter, mostly grey weather. Sings in a choir on Tuesdays.",
    bowtie: tie("🎨", "slate", "Fifty shades of drizzle.") },
  { name: "Rafael Ferreira",    birthdate: "1999-07-26", bio: "Marine biologist on contract. Ashore until spring.",
    bowtie: tie("🐙", "jade", "Ashore until spring.") },
  { name: "Mei-Lin Chow",       birthdate: "1999-08-03", bio: "Second violin. Learning to skate, badly, on purpose.",
    bowtie: tie("🎻", "rose", "Second violin, unsteady skater.") },
  { name: "Jonah Adeyemi",      birthdate: "2002-08-04", bio: "Apprentice carpenter. Building a boat he has never sailed.",
    bowtie: tie("⛵", "slate", "Building a boat, not yet sailing it.") },
  { name: "Sofia Kalogeras",    birthdate: "1996-08-10", bio: "Runs a dog rescue. Owns four, intended to own none.",
    bowtie: tie("🐕", "brass", "Four dogs, meant to have none.") },
  { name: "Tobias Brandt",      birthdate: "1999-08-11", bio: "Climate modeller. Bakes to cope with the numbers.",
    bowtie: tie("🥐", "amber", "Bakes when the numbers are bad.") },
  { name: "Anjali Rao",         birthdate: "1996-08-26", bio: "Immigration lawyer. Terrible sleeper, formidable arguer.",
    bowtie: tie("⚖️", "claret", "Will argue the other side for sport.") },
  { name: "Gregor Novak",       birthdate: "1981-09-30", bio: "Beekeeper and part-time locksmith. Both quieter than they sound.",
    bowtie: tie("🐝", "brass", "Bees and locks, both quieter than they sound.") },
  { name: "Zainab Al-Rashid",   birthdate: "1993-10-12", bio: "Documentary editor. Notices the moment a room goes quiet.",
    bowtie: tie("🎬", "plum", "Notices the quiet.") },
  { name: "Felix Moreau",       birthdate: "1990-10-27", bio: "Sommelier turned cider maker. Left the city, kept the palate.",
    bowtie: tie("🍏", "jade", "Left the city, kept the palate.") },
  { name: "Nadia Petrova",      birthdate: "1990-11-04", bio: "Neonatal researcher. Runs at five so the day cannot take it.",
    bowtie: tie("🌅", "rose", "Up at five, on purpose.") },
  { name: "Idris Cole",         birthdate: "1987-11-11", bio: "Session drummer. Reads on tour buses, mostly history.",
    bowtie: tie("🥁", "claret", "Keeps time, reads history.") },
  { name: "Leona Kaur",         birthdate: "1990-11-12", bio: "Set designer for theatre. Everything she owns folds flat.",
    bowtie: tie("🎭", "plum", "Everything folds flat.") },
  { name: "Marco Bellini",      birthdate: "1987-11-19", bio: "Restores frescoes. Patient to a fault, allegedly.",
    bowtie: tie("🖌️", "ivory", "Patient, allegedly.") },
  { name: "Thandiwe Mbeki",     birthdate: "1999-11-23", bio: "Human rights researcher. Fluent in four languages, funny in two.",
    bowtie: tie("🌍", "jade", "Funny in two languages.") },
  { name: "Anders Holm",        birthdate: "1984-11-26", bio: "Boat builder. Talks about wood the way others talk about people.",
    bowtie: tie("🪵", "amber", "Talks about wood like it's people.") },
  { name: "Valentina Cruz",     birthdate: "1990-11-28", bio: "Trauma surgeon. Off shift she gardens and says nothing.",
    bowtie: tie("🌿", "jade", "Says nothing, grows everything.") },
  { name: "Omar Sultani",       birthdate: "1999-12-17", bio: "Cartoonist for a weekly. Draws strangers on the bus.",
    bowtie: tie("✏️", "ivory", "Drawing you on the bus. Sorry.") },
  { name: "Hazel Brennan",      birthdate: "1990-12-22", bio: "Midwife. Keeps a shortwave radio for the quiet hours.",
    bowtie: tie("📻", "slate", "Shortwave for the quiet hours.") },
  { name: "Stefan Kovac",       birthdate: "1981-12-27", bio: "Glassblower. Deaf in one ear from the furnace, hears everything.",
    bowtie: tie("🔥", "claret", "Hears everything, one ear or not.") },
  { name: "Juno Nakamura",      birthdate: "1993-12-30", bio: "Astronomer, radio arrays. Sleeps while the sun is up.",
    bowtie: tie("🔭", "plum", "Up while the sun is down.") },
];

/** The profiles with a reading attached, for the connection being read. */
export function readProfiles(business) {
  return PROFILES.map((p, i) => withReading({ ...p, id: i }, business));
}
