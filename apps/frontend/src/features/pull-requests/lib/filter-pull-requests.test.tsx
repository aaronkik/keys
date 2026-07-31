import { describe, expect, it } from "vitest";

import type { PullRequest } from "@/generated/models";

import { filterPullRequests } from "./filter-pull-requests";

function item(title: string): PullRequest {
  return {
    id: title,
    title,
    state: "open",
    author: { username: "octocat", profileImage: "" },
    repository: { owner: "keys", name: "platform" },
    url: "https://example.test/pull/1",
    createdAt: "2026-01-10T09:00:00.000Z",
    updatedAt: "2026-01-13T12:00:00.000Z",
  };
}

const ITEMS = [item("Refactor pagination"), item("Add search box"), item("Fix REFACTORING typo")];

function titles(results: PullRequest[]) {
  return results.map((result) => result.title);
}

describe("filterPullRequests", () => {
  it("returns everything for an empty or whitespace-only query", () => {
    expect(filterPullRequests(ITEMS, "")).toEqual(ITEMS);
    expect(filterPullRequests(ITEMS, "   ")).toEqual(ITEMS);
  });

  it("matches substrings of the title regardless of case", () => {
    expect(titles(filterPullRequests(ITEMS, "refactor"))).toEqual([
      "Refactor pagination",
      "Fix REFACTORING typo",
    ]);
  });

  it("ignores surrounding whitespace in the query", () => {
    expect(titles(filterPullRequests(ITEMS, "  search  "))).toEqual(["Add search box"]);
  });

  it("returns nothing when no title matches", () => {
    expect(filterPullRequests(ITEMS, "zzzznomatch")).toEqual([]);
  });
});
