/**
 * Attaching a reading to a person. The only place a profile meets the engine:
 * the database stores birthdates, and every reading is computed here.
 */

import { forecast } from "../../engine/kindredEngine.js";

export function ageOn(birthdate, today = new Date()) {
  const [y, m, d] = birthdate.split("-").map(Number);
  let age = today.getFullYear() - y;
  const monthNow = today.getMonth() + 1;
  if (monthNow < m || (monthNow === m && today.getDate() < d)) age -= 1;
  return age;
}

/** The reading for a "YYYY-MM-DD" birthdate, for the connection being read. */
export function readingFor(birthdate, business) {
  const [y, m, d] = birthdate.split("-").map(Number);
  return forecast(m, d, y, business);
}

/** A person with their age and reading attached. */
export function withReading(person, business) {
  return { ...person, age: ageOn(person.birthdate), fc: readingFor(person.birthdate, business) };
}
