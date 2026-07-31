// spec: specs/pull-request-list.md
// seed: tests/seed.spec.ts

import { expect, test, type Page } from "@playwright/test";

import { loadPullRequestList, pullRequest, singlePage } from "../fixtures/pull-requests";

const FIRST_PAGE = [1, 2, 3].map((number) =>
  pullRequest({ number, title: `Pull request number ${number}` }),
);
const SECOND_PAGE = [4, 5, 6].map((number) =>
  pullRequest({ number, title: `Pull request number ${number}` }),
);

function list(page: Page) {
  return page.getByRole("list", { name: "Pull requests" });
}

function listItems(page: Page) {
  return list(page).getByRole("listitem");
}

function loadMoreButton(page: Page) {
  return page.getByRole("button", { name: "Load more pull requests" });
}

/** How many times the second page was actually requested, by its exact cursor. */
function cursorARequestCount(requests: URL[]) {
  return requests.filter((request) => request.searchParams.get("cursor") === "CURSOR_A").length;
}

test.describe("Pagination (Load More)", () => {
  test("Load More button appends new items to the existing list without replacing it", async ({
    page,
  }) => {
    // 1. Mock first page: GET /api/pull-requests?limit=20 (no cursor) returns items #1-3 with nextCursor:
    // 'CURSOR_A'. Mock second page: a request whose query includes cursor=CURSOR_A returns items #4-6 with
    // nextCursor: null. Navigate to `/`.
    const requests = await loadPullRequestList(page, (query) =>
      query.get("cursor") === "CURSOR_A"
        ? { items: SECOND_PAGE, nextCursor: null }
        : { items: FIRST_PAGE, nextCursor: "CURSOR_A" },
    );

    // TODO: investigate whether this can go back to a synchronous assertion.
    // page.goto()'s `load` event can resolve before the SPA has hydrated and
    // fired its first fetch (observed gap: tens to several hundred ms,
    // apparently proportional to host CPU contention at test-run time), so
    // checking `requests` synchronously right after navigation is a real race
    // rather than an app bug — poll briefly instead.
    await expect.poll(() => requests.length).toBe(1);
    await expect(listItems(page)).toHaveCount(FIRST_PAGE.length);
    await expect(loadMoreButton(page)).toBeVisible();
    await expect(loadMoreButton(page)).toBeEnabled();

    // 2. Click the 'Load more' button.
    await loadMoreButton(page).click();

    // expect: The outgoing request's query string contains cursor=CURSOR_A (the exact nextCursor value from the
    // first response) — assert this on the captured request, not merely inferred from the result.
    // expect: After the response resolves, items #1-3 remain present in the DOM in their original order/positions
    // AND items #4-6 are newly appended after them, for a total of 6 items.
    // expect: The list container's item count goes from 3 to 6, never dropping to 0 or flashing an empty state
    // during the append.
    await expect(listItems(page)).toHaveCount(FIRST_PAGE.length + SECOND_PAGE.length);

    expect(requests).toHaveLength(2);
    expect(requests.at(-1)?.searchParams.get("cursor")).toBe("CURSOR_A");

    for (const [index, item] of [...FIRST_PAGE, ...SECOND_PAGE].entries()) {
      await expect(
        listItems(page).nth(index).getByRole("link", { name: item.title }),
      ).toBeVisible();
    }
  });

  test("Load More button is absent or disabled once nextCursor is null", async ({ page }) => {
    // 1. Mock a single-page response of 3 items with `nextCursor: null`. Navigate to `/`.
    await loadPullRequestList(page, singlePage(FIRST_PAGE));

    await expect(listItems(page)).toHaveCount(FIRST_PAGE.length);

    // expect: The 'Load more' button is either not present in the DOM, or present but `disabled` — assert one
    // specific, stated behaviour (recommend: not rendered at all, to avoid a dead disabled control encountering
    // ambiguous a11y semantics).
    await expect(loadMoreButton(page)).toHaveCount(0);
  });

  test("Load More shows a loading state and disables the button while the request is in-flight", async ({
    page,
  }) => {
    // 1. Mock first page returning 3 items with nextCursor: 'CURSOR_A'. Mock the cursor=CURSOR_A request with an
    // artificial delay before resolving with 3 more items. Navigate to `/` and click 'Load more'.
    const requests = await loadPullRequestList(page, async (query) => {
      if (query.get("cursor") === "CURSOR_A") {
        // Delayed on the Node side rather than in the page, since the page clock is frozen.
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return { items: SECOND_PAGE, nextCursor: null };
      }
      return { items: FIRST_PAGE, nextCursor: "CURSOR_A" };
    });

    await expect(listItems(page)).toHaveCount(FIRST_PAGE.length);
    await expect(loadMoreButton(page)).toBeEnabled();
    await loadMoreButton(page).click();

    // 2. Immediately after the click, and before the delayed response resolves, assert the button enters a
    // busy/loading state (e.g. aria-busy="true", or accessible name changes to include 'Loading', or `disabled`
    // attribute is set) and cannot be clicked again (a second click during this window must not fire a duplicate
    // request — assert only one request with cursor=CURSOR_A was made).
    await expect(loadMoreButton(page)).toHaveAttribute("aria-busy", "true");
    await expect(loadMoreButton(page)).toBeDisabled();

    // A second click while the button is busy/disabled must not fire a duplicate request.
    await loadMoreButton(page).click({ force: true });
    await expect.poll(() => cursorARequestCount(requests)).toBe(1);

    // expect: Once the delayed response resolves, loading state clears and the button returns to its normal
    // enabled state (or disappears, per the end-of-pagination scenario, if this was the last page).
    await expect(listItems(page)).toHaveCount(FIRST_PAGE.length + SECOND_PAGE.length);
    expect(cursorARequestCount(requests)).toBe(1);

    // This was the last page (nextCursor: null), so per §5.2 the button disappears entirely.
    await expect(loadMoreButton(page)).toHaveCount(0);
  });

  test("A failed Load More request shows an error and preserves the existing list", async ({
    page,
  }) => {
    // 1. Mock first page returning 3 items with nextCursor: 'CURSOR_A'. Mock the cursor=CURSOR_A request to fulfil
    // with HTTP 500 and a JSON error body. Navigate to `/` and click 'Load more'.
    const requests = await loadPullRequestList(page, (query) =>
      query.get("cursor") === "CURSOR_A"
        ? { status: 500, body: { message: "Internal server error" } }
        : { items: FIRST_PAGE, nextCursor: "CURSOR_A" },
    );

    await expect(listItems(page)).toHaveCount(FIRST_PAGE.length);
    await loadMoreButton(page).click();

    // 2. Assert an error indication is shown to the user (e.g. an alert/status region with a human-readable
    // message near the button) without discarding the 3 already-rendered items. Assert the 'Load more' button
    // returns to an enabled (non-loading, non-disabled) state so the user can retry, rather than being permanently
    // stuck in a loading or disabled state.
    await expect(page.getByRole("alert")).toBeVisible();

    await expect(listItems(page)).toHaveCount(FIRST_PAGE.length);
    for (const item of FIRST_PAGE) {
      await expect(list(page).getByRole("link", { name: item.title })).toBeVisible();
    }

    await expect(loadMoreButton(page)).toBeEnabled();
    await expect(loadMoreButton(page)).not.toHaveAttribute("aria-busy", "true");
    expect(cursorARequestCount(requests)).toBe(1);

    // expect: The button is retryable — clicking it again re-issues the cursor=CURSOR_A request.
    await loadMoreButton(page).click();
    await expect.poll(() => cursorARequestCount(requests)).toBe(2);
  });
});
