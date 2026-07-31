# Pull Request List Homepage — Playwright Test Plan

## Application Overview

This plan specifies the behaviour of the homepage (`/` route) of the pull-request browser app. The homepage renders a list of pull requests fetched from `GET /api/pull-requests` (same-origin, proxied by Vite to the Hono backend on port 3001). Each list item must show an author avatar (with a meaningful `alt`), the PR title, its state (open/closed/merged), a last-updated time, the first 50 characters of the PR body, and an external link built from a commit SHA that points at the PR's repository on the hosting platform (e.g. GitHub). The page must support state filtering (open/closed, with a stated assumption for `merged`), cursor-based "load more" pagination, and client-side text search over already-loaded results — all three reflected in the URL as query parameters (`state`, `cursor` is not itself a URL param but drives pagination requests, `q`) so that deep-linking and browser back/forward work. The page must be responsive/mobile-first (only critical fields shown on narrow viewports, progressively richer at tablet and desktop) and accessible (list semantics, labelled controls, meaningful alt text, keyboard-reachable links, sane focus management) — though accessibility is verified at component level rather than here, see the scope note below.

This is a TDD "red" specification: at the time of writing, almost none of this UI exists (the route currently renders only an `<h1>Pull requests</h1>` and, when the backend is unreachable, an error alert). The plan intentionally describes the desired end state, including API contract fields (`body`, `sha`, `state` query param) that do not exist yet in `packages/api-contract/openapi/openapi.yaml`. All scenarios use deterministic mocked API responses via Playwright route interception (`page.route('**/api/pull-requests*', ...)`), never the real backend, so tests are independent of backend implementation status and of real-world clock drift.

### Scope — what this plan deliberately does not cover

This plan is limited to end-to-end behaviour that only a real browser can prove: rendering, breakpoint field visibility, URL/history round-trips, network round-trips, and append-style pagination. The following are covered by lower-level component tests instead, and were removed from this plan rather than duplicated here:

- **Accessibility depth** — alt-text quality, control labelling, keyboard tab order, focus preservation. E2E still asserts the accessible names and list semantics it relies on to locate elements (suites 2–6), but dedicated a11y scenarios belong in component tests.
- **Last-updated time formatting** — the relative-time convention and its boundary cases (zero elapsed, future timestamps from clock skew). E2E asserts only that the field is present at the right breakpoints. The convention itself stands: `pr-updated` renders a human-relative string from `updatedAt` and keeps the ISO value in the `<time datetime>` attribute; tests that assert its text must freeze the clock.
- **Data edge cases** — empty list, single item, malformed/unknown enum values, draft indicators, body truncation boundaries, long titles, broken avatar images. These are pure render-from-props concerns. Only the API-failure case (suite 7) stays at e2e level, since it exercises the real fetch/error path.

Tech context for implementers: React 19, TanStack Router (file-based, route component for `/` lives in `apps/frontend/src/routes/index.tsx`), TanStack Query for data fetching, Vite dev server on port 3000 proxying `/api/*` to port 3001. Endpoint today: `GET /api/pull-requests?limit=20&cursor=<opaque>` → `{ items: PullRequest[], nextCursor: string | null }`, cursor pagination, newest-first. `PullRequestState` is `open | closed | merged`.

## Test Scenarios

### 1. Prerequisites and Contract Gaps

**Seed:** `tests/seed.spec.ts`

#### 1.1. Contract changes required before this plan can pass (documentation-only, not an executable test)

**File:** `specs/pull-request-list.md`

**Steps:**

1. Document, at the top of the saved plan, the following contract gaps discovered by inspecting `packages/api-contract/main.tsp` / `packages/api-contract/openapi/openapi.yaml` and the generated `PullRequest` model in `apps/backend/src/generated/models/pullRequest.ts`: (1) `PullRequest` has no `body` field, needed for the '50 characters of body' requirement. (2) `PullRequest` has no `sha` (or commit SHA) field, needed for the external repository link. (3) `ListPullRequestsParams` (the `GET /api/pull-requests` query parameters) has no `state` parameter, needed for server-aware filtering; today filtering would have to be done client-side only against whatever page(s) have been loaded, which conflicts with correct pagination + filter interplay. Record that until the contract and backend are extended to add `body: string`, `sha: string`, and `state?: PullRequestState` (or `state?: PullRequestState[]`) query support, the scenarios in the 'Filtering by State' suite that assert server round-trips of `state`, and all scenarios asserting rendered `body` text or SHA link `href`, are expected to fail (red) and are the executable specification driving that backend/contract work. - expect: The saved markdown file contains a 'Prerequisites / Contract Changes Required' section listing the three gaps above before any test scenarios are described. - expect: The plan explicitly states these tests are expected to fail until the contract changes ship, and that this is intended (TDD red phase), not a defect in the test plan.

