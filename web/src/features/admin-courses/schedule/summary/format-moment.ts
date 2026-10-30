/** "Jan 3, 2027, 9:00 AM": a moment as wall-clock time in the zone, in US style. */
export function formatMoment(ms: number, timeZone: string): string {
  return (
    new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone,
    })
      .format(ms)
      // Newer ICU puts a narrow no-break space before AM/PM.
      .replace(/\u202f/g, " ")
  );
}
