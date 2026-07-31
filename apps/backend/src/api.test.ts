import { describe, expect, it } from "vitest";

import app from "./generated/api";
import { ListPullRequestsResponse } from "./generated/api.zod";
import { pullRequests } from "./stub-data";

describe("GET /pull-requests", () => {
  it("returns a page matching the generated response schema", async () => {
    const res = await app.request("/pull-requests?limit=2");

    expect(res.status).toBe(200);
    // Parsing with the schema orval generated from the TypeSpec contract is
    // what makes this a contract test: it fails if the API drifts from the spec.
    const body = ListPullRequestsResponse.parse(await res.json());
    expect(body.items).toHaveLength(2);
    expect(body.nextCursor).toBe("2");
  });

  it("walks every page via nextCursor and terminates", async () => {
    const seen: number[] = [];
    let cursor: string | null = null;

    do {
      const query = new URLSearchParams({ limit: "2" });
      if (cursor) query.set("cursor", cursor);

      const res = await app.request(`/pull-requests?${query.toString()}`);
      expect(res.status).toBe(200);

      const page = ListPullRequestsResponse.parse(await res.json());
      seen.push(...page.items.map((item) => item.number));
      cursor = page.nextCursor;
    } while (cursor !== null);

    expect(seen).toEqual(pullRequests.map((item) => item.number));
  });

  it("applies the documented default limit when none is given", async () => {
    const res = await app.request("/pull-requests");

    expect(res.status).toBe(200);
    const body = ListPullRequestsResponse.parse(await res.json());
    expect(body.items.length).toBeLessThanOrEqual(20);
  });

  it("rejects a limit above the documented maximum", async () => {
    const res = await app.request("/pull-requests?limit=999");

    expect(res.status).toBe(400);
  });
});
