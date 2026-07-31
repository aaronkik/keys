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
      body: `Pull request number ${number} adds a feature and this body text is long enough to exceed fifty characters.`,
    }),
  );
}

test.describe("Rendering — Happy Path List Item Fields", () => {
  test("Desktop viewport renders all six required fields per list item", async ({ page }) => {
    // 1. Set viewport to 1440x900 (desktop). Intercept GET /api/pull-requests* and fulfil with a fixed JSON
    // fixture of 3 items, each with deterministic id, number, title, state: 'open', draft: false, author.login,
    // author.avatarUrl, repository.owner, repository.name, url, a fixed createdAt/updatedAt ISO string,
    // mergedAt: null, plus the forthcoming body (a string over 50 characters) and sha (a 40-char hex string)
    // fields. Set nextCursor: null. Navigate to `/`.
    const items = threeItems("Ship pull request list item number");
    const requests = await loadPullRequestList(page, () => ({ items, nextCursor: null }));

    expect(requests).toHaveLength(1);
    expect(requests[0]?.pathname).toContain("/api/pull-requests");

    // 2. For each of the 3 rendered list items, assert the following are all visible: (1) an <img>/avatar with a
    // non-empty, descriptive alt (not blank, not the URL, not the login alone — e.g. "Avatar for octocat"); (2)
    // the PR title text; (3) a visible state indicator text/label of 'Open'; (4) a last-updated time element; (5)
    // a text node containing exactly the first 50 characters of the fixture's body field, i.e. body.slice(0, 50);
    // (6) a link whose accessible name/visible text is derived from the sha (the first 7 characters,
    // sha.slice(0,7)) and whose href equals the expected hosted-platform commit URL for that repository.
    const list = page.getByRole("list", { name: "Pull requests" });
    const listItems = list.getByRole("listitem");
    await expect(listItems).toHaveCount(items.length);

    for (const [index, item] of items.entries()) {
      const listItem = listItems.nth(index);
      const expectedPreview = item.body.slice(0, 50);
      const expectedShaHref = `https://github.com/${item.repository.owner}/${item.repository.name}/commit/${item.sha}`;

      await expect(
        listItem.getByRole("img", { name: `Avatar for ${item.author.login}` }),
      ).toBeVisible();

      const titleLink = listItem.getByRole("link", { name: item.title });
      await expect(titleLink).toBeVisible();
      await expect(titleLink).toHaveAttribute("href", item.url);

      await expect(listItem.getByTestId("pr-state")).toHaveText("Open");
      await expect(listItem.getByTestId("pr-updated")).toBeVisible();

      const bodyPreview = listItem.getByTestId("pr-body-preview");
      await expect(bodyPreview).toBeVisible();
      await expect(bodyPreview).toHaveText(expectedPreview);
      await expect(bodyPreview).not.toHaveText(item.body);

      const shaLink = listItem.getByRole("link", { name: /commit [0-9a-f]{7}/i });
      await expect(shaLink).toBeVisible();
      await expect(shaLink).toHaveAttribute("href", expectedShaHref);
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

    const headingLevels = [2, 3, 4, 5, 6];
    const headingCounts = await Promise.all(
      headingLevels.map((level) => page.getByRole("heading", { level }).count()),
    );

    for (let i = 1; i < headingCounts.length; i += 1) {
      if ((headingCounts[i] ?? 0) > 0) {
        expect(
          headingCounts[i - 1],
          `heading level h${headingLevels[i]} is present without an h${headingLevels[i - 1]} before it`,
        ).toBeGreaterThan(0);
      }
    }
  });
});