### 2. Rendering — Happy Path List Item Fields

**Seed:** `tests/seed.spec.ts`

#### 2.1. Desktop viewport renders all six required fields per list item

**File:** `tests/pull-request-list/rendering-desktop.spec.ts`

**Steps:**

1. Set viewport to 1440x900 (desktop). Intercept `GET /api/pull-requests*` and fulfil with a fixed JSON fixture of 3 items, each with deterministic `id`, `number`, `title`, `state: 'open'`, `draft: false`, `author.login`, `author.avatarUrl` (a stable placeholder image URL), `repository.owner`, `repository.name`, `url`, a fixed `createdAt`/`updatedAt` ISO string (e.g. `2026-01-15T10:00:00.000Z`), `mergedAt: null`, plus the forthcoming `body` (a string over 50 characters) and `sha` (a 40-char hex string) fields. Set `nextCursor: null`. Navigate to `/`. - expect: The response is fulfilled from the mock, not the real backend (assert via the network interception, not by reading the UI).
2. For each of the 3 rendered list items, assert the following are all visible: (1) an `<img>`/avatar with a non-empty, descriptive `alt` (not blank, not the URL, not the login alone — e.g. "Avatar for octocat"); (2) the PR title text; (3) a visible state indicator text/label of 'Open'; (4) a last-updated time element; (5) a text node containing exactly the first 50 characters of the fixture's `body` field, i.e. `body.slice(0, 50)`; (6) a link whose accessible name/visible text is derived from the `sha` (e.g. the first 7 characters, `sha.slice(0,7)`, a common short-SHA convention — state this convention explicitly) and whose `href` equals the expected hosted-platform commit/PR URL for that repository. - expect: All 6 fields are present and visibly rendered for every item at the desktop viewport. - expect: The truncated body text does not include the 51st character of the source `body` fixture. - expect: The SHA link's `href` points at an external, absolute URL on the hosting platform domain (e.g. `https://github.com/{owner}/{name}/commit/{sha}` or `.../pull/{number}/commits/{sha}` — state and use one consistent convention), not a relative in-app route.

#### 2.2. List uses proper semantic list markup

**File:** `tests/pull-request-list/rendering-semantics.spec.ts`

**Steps:**

1. Mock 3 items as above. Navigate to `/` at desktop viewport.
2. Assert the container is a `role=list` (native `<ul>`/`<ol>` or `role="list"`) and each rendered item is a `role=listitem` (native `<li>` or `role="listitem"`). Assert there is exactly one `<h1>` on the page and no heading level is skipped (e.g. no `<h3>` before an `<h2>`). - expect: Accessibility tree exposes a list with the expected number of list items. - expect: Heading levels are sequential/sensible starting at h1.

### 3. Responsive / Mobile-First Field Visibility

**Seed:** `tests/seed.spec.ts`

#### 3.1. Mobile viewport (390x844) shows only critical fields and hides the rest

**File:** `tests/pull-request-list/responsive-mobile.spec.ts`

**Steps:**

1. Define and record the field-visibility contract used throughout this suite: CRITICAL (visible at all viewports, including mobile 390x844) = avatar image, PR title, PR state. TABLET-AND-UP (hidden on mobile, visible from tablet 768x1024 upward) = last-updated time, SHA link. DESKTOP-ONLY (hidden on mobile and tablet, visible only at desktop 1440x900) = truncated PR body text. Mock 1 fixed item with all fields populated (body > 50 chars). Set viewport to 390x844 and navigate to `/`. - expect: This mapping is stated verbatim in the saved plan so implementers and testers share one unambiguous contract.
2. Assert the avatar image, title text, and state label are visible (`toBeVisible()`). - expect: All three critical fields are visible at 390x844.
3. Assert the last-updated time element, the SHA link, and the truncated body text are each not visible — check both that the element is absent from the accessibility tree/DOM query results (not rendered) OR, if rendered but CSS-hidden, that it has `display:none`/`visibility:hidden`/`aria-hidden=true` (not merely scrolled off-screen or clipped by overflow, which a real user could still scroll to). Use `expect(locator).toBeHidden()` plus an explicit check that `getBoundingClientRect()` is not simply outside the viewport with normal in-flow layout — i.e. fail the test if the only reason the element isn't visible is that it sits below an unbounded scroll area. - expect: Last-updated, SHA link, and body preview are genuinely absent/hidden at mobile width, not just off-screen. - expect: No horizontal scrollbar/overflow is introduced by hidden elements (layout does not crowd).

