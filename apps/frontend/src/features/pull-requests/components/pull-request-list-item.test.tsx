import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PullRequest } from "@/generated/models";

import { PullRequestListItem } from "./pull-request-list-item";

const NOW = new Date("2026-01-15T12:00:00.000Z");

/** A 1x1 transparent PNG, so the avatar resolves without any network access. */
const AVATAR_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

const ITEM: PullRequest = {
  id: "PR_1",
  title: "Add cursor pagination to the pull request list",
  state: "open",
  author: { username: "octocat", profileImage: AVATAR_URL },
  repository: { owner: "keys", name: "platform" },
  url: "https://example.test/pull/412",
  createdAt: "2026-01-10T09:00:00.000Z",
  updatedAt: "2026-01-13T12:00:00.000Z",
};

/** `<li>` needs a `<ul>`/`<ol>` ancestor for correct list semantics. */
function renderItem(pullRequest: PullRequest = ITEM) {
  return render(
    <ul>
      <PullRequestListItem pullRequest={pullRequest} />
    </ul>,
  );
}

// The item reads the system clock to render its relative timestamp, so the
// clock is frozen to keep that text deterministic.
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("PullRequestListItem", () => {
  // `find` rather than `get`: the avatar only commits to rendering the image
  // once it has loaded, which is what lets it swap in a fallback when the URL
  // turns out to be dead.
  it("gives the avatar a descriptive alt text, not just the bare username", async () => {
    renderItem();

    const avatar = await screen.findByRole("img", { name: "Avatar for octocat" });
    expect((avatar as HTMLImageElement).src).toBe(ITEM.author.profileImage);
  });

  it("falls back to an initial rather than a broken image when the avatar URL is dead", async () => {
    renderItem({
      ...ITEM,
      author: { username: "octocat", profileImage: "https://example.test/missing.png" },
    });

    expect(await screen.findByText("O")).toBeDefined();
    expect(screen.queryByRole("img", { name: "Avatar for octocat" })).toBeNull();
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
    expect(time.textContent).toBe("2 days ago");
  });

  it("has no accessibility violations", async () => {
    const { container } = renderItem();
    await screen.findByRole("img", { name: "Avatar for octocat" });

    expect(await axe.run(container)).toHaveNoViolations();
  });
});
