import { describe, expect, it } from "vitest";

import { decodeCursor, encodeCursor } from "./cursor";

describe("cursor", () => {
  it("round-trips a page number", () => {
    expect(decodeCursor(encodeCursor(7))).toBe(7);
  });

  it("survives being carried in a query string", () => {
    const cursor = encodeCursor(42);

    expect(cursor).toBe(encodeURIComponent(cursor));
  });

  it.each([
    ["not base64 at all", "not-a-real-cursor"],
    ["base64 that is not JSON", Buffer.from("nonsense").toString("base64url")],
    ["a page before the first", Buffer.from(JSON.stringify({ page: 0 })).toString("base64url")],
    ["a fractional page", Buffer.from(JSON.stringify({ page: 1.5 })).toString("base64url")],
  ])("refuses %s", (_description, cursor) => {
    expect(decodeCursor(cursor)).toBeNull();
  });
});
