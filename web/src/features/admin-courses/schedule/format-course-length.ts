const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

/** "2 hours 30 minutes": whole minutes, in days, hours and minutes (no zero parts). */
export function formatCourseLength(durationMs: number): string {
  const totalMinutes = Math.floor(durationMs / MS_PER_MINUTE);
  const parts = [
    [Math.floor(totalMinutes / MINUTES_PER_DAY), "day"],
    [Math.floor((totalMinutes % MINUTES_PER_DAY) / MINUTES_PER_HOUR), "hour"],
    [totalMinutes % MINUTES_PER_HOUR, "minute"],
  ] as const;

  const shown = parts
    .filter(([count]) => count > 0)
    .map(([count, unit]) => plural(count, unit));
  return shown.length > 0 ? shown.join(" ") : plural(0, "minute");
}