#### 3.2. Tablet viewport (768x1024) reveals last-updated and SHA link but still hides body

**File:** `tests/pull-request-list/responsive-tablet.spec.ts`

**Steps:**

1. Mock the same fixed item. Set viewport to 768x1024 and navigate to `/`.
2. Assert avatar, title, state (critical fields) are visible. Assert last-updated time and the SHA link are now visible. Assert the truncated body text is still hidden/absent, using the same 'genuinely hidden, not off-screen' check as the mobile scenario. - expect: 5 of 6 fields visible at tablet; only the body preview is withheld. - expect: No layout overflow/crowding is introduced.

#### 3.3. Desktop viewport (1440x900) reveals all six fields simultaneously

**File:** `tests/pull-request-list/responsive-desktop.spec.ts`

**Steps:**

1. Mock the same fixed item. Set viewport to 1440x900 and navigate to `/`.
2. Assert all six fields (avatar, title, state, last-updated, truncated body, SHA link) are visible simultaneously for the item. - expect: All fields render with no field hidden at desktop width.

### 4. Filtering by State

**Seed:** `tests/seed.spec.ts`

#### 4.1. Filter control exposes open/closed options with accessible name

**File:** `tests/pull-request-list/filter-control.spec.ts`

**Steps:**

1. Mock a default unfiltered response with a mix of `open`, `closed`, and `merged` items. Navigate to `/`.
2. Locate the filter control by accessible role and name (e.g. a `combobox`/`radiogroup`/button-group with an accessible label such as "Filter by state" — assert it has a non-empty accessible name via `aria-label`/associated `<label>`). Assert an 'Open' option/value and a 'Closed' option/value are both present and selectable. - expect: The control is reachable via `getByRole` with an accessible name. - expect: Both 'open' and 'closed' choices exist and are distinguishable by accessible name/value.

#### 4.2. Selecting 'Open' updates the URL query param and filters the list

**File:** `tests/pull-request-list/filter-open.spec.ts`

**Steps:**

1. Mock `GET /api/pull-requests` (no `state` param) to return 2 open + 1 closed + 1 merged item, `nextCursor: null`. Navigate to `/`. Assert 4 items are rendered initially.
2. Additionally register a route matcher for `GET /api/pull-requests*state=open*` that returns only the 2 open items. Select the 'Open' filter option via the control found above. - expect: The browser URL becomes `/?state=open` (assert via `page.url()` / `expect(page).toHaveURL(/state=open/)`). - expect: The outgoing request to `/api/pull-requests` includes a `state=open` query parameter (assert via captured request URL). - expect: Only the 2 open items are rendered after the filter is applied; the closed and merged items are no longer in the list.

#### 4.3. Selecting 'Closed' updates the URL and filters the list

**File:** `tests/pull-request-list/filter-closed.spec.ts`

**Steps:**

1. Mock the base list as above and a `state=closed` route returning only the 1 closed item. Navigate to `/`, then select 'Closed'. - expect: URL becomes `/?state=closed`. - expect: Request carries `state=closed`. - expect: Only the closed item renders.

#### 4.4. Merged pull requests are treated as closed under the 'Closed' filter (explicit assumption)

**File:** `tests/pull-request-list/filter-merged-assumption.spec.ts`

**Steps:**

