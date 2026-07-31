// spec: specs/pull-request-list.md
// seed: tests/seed.spec.ts

import { expect, test } from "@playwright/test";

import { loadPullRequestList, pullRequest } from "../fixtures/pull-requests";

// Both scenarios are specified at the desktop breakpoint, the only one where
// every field is revealed per the responsive contract in §3.
test.use({ viewport: { width: 1440, height: 900 } });

function threeItems(titlePrefix: string) {
  return [1, 2, 3].map((number) =>
    pullRequest({
      number,
      title: `${titlePrefix} ${number}`,
    }),
  );
}

test.describe("Rendering — Happy Path List Item Fields", () => {
  test("Desktop viewport renders all required fields per list item", async ({ page }) => {
    // 1. Set viewport to 1440x900 (desktop). Intercept GET /api/pull-requests* and fulfil with a fixed JSON
    // fixture of 3 items, each with deterministic id, title, state: 'open', author.username, author.profileImage,
    // repository.owner, repository.name, url, a fixed createdAt/updatedAt ISO string. Set nextCursor: null.
    // Navigate to `/`.
    const items = threeItems("Ship pull request list item number");
    const requests = await loadPullRequestList(page, () => ({ items, nextCursor: null }));

    // Polling, not a workaround: page.goto()'s `load` event resolves before
    // the SPA has hydrated and run the route loader that fires the first
    // fetch (observed gap: tens to several hundred ms, proportional to host
    // CPU contention). Nothing the app can do closes that window in SPA mode,
    // so a synchronous read of `requests` here would assert on a race.
    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0]?.pathname).toContain("/api/pull-requests");

    // 2. For each of the 3 rendered list items, assert the following are all visible: (1) an <img>/avatar with a
    // non-empty, descriptive alt (not blank, not the URL, not the username alone — e.g. "Avatar for octocat");
    // (2) the PR title text; (3) a visible state indicator text/label of 'Open'; (4) a last-updated time element.
    const list = page.getByRole("list", { name: "Pull requests" });
    const listItems = list.getByRole("listitem");
    await expect(listItems).toHaveCount(items.length);

    for (const [index, item] of items.entries()) {
      const listItem = listItems.nth(index);

      await expect(
        listItem.getByRole("img", { name: `Avatar for ${item.author.username}` }),
      ).toBeVisible();

      const titleLink = listItem.getByRole("link", { name: item.title });
      await expect(titleLink).toBeVisible();
      await expect(titleLink).toHaveAttribute("href", item.url);

      await expect(listItem.getByTestId("pr-state")).toHaveText("Open");
      await expect(listItem.getByTestId("pr-updated")).toBeVisible();
    }
  });

  test("List uses proper semantic list markup", async ({ page }) => {
    // 1. Mock 3 items as above. Navigate to `/` at desktop viewport.
    const items = threeItems("Semantic markup pull request");
    await loadPullRequestList(page, () => ({ items, nextCursor: null }));

    // 2. Assert the container is a role=list (native <ul>/<ol> or role="list") and each rendered item is a
    // role=listitem (native <li> or role="listitem"). Assert there is exactly one <h1> on the page and no heading
    // level is skipped (e.g. no <h3> before an <h2>).
    const list = page.getByRole("list", { name: "Pull requests" });
    await expect(list).toBeVisible();

    const listItems = list.getByRole("listitem");
    await expect(listItems).toHaveCount(items.length);

    const heading1 = page.getByRole("heading", { level: 1 });
    await expect(heading1).toHaveCount(1);
  });
});
