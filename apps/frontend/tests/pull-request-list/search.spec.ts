// spec: specs/pull-request-list.md
// seed: tests/seed.spec.ts

import { expect, test, type Page } from "@playwright/test";

import { loadPullRequestList, pullRequest, singlePage } from "../fixtures/pull-requests";

const MATCHING_ITEM = pullRequest({ number: 1, title: "Refactor the pagination hook" });
const OTHER_ITEMS = [
  pullRequest({ number: 2, title: "Add dark mode toggle" }),
  pullRequest({ number: 3, title: "Fix flaky avatar test" }),
  pullRequest({ number: 4, title: "Update dependency versions" }),
];
const FOUR_ITEMS = [MATCHING_ITEM, ...OTHER_ITEMS];

function list(page: Page) {
  return page.getByRole("list", { name: "Pull requests" });
}

function listItems(page: Page) {
  return list(page).getByRole("listitem");
}

function searchInput(page: Page) {
  return page.getByRole("searchbox", { name: "Search pull requests" });
}

test.describe("Local Text Search", () => {
  test("Search control has an accessible name and filters already-loaded items client-side by title", async ({
    page,
  }) => {
    // 1. Mock a single-page response of 4 items with distinct titles (one containing the word 'Refactor'),
    // nextCursor: null. Navigate to `/`.
    const requests = await loadPullRequestList(page, singlePage(FOUR_ITEMS));

    // expect: A search input is present with an accessible name.
    await expect(searchInput(page)).toBeVisible();
    await expect(listItems(page)).toHaveCount(FOUR_ITEMS.length);

    const requestCountBeforeTyping = requests.length;

    // 2. Type 'refactor' (lowercase) into the search input.
    await searchInput(page).fill("refactor");

    // expect: Only the 1 item whose title contains 'Refactor' remains visible; the other 3 are hidden/removed from
    // the rendered list. The match is case-insensitive (lowercase query matches mixed-case title).
    await expect(listItems(page)).toHaveCount(1);
    await expect(list(page).getByRole("link", { name: MATCHING_ITEM.title })).toBeVisible();
    for (const item of OTHER_ITEMS) {
      await expect(list(page).getByRole("link", { name: item.title })).toHaveCount(0);
    }

    // expect: No new network request is made to /api/pull-requests as a result of typing (assert via network
    // request count before/after — search is purely client-side over already-fetched data).
    expect(requests).toHaveLength(requestCountBeforeTyping);
  });

  test.describe("body matching", () => {
    // The body preview is desktop-only per the responsive contract (§3), and this scenario asserts search matches
    // text beyond the visible 50-char preview, so it is pinned to desktop rather than run at every viewport.
    test.use({ viewport: { width: 1440, height: 900 } });

    test("Search matches against PR body as well as title", async ({ page }) => {
      // 1. Mock 4 items where the search term appears only in one item's body (not in any title). Navigate to `/`
      // and type that term into search.
      const padding = "Filler sentence to push the matching phrase well past the fifty character preview boundary. ";
      const bodyMatchItem = pullRequest({
        number: 1,
        title: "Add dark mode toggle",
        body: `${padding}This change also introduces a gadgetword sighting deep in the body text.`,
      });
      const nonMatchingItems = [
        pullRequest({ number: 2, title: "Fix flaky avatar test", body: "Stabilises the avatar fixture timing." }),
        pullRequest({ number: 3, title: "Update dependency versions", body: "Bumps a handful of dev dependencies." }),
        pullRequest({ number: 4, title: "Improve error boundary copy", body: "Clarifies the fallback error message." }),
      ];
      const items = [bodyMatchItem, ...nonMatchingItems];
      await loadPullRequestList(page, singlePage(items));

      await expect(listItems(page)).toHaveCount(items.length);
      await searchInput(page).fill("gadgetword");

      // expect: The item whose body (not title) contains the term is shown; the other 3, which match neither title
      // nor body, are hidden.
      await expect(listItems(page)).toHaveCount(1);
      await expect(list(page).getByRole("link", { name: bodyMatchItem.title })).toBeVisible();
      for (const item of nonMatchingItems) {
        await expect(list(page).getByRole("link", { name: item.title })).toHaveCount(0);
      }

      // expect: This holds even if the matching text falls beyond the first 50 characters that are visibly
      // truncated on screen — i.e. search matches the full body text, not just the visibly truncated preview.
      expect(bodyMatchItem.body.slice(0, 50)).not.toContain("gadgetword");
      await expect(listItems(page).first().getByTestId("pr-body-preview")).not.toHaveText(/gadgetword/i);
    });
  });

  test("Search updates the URL query param and deep-linking with ?q= restores the search on load", async ({
    page,
  }) => {
    // 1. Mock 4 items as above (single page, nextCursor: null). Navigate to `/` and type 'refactor' into search.
    await loadPullRequestList(page, singlePage(FOUR_ITEMS));

    await searchInput(page).fill("refactor");

    // expect: URL becomes /?q=refactor.
    await expect(page).toHaveURL(/q=refactor/);

    // 2. In a fresh navigation, go directly to `/?q=refactor` (same mocked data).
    await page.goto("/?q=refactor");

    // expect: On load, the search input is pre-populated with 'refactor'.
    await expect(searchInput(page)).toHaveValue("refactor");

    // expect: Only the matching item(s) are rendered immediately, without requiring the user to retype the query.
    await expect(listItems(page)).toHaveCount(1);
    await expect(list(page).getByRole("link", { name: MATCHING_ITEM.title })).toBeVisible();
  });

  test("No-results empty state and clearing search restores the full list", async ({ page }) => {
    // 1. Mock 4 items, none containing the string 'zzzznomatch'. Navigate to `/` and type 'zzzznomatch' into
    // search.
    await loadPullRequestList(page, singlePage(FOUR_ITEMS));

    await expect(listItems(page)).toHaveCount(FOUR_ITEMS.length);
    await searchInput(page).fill("zzzznomatch");

    // expect: A no-results empty state message is shown (e.g. "No pull requests match your search"), and zero list
    // items are rendered. The empty state is announced accessibly (present as visible text associated with the
    // list), not solely conveyed by the absence of items.
    await expect(page.getByTestId("empty-state")).toBeVisible();
    await expect(listItems(page)).toHaveCount(0);

    // 2. Clear the search input (select all + delete, or use a visible 'clear' control if present).
    await searchInput(page).fill("");

    // expect: The URL q param is removed (URL returns to / or /?state=... if a filter was also active, but with no
    // q).
    await expect(page).not.toHaveURL(/[?&]q=/);

    // expect: All 4 original items reappear.
    await expect(listItems(page)).toHaveCount(FOUR_ITEMS.length);
  });

  test("Search combined with state filter — both params present in the URL simultaneously", async ({ page }) => {
    // 1. Mock `state=open` route to return 3 open items, two of which contain 'auth' in their titles and one which
    // does not. Navigate to `/`, select the 'Open' filter, then type 'auth' into search.
    const openItems = [
      pullRequest({ number: 1, title: "Add OAuth login support", state: "open" }),
      pullRequest({ number: 2, title: "Harden auth token refresh", state: "open" }),
      pullRequest({ number: 3, title: "Improve loading skeleton", state: "open" }),
    ];
    const defaultItems = [
      ...openItems,
      pullRequest({ number: 4, title: "Archive legacy migration script", state: "closed" }),
    ];

    const requests = await loadPullRequestList(page, (query) =>
      query.get("state") === "open"
        ? { items: openItems, nextCursor: null }
        : { items: defaultItems, nextCursor: null },
    );

    const openFilter = page
      .getByRole("radiogroup", { name: "Filter by state" })
      .getByRole("radio", { name: "Open" });
    await openFilter.click();
    await expect(openFilter).toBeChecked();

    await searchInput(page).fill("auth");

    // 2. Assert the URL contains both state=open and q=auth simultaneously (order-independent — assert via
    // URLSearchParams parsing rather than a strict string match). Assert only the 2 open items matching 'auth' are
    // rendered (i.e. search is applied within the already-filtered, already-fetched result set).
    await expect
      .poll(() => {
        const params = new URL(page.url()).searchParams;
        return { state: params.get("state"), q: params.get("q") };
      })
      .toEqual({ state: "open", q: "auth" });

    await expect(listItems(page)).toHaveCount(2);
    await expect(list(page).getByRole("link", { name: "Add OAuth login support" })).toBeVisible();
    await expect(list(page).getByRole("link", { name: "Harden auth token refresh" })).toBeVisible();
    await expect(list(page).getByRole("link", { name: "Improve loading skeleton" })).toHaveCount(0);

    // 3. Reload the page by navigating directly to the combined URL `/?state=open&q=auth` in a fresh context (same
    // mocks).
    await page.goto("/?state=open&q=auth");

    // expect: On load, both the filter control shows 'Open' selected and the search input is pre-populated with
    // 'auth', and only the intersecting 2 items render — deep-linking restores both params together.
    await expect(openFilter).toBeChecked();
    await expect(searchInput(page)).toHaveValue("auth");
    await expect(listItems(page)).toHaveCount(2);
    expect(requests.at(-1)?.searchParams.get("state")).toBe("open");
  });

  test("Search combined with paginated (appended) results covers newly loaded items too", async ({ page }) => {
    // 1. Mock first page: items #1-3 (none matching 'widget'), nextCursor: 'CURSOR_A'. Mock second page
    // (cursor=CURSOR_A): items #4-6, exactly one of which (#5) contains 'widget' in its title, nextCursor: null.
    // Navigate to `/`.
    const firstPage = [1, 2, 3].map((number) => pullRequest({ number, title: `Pull request number ${number}` }));
    const widgetItem = pullRequest({ number: 5, title: "Ship the new pricing widget" });
    const secondPage = [
      pullRequest({ number: 4, title: "Pull request number 4" }),
      widgetItem,
      pullRequest({ number: 6, title: "Pull request number 6" }),
    ];

    const requests = await loadPullRequestList(page, (query) =>
      query.get("cursor") === "CURSOR_A"
        ? { items: secondPage, nextCursor: null }
        : { items: firstPage, nextCursor: "CURSOR_A" },
    );

    await expect(listItems(page)).toHaveCount(firstPage.length);

    const loadMoreButton = page.getByRole("button", { name: "Load more pull requests" });

    // 2. Type 'widget' into search before loading more.
    await searchInput(page).fill("widget");

    // expect: Zero items render (no match yet in the loaded set of #1-3), and the no-results empty state is shown.
    await expect(listItems(page)).toHaveCount(0);
    await expect(page.getByTestId("empty-state")).toBeVisible();

    // expect: the 'Load more' button remains visible/enabled during an active search (since more data might
    // contain matches), rather than being hidden by a client-side filter with no matches.
    await expect(loadMoreButton).toBeVisible();
    await expect(loadMoreButton).toBeEnabled();

    // 3. With 'widget' still in the search box, click 'Load more' to fetch and append items #4-6.
    await loadMoreButton.click();

    // expect: The request for cursor=CURSOR_A fires exactly as in the unfiltered pagination scenario (search does
    // not alter the pagination request).
    await expect.poll(() => requests.at(-1)?.searchParams.get("cursor")).toBe("CURSOR_A");
    expect(requests.at(-1)?.searchParams.get("q")).toBeNull();

    // expect: After the append, exactly item #5 (the only one of #4-6 matching 'widget') is rendered — i.e. the
    // client-side search filter is re-applied over the full, newly-expanded set of loaded items.
    await expect(listItems(page)).toHaveCount(1);
    await expect(list(page).getByRole("link", { name: widgetItem.title })).toBeVisible();

    // expect: The empty-state message from the pre-load-more moment is no longer shown once a match exists.
    await expect(page.getByTestId("empty-state")).toHaveCount(0);
  });
});