1. State the assumption explicitly for implementers: a PR with `state: 'merged'` is considered a member of the 'Closed' filter bucket (GitHub's own convention: a merged PR's underlying `state` is closed with `merged=true`; UI-level 'Closed' tabs conventionally include merged PRs). If the eventual UX diverges from this (e.g. a third 'Merged' filter tab is added), this scenario must be updated accordingly — but absent further specification, this is the behaviour under test.
2. Mock the base (unfiltered) list containing 1 open, 1 closed (never merged), and 1 merged item. Mock `state=closed` to return both the closed and the merged item (2 items). Mock `state=open` to return only the open item (1 item). Navigate to `/`, select 'Open', assert only the open item renders. Then select 'Closed', assert both the closed and the merged item render, and that each rendered item's visible state label is truthful to its actual underlying state (i.e. the merged item is labelled 'Merged' or equivalent, not relabelled as plain 'Closed'), so a user can still distinguish merged from closed-without-merge while both live under the 'Closed' filter. - expect: Selecting 'Open' shows exactly 1 item (the open one). - expect: Selecting 'Closed' shows exactly 2 items (closed + merged). - expect: The merged item's own visible state label still communicates 'merged' rather than being indistinguishable from a plain closed item.

#### 4.5. Deep-linking to ?state=open restores the filtered view on initial load

**File:** `tests/pull-request-list/filter-deep-link.spec.ts`

**Steps:**

1. Mock `state=open` route to return 2 open items only. Navigate directly to `/?state=open` (fresh browser context, no prior interaction).
2. Assert the initial request fired on page load already includes `state=open` (i.e. the filter is read from the URL before/at first fetch, not applied client-side after an unfiltered fetch). Assert the filter control's UI reflects 'Open' as the selected value. Assert only the 2 open items render. - expect: No flash of unfiltered content: only one network request is made on load and it already carries `state=open` (or, if an unfiltered request is unavoidable, assert the rendered list never shows non-open items even momentarily). - expect: Filter control visibly shows 'Open' as selected.

#### 4.6. Deep-linking to an invalid ?state= value falls back to a defined default without crashing

**File:** `tests/pull-request-list/filter-invalid-deep-link.spec.ts`

**Steps:**

1. Mock the default (no `state`) route. Navigate to `/?state=bogus`.
2. Assert the page does not crash/error-boundary out. Assert it falls back to a defined default (either: no filter applied / 'all states' request, or the filter control shows no option selected) — pick and assert one deterministic behaviour. - expect: Page renders successfully (no unhandled exception, no blank page). - expect: A defined, non-crashing fallback behaviour is observed for the invalid enum value.

#### 4.7. Browser back/forward navigates through filter history

**File:** `tests/pull-request-list/filter-back-forward.spec.ts`

**Steps:**

1. Mock base, `state=open`, and `state=closed` routes with distinct fixture item sets (distinguishable by title). Navigate to `/`. Select 'Open'. Then select 'Closed'. - expect: URL progresses `/` -> `/?state=open` -> `/?state=closed`, and each selection renders its respective item set.
2. Invoke browser back navigation twice (`page.goBack()`). - expect: First back returns URL to `/?state=open` and re-renders the open-only item set and re-selects 'Open' in the control. - expect: Second back returns URL to `/` (or the prior unfiltered state) and re-renders the full unfiltered item set.
3. Invoke browser forward navigation once (`page.goForward()`). - expect: URL returns to `/?state=open` and the open-only item set re-renders, with the control reflecting 'Open' again.

### 5. Pagination (Load More)

**Seed:** `tests/seed.spec.ts`

#### 5.1. Load More button appends new items to the existing list without replacing it

**File:** `tests/pull-request-list/pagination-append.spec.ts`

**Steps:**

1. Mock first page: `GET /api/pull-requests?limit=20` (no cursor) returns items #1-3 with `nextCursor: 'CURSOR_A'`. Mock second page: a request whose query includes `cursor=CURSOR_A` returns items #4-6 with `nextCursor: null`. Navigate to `/`. - expect: Items #1-3 are rendered; a 'Load more' button (accessible name e.g. 'Load more pull requests') is visible and enabled.
2. Click the 'Load more' button. - expect: The outgoing request's query string contains `cursor=CURSOR_A` (the exact `nextCursor` value from the first response) — assert this on the captured request, not merely inferred from the result. - expect: After the response resolves, items #1-3 remain present in the DOM in their original order/positions (not replaced or re-fetched) AND items #4-6 are newly appended after them, for a total of 6 items. - expect: The list container's item count goes from 3 to 6, never dropping to 0 or flashing an empty state during the append.

