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

function filterCombobox(page: Page) {
  return page.getByRole("combobox", { name: "Filter by state" });
}

/** The combobox trigger also contains a decorative, aria-hidden chevron
 * icon whose fallback glyph is included in the trigger's raw text — scoped
 * to the value span itself so text assertions read only the selected
 * option's label. */
function filterValueText(page: Page) {
  return filterCombobox(page).locator('[data-slot="select-value"]');
}

/** Opens the filter select and picks an option — a select has no bare
 * "click this option" affordance the way a radio does, since the option
 * only exists in the DOM once the popup is open. */
async function selectFilter(page: Page, name: "Open" | "Closed" | "All") {
  await filterCombobox(page).click();
  await page.getByRole("option", { name }).click();
}

test.describe("Filtering by State", () => {
  test("Filter control exposes open/closed options with accessible name", async ({ page }) => {
    // 1. Mock a default unfiltered response with a mix of `open` and `closed` items. Navigate to `/`.
    const items = [
      pullRequest({ number: 1, state: "open" }),
      pullRequest({ number: 2, state: "closed" }),
    ];
    await loadPullRequestList(page, singlePage(items));

    // 2. Locate the filter control by accessible role and name (a combobox with an accessible label "Filter by
    // state" — assert it has a non-empty accessible name via aria-label). Assert an 'Open' option/value and a
    // 'Closed' option/value are both present and selectable.
    await expect(filterCombobox(page)).toBeVisible();
    await filterCombobox(page).click();
    await expect(page.getByRole("option", { name: "Open" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Closed" })).toBeVisible();
  });

  test("Selecting 'Open' updates the URL query param and filters the list", async ({ page }) => {
    // 1. Mock GET /api/pull-requests (no state param) to return 2 open + 1 closed item, nextCursor: null.
    // Navigate to `/`. Assert 3 items are rendered initially.
    const openItems = [
      pullRequest({ number: 1, state: "open" }),
      pullRequest({ number: 2, state: "open" }),
    ];
    const allItems = [...openItems, pullRequest({ number: 3, state: "closed" })];

    const requests = await loadPullRequestList(page, (query) =>
      query.get("state") === "open"
        ? { items: openItems, nextCursor: null }
        : { items: allItems, nextCursor: null },
    );

    await expect(listItems(page)).toHaveCount(allItems.length);

    // 2. Additionally register a route matcher for GET /api/pull-requests*state=open* that returns only the 2
    // open items. Select the 'Open' filter option via the control found above.
    await selectFilter(page, "Open");

    await expect(page).toHaveURL(/state=open/);
    await expect.poll(() => requests.at(-1)?.searchParams.get("state")).toBe("open");
    await expect(listItems(page)).toHaveCount(openItems.length);
  });

  test("Selecting 'Closed' updates the URL and filters the list", async ({ page }) => {
    // 1. Mock the base list as above and a state=closed route returning only the 1 closed item. Navigate to `/`,
    // then select 'Closed'.
    const closedItem = pullRequest({ number: 2, state: "closed" });
    const allItems = [pullRequest({ number: 1, state: "open" }), closedItem];

    const requests = await loadPullRequestList(page, (query) =>
      query.get("state") === "closed"
        ? { items: [closedItem], nextCursor: null }
        : { items: allItems, nextCursor: null },
    );

    await expect(listItems(page)).toHaveCount(allItems.length);

    await selectFilter(page, "Closed");

    // expect: URL becomes /?state=closed. expect: Request carries state=closed. expect: Only the closed item
    // renders.
    await expect(page).toHaveURL(/state=closed/);
    await expect.poll(() => requests.at(-1)?.searchParams.get("state")).toBe("closed");
    await expect(listItems(page)).toHaveCount(1);
  });

  test("Deep-linking to ?state=open restores the filtered view on initial load", async ({
    page,
  }) => {
    // 1. Mock `state=open` route to return 2 open items only. Navigate directly to `/?state=open` (fresh browser
    // context, no prior interaction).
    const openItems = [
      pullRequest({ number: 1, state: "open" }),
      pullRequest({ number: 2, state: "open" }),
    ];
    const requests = await loadPullRequestList(page, singlePage(openItems), "/?state=open");

    // 2. Assert the initial request fired on page load already includes state=open (i.e. the filter is read from
    // the URL before/at first fetch, not applied client-side after an unfiltered fetch). Assert the filter
    // control's UI reflects 'Open' as the selected value. Assert only the 2 open items render.
    // TODO: investigate whether this can go back to a synchronous assertion.
    // page.goto()'s `load` event can resolve before the SPA has hydrated and
    // fired its first fetch (observed gap: tens to several hundred ms,
    // apparently proportional to host CPU contention at test-run time), so
    // checking `requests` synchronously right after navigation is a real race
    // rather than an app bug — poll briefly instead.
    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0]?.searchParams.get("state")).toBe("open");

    await expect(filterValueText(page)).toHaveText("Open");
    await expect(listItems(page)).toHaveCount(openItems.length);
  });

  test("Deep-linking to an invalid ?state= value falls back to a defined default without crashing", async ({
    page,
  }) => {
    // 1. Mock the default (no state) route. Navigate to `/?state=bogus`.
    const items = [
      pullRequest({ number: 1, state: "open" }),
      pullRequest({ number: 2, state: "closed" }),
    ];
    const requests = await loadPullRequestList(page, singlePage(items), "/?state=bogus");

    // 2. Assert the page does not crash/error-boundary out. Assert it falls back to a defined default (either: no
    // filter applied / 'all states' request, or the filter control shows no option selected) — this suite's
    // decided fallback: no filter applied, so the request carries no state param, all items render, and the
    // filter control shows 'All'.
    await expect(page.getByRole("heading", { level: 1, name: "Pull requests" })).toBeVisible();

    // TODO: investigate whether this can go back to a synchronous assertion.
    // page.goto()'s `load` event can resolve before the SPA has hydrated and
    // fired its first fetch (observed gap: tens to several hundred ms,
    // apparently proportional to host CPU contention at test-run time), so
    // checking `requests` synchronously right after navigation is a real race
    // rather than an app bug — poll briefly instead.
    await expect.poll(() => requests.length).toBeGreaterThan(0);
    expect(requests.at(-1)?.searchParams.get("state")).toBeNull();
    await expect(listItems(page)).toHaveCount(items.length);

    await expect(filterValueText(page)).toHaveText("All");
  });

  test("Browser back/forward navigates through filter history", async ({ page }) => {
    // 1. Mock base, state=open, and state=closed routes with distinct fixture item sets (distinguishable by
    // title). Navigate to `/`. Select 'Open'. Then select 'Closed'.
    const baseOpenItem = pullRequest({ number: 1, state: "open", title: "Base list open item" });
    const baseClosedItem = pullRequest({
      number: 2,
      state: "closed",
      title: "Base list closed item",
    });
    const filteredOpenItem = pullRequest({ number: 1, state: "open", title: "Open-filtered item" });
    const filteredClosedItem = pullRequest({
      number: 2,
      state: "closed",
      title: "Closed-filtered item",
    });

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

    await selectFilter(page, "Open");
    await expect(page).toHaveURL(/state=open/);
    await expect(listItems(page)).toHaveCount(1);
    await expect(list(page).getByRole("link", { name: filteredOpenItem.title })).toBeVisible();

    await selectFilter(page, "Closed");
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
    await expect(filterValueText(page)).toHaveText("Open");

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
    await expect(filterValueText(page)).toHaveText("Open");
  });
});
