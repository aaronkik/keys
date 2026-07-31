const UNITS: Array<{ limit: number; divisor: number; unit: Intl.RelativeTimeFormatUnit }> = [
  { limit: 60, divisor: 1, unit: "second" },
  { limit: 3600, divisor: 60, unit: "minute" },
  { limit: 86400, divisor: 3600, unit: "hour" },
  { limit: 2592000, divisor: 86400, unit: "day" },
  { limit: 31536000, divisor: 2592000, unit: "month" },
  { limit: Infinity, divisor: 31536000, unit: "year" },
];

const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** Renders `iso` relative to `now`, e.g. "2 days ago" or "in 3 hours". */
export function formatRelativeTime(iso: string, now: Date): string {
  const elapsedSeconds = Math.round((new Date(iso).getTime() - now.getTime()) / 1000);
  const absoluteSeconds = Math.abs(elapsedSeconds);

  if (absoluteSeconds < 5) return "just now";

  const { divisor, unit } =
    UNITS.find(({ limit }) => absoluteSeconds < limit) ?? UNITS[UNITS.length - 1]!;

  return formatter.format(Math.round(elapsedSeconds / divisor), unit);
}
