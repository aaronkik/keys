import { describe, expect, it } from "vitest";

import { formatRelativeTime } from "./format-relative-time";

const NOW = new Date("2026-01-15T12:00:00.000Z");

describe("formatRelativeTime", () => {
  it("renders a past day as '<n> days ago'", () => {
    expect(formatRelativeTime("2026-01-13T12:00:00.000Z", NOW)).toBe("2 days ago");
  });

  it("renders one day in the future as 'tomorrow'", () => {
    expect(formatRelativeTime("2026-01-16T12:00:00.000Z", NOW)).toBe("tomorrow");
  });

  it("renders sub-5-second elapsed time as 'just now', not '0 seconds ago'", () => {
    expect(formatRelativeTime("2026-01-15T12:00:02.000Z", NOW)).toBe("just now");
  });

  it("renders an hour-scale past time in hours", () => {
    expect(formatRelativeTime("2026-01-15T09:00:00.000Z", NOW)).toBe("3 hours ago");
  });
});
