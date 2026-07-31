// spec: specs/pull-request-list.md
// seed: tests/seed.spec.ts

import { expect, test, type Page } from "@playwright/test";

import { loadPullRequestList, pullRequest, singlePage } from "../fixtures/pull-requests";

function list(page: Page) {
  return page.getByRole("list", { name: "Pull requests" });
}

function listItems(page: Page) {
  return list(page).getByRole("listitem");
}

function filterOption(page: Page, name: "Open" | "Closed") {
  return page.getByRole("radiogroup", { name: "Filter by state" }).getByRole("radio", { name });
}

test.describe("Filtering by State", () => {
  test("Filter control exposes open/closed options with accessible name", async ({ page }) => {
    // 1. Mock a default unfiltered response with a mix of `open`, `closed`, and `merged` items. Navigate to `/`.
    const items = [
      pullRequest({ number: 1, state: "open" }),
      pullRequest({ number: 2, state: "closed" }),
      pullRequest({ number: 3, state: "merged" }),
    ];
    await loadPullRequestList(page, singlePage(items));

    // 2. Locate the filter control by accessible role and name (e.g. a radiogroup with an accessible label such
    // as "Filter by state" — assert it has a non-empty accessible name via aria-label/associated <label>). Assert
    // an 'Open' option/value and a 'Closed' option/value are both present and selectable.
    await expect(page.getByRole("radiogroup", { name: "Filter by state" })).toBeVisible();
    await expect(filterOption(page, "Open")).toBeVisible();
    await expect(filterOption(page, "Closed")).toBeVisible();
  });

  test("Selecting 'Open' updates the URL query param and filters the list", async ({ page }) => {
    // 1. Mock GET /api/pull-requests (no state param) to return 2 open + 1 closed + 1 merged item, nextCursor:
    // null. Navigate to `/`. Assert 4 items are rendered initially.
    const openItems = [pullRequest({ number: 1, state: "open" }), pullRequest({ number: 2, state: "open" })];
    const allItems = [
      ...openItems,
      pullRequest({ number: 3, state: "closed" }),
      pullRequest({ number: 4, state: "merged" }),
    ];

    const requests = await loadPullRequestList(page, (query) =>
      query.get("state") === "open"
        ? { items: openItems, nextCursor: null }
        : { items: allItems, nextCursor: null },
    );

    await expect(listItems(page)).toHaveCount(allItems.length);

    // 2. Additionally register a route matcher for GET /api/pull-requests*state=open* that returns only the 2
    // open items. Select the 'Open' filter option via the control found above.
    await filterOption(page, "Open").click();

    await expect(page).toHaveURL(/state=open/);
    await expect.poll(() => requests.at(-1)?.searchParams.get("state")).toBe("open");
    await expect(listItems(page)).toHaveCount(openItems.length);
  });

  test("Selecting 'Closed' updates the URL and filters the list", async ({ page }) => {
    // 1. Mock the base list as above and a state=closed route returning only the 1 closed item. Navigate to `/`,
    // then select 'Closed'.
    const closedItem = pullRequest({ number: 2, state: "closed" });
    const allItems = [
      pullRequest({ number: 1, state: "open" }),
      closedItem,
      pullRequest({ number: 3, state: "merged" }),
    ];

    const requests = await loadPullRequestList(page, (query) =>
      query.get("state") === "closed"
        ? { items: [closedItem], nextCursor: null }
        : { items: allItems, nextCursor: null },
    );

    await expect(listItems(page)).toHaveCount(allItems.length);

    await filterOption(page, "Closed").click();

    // expect: URL becomes /?state=closed. expect: Request carries state=closed. expect: Only the closed item
    // renders.
    await expect(page).toHaveURL(/state=closed/);
    await expect.poll(() => requests.at(-1)?.searchParams.get("state")).toBe("closed");
    await expect(listItems(page)).toHaveCount(1);
  });

  test("Merged pull requests are treated as closed under the 'Closed' filter", async ({ page }) => {
    // 1. State the assumption explicitly for implementers: a PR with state: 'merged' is considered a member of
    // the 'Closed' filter bucket (GitHub's own convention: a merged PR's underlying state is closed with
    // merged=true; UI-level 'Closed' tabs conventionally include merged PRs). If the eventual UX diverges from
    // this (e.g. a third 'Merged' filter tab is added), this scenario must be updated accordingly — but absent
    // further specification, this is the behaviour under test.

    // 2. Mock the base (unfiltered) list containing 1 open, 1 closed (never merged), and 1 merged item. Mock
    // state=closed to return both the closed and the merged item (2 items). Mock state=open to return only the
    // open item (1 item). Navigate to `/`, select 'Open', assert only the open item renders. Then select
    // 'Closed', assert both the closed and the merged item render, and that each rendered item's visible state
    // label is truthful to its actual underlying state (i.e. the merged item is labelled 'Merged' or equivalent,
    // not relabelled as plain 'Closed').
    const openItem = pullRequest({ number: 1, state: "open", title: "Open feature work" });
    const closedItem = pullRequest({ number: 2, state: "closed", title: "Closed without merge" });
    const mergedItem = pullRequest({ number: 3, state: "merged", title: "Merged refactor" });

    await loadPullRequestList(page, (query) => {
      const state = query.get("state");
      if (state === "open") {
        return { items: [openItem], nextCursor: null };
      }
      if (state === "closed") {
        return { items: [closedItem, mergedItem], nextCursor: null };
      }
      return { items: [openItem, closedItem, mergedItem], nextCursor: null };
    });

    await filterOption(page, "Open").click();
    await expect(listItems(page)).toHaveCount(1);
    await expect(list(page).getByRole("link", { name: openItem.title })).toBeVisible();

    await filterOption(page, "Closed").click();
    await expect(listItems(page)).toHaveCount(2);

    const closedListItem = listItems(page).filter({ hasText: closedItem.title });
    const mergedListItem = listItems(page).filter({ hasText: mergedItem.title });
    await expect(closedListItem.getByTestId("pr-state")).toHaveText("Closed");
    await expect(mergedListItem.getByTestId("pr-state")).toHaveText("Merged");
  });

  test("Deep-linking to ?state=open restores the filtered view on initial load", async ({ page }) => {
    // 1. Mock `state=open` route to return 2 open items only. Navigate directly to `/?state=open` (fresh browser
    // context, no prior interaction).
    const openItems = [pullRequest({ number: 1, state: "open" }), pullRequest({ number: 2, state: "open" })];
    const requests = await loadPullRequestList(page, singlePage(openItems), "/?state=open");

    // 2. Assert the initial request fired on page load already includes state=open (i.e. the filter is read from
    // the URL before/at first fetch, not applied client-side after an unfiltered fetch). Assert the filter
    // control's UI reflects 'Open' as the selected value. Assert only the 2 open items render.
    expect(requests).toHaveLength(1);
    expect(requests[0]?.searchParams.get("state")).toBe("open");

    await expect(filterOption(page, "Open")).toBeChecked();
    await expect(listItems(page)).toHaveCount(openItems.length);
  });

  test("Deep-linking to an invalid ?state= value falls back to a defined default without crashing", async ({
    page,
  }) => {
    // 1. Mock the default (no state) route. Navigate to `/?state=bogus`.
    const items = [
      pullRequest({ number: 1, state: "open" }),
      pullRequest({ number: 2, state: "closed" }),
      pullRequest({ number: 3, state: "merged" }),
    ];
    const requests = await loadPullRequestList(page, singlePage(items), "/?state=bogus");

    // 2. Assert the page does not crash/error-boundary out. Assert it falls back to a defined default (either: no
    // filter applied / 'all states' request, or the filter control shows no option selected) — this suite's
    // decided fallback: no filter applied, so the request carries no state param, all items render, and no radio
    // is checked.
    await expect(page.getByRole("heading", { level: 1, name: "Pull requests" })).toBeVisible();

    expect(requests.at(-1)?.searchParams.get("state")).toBeNull();
    await expect(listItems(page)).toHaveCount(items.length);

    await expect(filterOption(page, "Open")).not.toBeChecked();
    await expect(filterOption(page, "Closed")).not.toBeChecked();
  });

  test("Browser back/forward navigates through filter history", async ({ page }) => {
    // 1. Mock base, state=open, and state=closed routes with distinct fixture item sets (distinguishable by
    // title). Navigate to `/`. Select 'Open'. Then select 'Closed'.
    const baseOpenItem = pullRequest({ number: 1, state: "open", title: "Base list open item" });
    const baseClosedItem = pullRequest({ number: 2, state: "closed", title: "Base list closed item" });
    const filteredOpenItem = pullRequest({ number: 1, state: "open", title: "Open-filtered item" });
    const filteredClosedItem = pullRequest({ number: 2, state: "closed", title: "Closed-filtered item" });

    await loadPullRequestList(page, (query) => {
      const state = query.get("state");
      if (state === "open") {
        return { items: [filteredOpenItem], nextCursor: null };
      }
      if (state === "closed") {
        return { items: [filteredClosedItem], nextCursor: null };
      }
      return { items: [baseOpenItem, baseClosedItem], nextCursor: null };
    });

    // expect: URL progresses / -> /?state=open -> /?state=closed, and each selection renders its respective item
    // set.
    await expect(page).toHaveURL("/");
    await expect(listItems(page)).toHaveCount(2);

    await filterOption(page, "Open").click();
    await expect(page).toHaveURL(/state=open/);
    await expect(listItems(page)).toHaveCount(1);
    await expect(list(page).getByRole("link", { name: filteredOpenItem.title })).toBeVisible();

    await filterOption(page, "Closed").click();
    await expect(page).toHaveURL(/state=closed/);
    await expect(listItems(page)).toHaveCount(1);
    await expect(list(page).getByRole("link", { name: filteredClosedItem.title })).toBeVisible();

    // 2. Invoke browser back navigation twice (`page.goBack()`).
    await page.goBack();
    // expect: First back returns URL to /?state=open and re-renders the open-only item set and re-selects 'Open'
    // in the control.
    await expect(page).toHaveURL(/state=open/);
    await expect(listItems(page)).toHaveCount(1);
    await expect(list(page).getByRole("link", { name: filteredOpenItem.title })).toBeVisible();
    await expect(filterOption(page, "Open")).toBeChecked();

    await page.goBack();
    // expect: Second back returns URL to / (or the prior unfiltered state) and re-renders the full unfiltered
    // item set.
    await expect(page).toHaveURL("/");
    await expect(listItems(page)).toHaveCount(2);

    // 3. Invoke browser forward navigation once (`page.goForward()`).
    await page.goForward();
    // expect: URL returns to /?state=open and the open-only item set re-renders, with the control reflecting
    // 'Open' again.
    await expect(page).toHaveURL(/state=open/);
    await expect(listItems(page)).toHaveCount(1);
    await expect(list(page).getByRole("link", { name: filteredOpenItem.title })).toBeVisible();
    await expect(filterOption(page, "Open")).toBeChecked();
  });
});
