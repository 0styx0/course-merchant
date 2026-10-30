/** Whether a zone name contains the query, ignoring case; `_` reads as a space. */
export function matchesTimeZoneQuery(timeZone: string, query: string) {
  const name = timeZone.replaceAll("_", " ").toLowerCase();
  return name.includes(query.trim().toLowerCase());
}
