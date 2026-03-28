/** Convert ISO week string "2024-W03" to the Monday date of that week. */
export function isoWeekToDate(week: string): Date | null {
  const match = week.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const weekNum = parseInt(match[2], 10);
  // Jan 4 is always in ISO week 1
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7; // Make Sunday = 7
  // Monday of week 1
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1);
  // Monday of target week
  const target = new Date(week1Monday);
  target.setUTCDate(week1Monday.getUTCDate() + (weekNum - 1) * 7);
  return target;
}

/** Get browser locale, falling back to fr-FR. */
function getLocale(): string {
  return typeof navigator !== "undefined" ? navigator.language : "fr-FR";
}

/** Format ISO week as short date for X-axis ticks (e.g. "15 janv."). */
export function formatWeekLabel(week: string): string {
  const date = isoWeekToDate(week);
  if (!date) return week;
  return date.toLocaleDateString(getLocale(), { day: "numeric", month: "short" });
}

/** Format ISO week as full date for tooltips (e.g. "15 janv. 2024"). */
export function formatWeekLabelFull(week: string): string {
  const date = isoWeekToDate(week);
  if (!date) return week;
  return date.toLocaleDateString(getLocale(), { day: "numeric", month: "short", year: "numeric" });
}

/** Expand an ISO week string to 7 YYYY-MM-DD date strings (Mon→Sun). */
export function isoWeekToDays(week: string): string[] {
  const monday = isoWeekToDate(week);
  if (!monday) return [];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

/** Format YYYY-MM-DD as short date for X-axis ticks (e.g. "15 janv."). */
export function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(getLocale(), { day: "numeric", month: "short", timeZone: "UTC" });
}

/** Format YYYY-MM-DD as full date for tooltips (e.g. "15 mars 2026"). */
export function formatDayLabelFull(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(getLocale(), { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** Convert ISO date (YYYY-MM-DD) to ISO week string (YYYY-WNN) for filtering. */
export function dateToISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Set to nearest Thursday (current date + 4 - current day number, make Sunday 7)
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/** Predefined colors for chart lines. */
export const LINE_COLORS = [
  "hsl(210, 90%, 55%)", // blue
  "hsl(340, 80%, 55%)", // pink
  "hsl(160, 70%, 40%)", // teal
  "hsl(30, 90%, 55%)",  // orange
  "hsl(270, 70%, 55%)", // purple
  "hsl(50, 90%, 45%)",  // gold
] as const;

/** Prefix for clinical data keys in chart data points. */
export const CLINICAL_KEY_PREFIX = "clinical_";