#### 5.2. Load More button is absent or disabled once nextCursor is null

**File:** `tests/pull-request-list/pagination-end.spec.ts`

**Steps:**

1. Mock a single-page response of 3 items with `nextCursor: null`. Navigate to `/`. - expect: The 'Load more' button is either not present in the DOM, or present but `disabled` — assert one specific, stated behaviour (recommend: not rendered at all, to avoid a dead disabled control encountering ambiguous a11y semantics).

#### 5.3. Load More shows a loading state and disables the button while the request is in-flight

**File:** `tests/pull-request-list/pagination-loading.spec.ts`

**Steps:**

1. Mock first page returning 3 items with `nextCursor: 'CURSOR_A'`. Mock the `cursor=CURSOR_A` request with an artificial delay (e.g. `route.fulfil` after a 1s manual delay, or hold the route open and fulfil after an explicit `page.waitForTimeout`/deferred promise) before resolving with 3 more items. Navigate to `/` and click 'Load more'.
2. Immediately after the click, and before the delayed response resolves, assert the button enters a busy/loading state (e.g. `aria-busy="true"`, or accessible name changes to include 'Loading', or `disabled` attribute is set) and cannot be clicked again (a second click during this window must not fire a duplicate request — assert only one request with `cursor=CURSOR_A` was made). - expect: Button visibly communicates a loading state via an accessible mechanism (not colour alone). - expect: Exactly one request for `cursor=CURSOR_A` is observed even if the button is clicked twice in quick succession. - expect: Once the delayed response resolves, loading state clears and the button returns to its normal enabled state (or disappears, per the end-of-pagination scenario, if this was the last page).

#### 5.4. A failed Load More request shows an error and preserves the existing list

**File:** `tests/pull-request-list/pagination-error.spec.ts`

**Steps:**

1. Mock first page returning 3 items with `nextCursor: 'CURSOR_A'`. Mock the `cursor=CURSOR_A` request to fulfil with HTTP 500 and a JSON error body. Navigate to `/` and click 'Load more'.
2. Assert an error indication is shown to the user (e.g. an alert/status region with a human-readable message near the button) without discarding the 3 already-rendered items. Assert the 'Load more' button returns to an enabled (non-loading, non-disabled) state so the user can retry, rather than being permanently stuck in a loading or disabled state. - expect: The original 3 items remain visible and unaffected. - expect: An accessible error message is rendered (`role=alert` or `aria-live` region). - expect: The button is retryable — clicking it again re-issues the `cursor=CURSOR_A` request.

### 6. Local Text Search

**Seed:** `tests/seed.spec.ts`

#### 6.1. Search control has an accessible name and filters already-loaded items client-side by title

**File:** `tests/pull-request-list/search-title.spec.ts`

**Steps:**

1. Mock a single-page response of 4 items with distinct titles (one containing the word 'Refactor'), `nextCursor: null`. Navigate to `/`. - expect: A search input is present with an accessible name (e.g. `getByRole('searchbox', { name: /search/i })` or a labelled `textbox`).
2. Type 'refactor' (lowercase) into the search input. - expect: No new network request is made to `/api/pull-requests` as a result of typing (assert via network request count before/after — search is purely client-side over already-fetched data). - expect: Only the 1 item whose title contains 'Refactor' remains visible; the other 3 are hidden/removed from the rendered list. - expect: The match is case-insensitive (lowercase query matches mixed-case title).

#### 6.2. Search matches against PR body as well as title

**File:** `tests/pull-request-list/search-body.spec.ts`

**Steps:**

1. Mock 4 items where the search term appears only in one item's `body` (not in any title). Navigate to `/` and type that term into search. - expect: The item whose body (not title) contains the term is shown; the other 3, which match neither title nor body, are hidden. - expect: This holds even if the matching text falls beyond the first 50 characters that are visibly truncated on screen — i.e. search matches the full body text, not just the visibly truncated preview (state and assert this explicitly, since it's a easy-to-get-wrong edge case).

#### 6.3. Search updates the URL query param and deep-linking with ?q= restores the search on load

**File:** `tests/pull-request-list/search-url-and-deep-link.spec.ts`

**Steps:**

