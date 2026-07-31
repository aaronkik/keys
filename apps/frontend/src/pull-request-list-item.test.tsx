import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";

import type { PullRequest } from "./generated/models";
import { PullRequestListItem } from "./pull-request-list-item";

const NOW = new Date("2026-01-15T12:00:00.000Z");

const ITEM: PullRequest = {
  id: "PR_1",
  title: "Add cursor pagination to the pull request list",
  state: "open",
  author: { username: "octocat", profileImage: "https://example.test/a.png" },
  repository: { owner: "keys", name: "platform" },
  url: "https://example.test/pull/412",
  createdAt: "2026-01-10T09:00:00.000Z",
  updatedAt: "2026-01-13T12:00:00.000Z",
};

/** `<li>` needs a `<ul>`/`<ol>` ancestor for correct list semantics. */
function renderItem(pullRequest: PullRequest = ITEM) {
  return render(
    <ul>
      <PullRequestListItem pullRequest={pullRequest} now={NOW} />
    </ul>,
  );
}

afterEach(() => {
  cleanup();
});

describe("PullRequestListItem", () => {
  it("gives the avatar a descriptive alt text, not just the bare username", () => {
    renderItem();

    const avatar = screen.getByRole("img", { name: "Avatar for octocat" });
    expect((avatar as HTMLImageElement).src).toBe(ITEM.author.profileImage);
  });

  it("links the title to the pull request's URL", () => {
    renderItem();

    const link = screen.getByRole("link", { name: ITEM.title });
    expect(link.getAttribute("href")).toBe(ITEM.url);
  });

  it("renders a truthful, visible state label", () => {
    renderItem({ ...ITEM, state: "closed" });

    expect(screen.getByTestId("pr-state").textContent).toBe("Closed");
  });

  it("keeps the machine-readable ISO timestamp on the time element regardless of its rendered text", () => {
    renderItem();

    const time = screen.getByTestId("pr-updated");
    expect(time.getAttribute("datetime")).toBe(ITEM.updatedAt);
    expect(time.tagName).toBe("TIME");
  });

  it("has no accessibility violations", async () => {
    const { container } = renderItem();

    expect(await axe.run(container)).toHaveNoViolations();
  });
});
