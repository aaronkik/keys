// spec: specs/pull-request-list.md

import { expect, test } from "@playwright/test";

import { loadPullRequestList, pullRequest, singlePage } from "./fixtures/pull-requests";

/**
 * Starting point every scenario copies: stub the list endpoint from fixtures,
 * then load the homepage. No backend, no real network.
 */
test("seed", async ({ page }) => {
  await loadPullRequestList(
    page,
    singlePage([pullRequest({ number: 1, title: "Seed pull request" })]),
  );

  await expect(page.getByRole("heading", { level: 1, name: "Pull requests" })).toBeVisible();
});