1. Mock 4 items as above (single page, `nextCursor: null`). Navigate to `/` and type 'refactor' into search. - expect: URL becomes `/?q=refactor` (assert via `expect(page).toHaveURL(/q=refactor/)`).
2. In a fresh navigation, go directly to `/?q=refactor` (same mocked data). - expect: On load, the search input is pre-populated with 'refactor'. - expect: Only the matching item(s) are rendered immediately, without requiring the user to retype the query.

#### 6.4. No-results empty state and clearing search restores the full list

**File:** `tests/pull-request-list/search-empty-and-clear.spec.ts`

**Steps:**

1. Mock 4 items, none containing the string 'zzzznomatch'. Navigate to `/` and type 'zzzznomatch' into search. - expect: A no-results empty state message is shown (e.g. "No pull requests match your search"), and zero list items are rendered. - expect: The empty state is announced accessibly (e.g. present in an `aria-live` region or as visible text associated with the list, not solely conveyed by the absence of items).
2. Clear the search input (select all + delete, or use a visible 'clear' control if present). - expect: The URL `q` param is removed (URL returns to `/` or `/?state=...` if a filter was also active, but with no `q`). - expect: All 4 original items reappear.

#### 6.5. Search combined with state filter — both params present in the URL simultaneously

**File:** `tests/pull-request-list/search-plus-filter.spec.ts`

**Steps:**

1. Mock `state=open` route to return 3 open items, two of which contain 'auth' in their titles and one which does not. Navigate to `/`, select the 'Open' filter, then type 'auth' into search.
2. Assert the URL contains both `state=open` and `q=auth` simultaneously (e.g. `/?state=open&q=auth`, order-independent — assert via URLSearchParams parsing rather than a strict string match). Assert only the 2 open items matching 'auth' are rendered (i.e. search is applied within the already-filtered, already-fetched result set — search never resurrects items excluded by the active state filter). - expect: Both query params coexist in the URL. - expect: Rendered results are the intersection of the state filter and the search term.
3. Reload the page by navigating directly to the combined URL `/?state=open&q=auth` in a fresh context (same mocks). - expect: On load, both the filter control shows 'Open' selected and the search input is pre-populated with 'auth', and only the intersecting 2 items render — deep-linking restores both params together.

#### 6.6. Search combined with paginated (appended) results covers newly loaded items too

**File:** `tests/pull-request-list/search-plus-pagination.spec.ts`

**Steps:**

1. Mock first page: items #1-3 (none matching 'widget'), `nextCursor: 'CURSOR_A'`. Mock second page (`cursor=CURSOR_A`): items #4-6, exactly one of which (#5) contains 'widget' in its title, `nextCursor: null`. Navigate to `/`.
2. Type 'widget' into search before loading more. - expect: Zero items render (no match yet in the loaded set of #1-3), and the no-results empty state is shown. - expect: Because search operates only over already-loaded items, the 'Load more' button's presence during an active search should be explicitly decided and asserted: state and assert one behaviour — recommend the 'Load more' button remains visible/enabled during an active search (since more data might contain matches), rather than being hidden by a client-side filter with no matches.
3. With 'widget' still in the search box, click 'Load more' to fetch and append items #4-6. - expect: The request for `cursor=CURSOR_A` fires exactly as in the unfiltered pagination scenario (search does not alter the pagination request). - expect: After the append, exactly item #5 (the only one of #4-6 matching 'widget') is rendered — i.e. the client-side search filter is re-applied over the full, newly-expanded set of loaded items, not just the newly appended page. - expect: The empty-state message from the pre-load-more moment is no longer shown once a match exists.

### 7. Error and Edge Cases

**Seed:** `tests/seed.spec.ts`

#### 7.1. API returns HTTP 500 on initial load

**File:** `tests/pull-request-list/edge-api-500.spec.ts`

**Steps:**

1. Mock `GET /api/pull-requests*` to fulfil with HTTP 500 and a JSON error body. Navigate to `/`. - expect: An accessible error message is rendered (`role=alert` or equivalent), e.g. "Could not load pull requests", distinct from a raw stack trace. - expect: No list/empty-list markup is rendered as if it were valid empty data (i.e. an error state is visually and semantically distinct from a legitimate empty result set). - expect: The page does not crash to a blank white screen or an unhandled JS exception (check console for uncaught errors).
