import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { PullRequest } from "@/generated/models";

import { PullRequestList } from "./pull-request-list";

function item(overrides: Partial<PullRequest> & { id: string }): PullRequest {
  return {
    title: `Pull request ${overrides.id}`,
    state: "open",
    author: { username: "octocat", profileImage: "" },
    repository: { owner: "keys", name: "platform" },
    url: `https://example.test/pull/${overrides.id}`,
    createdAt: "2026-01-10T09:00:00.000Z",
    updatedAt: "2026-01-13T12:00:00.000Z",
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe("PullRequestList", () => {
  it("renders one list item per pull request, in the order given", () => {
    render(
      <PullRequestList
        items={[item({ id: "PR_1", title: "First" }), item({ id: "PR_2", title: "Second" })]}
      />,
    );

    const titles = screen
      .getAllByRole("listitem")
      .map((listItem) => listItem.querySelector("a")?.textContent);

    expect(titles).toEqual(["First", "Second"]);
  });

  it("exposes the list under an accessible name", () => {
    render(<PullRequestList items={[item({ id: "PR_1" })]} />);

    expect(screen.getByRole("list", { name: "Pull requests" })).toBeDefined();
  });

  // An empty result set is the caller's story to tell — the list element stays
  // put so assistive tech does not lose the region it was reading.
  it("renders an empty list rather than nothing when there are no items", () => {
    render(<PullRequestList items={[]} />);

    expect(screen.getByRole("list", { name: "Pull requests" })).toBeDefined();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });
});
