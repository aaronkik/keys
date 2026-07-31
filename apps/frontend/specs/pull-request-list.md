# Pull Request List Homepage — Playwright Test Plan

## Application Overview

This plan specifies the behaviour of the homepage (`/` route) of the pull-request browser app. The homepage renders a list of pull requests fetched from `GET /api/pull-requests` (same-origin, proxied by Vite to the Hono backend on port 3001). Each list item shows an author avatar with a meaningful `alt`, the PR title as a link to the pull request, its state (open/closed), and a last-updated time.

The page supports state filtering, cursor-based "load more" pagination, and client-side text search over already-loaded results. Filter and search are reflected in the URL as query parameters (`state`, `q`) so that deep-linking and browser back/forward work; `cursor` is not a URL param, it only drives pagination requests. The page is mobile-first (only critical fields on narrow viewports, progressively richer at tablet and desktop) and accessible (list semantics, labelled controls, meaningful alt text, keyboard-reachable links).

All scenarios use deterministic mocked API responses via Playwright route interception (`page.route('**/api/pull-requests*', ...)`), never the real backend, so the suite is independent of backend implementation status and of real-world clock drift. The shared harness lives in `tests/fixtures/pull-requests.ts`.

### Scope — what this plan deliberately does not cover

This plan is limited to end-to-end behaviour that only a real browser can prove: rendering, breakpoint field visibility, URL/history round-trips, network round-trips, and append-style pagination. The following are covered by component tests under `src/` instead, and were removed from this plan rather than duplicated here:

- **Accessibility depth** — alt-text quality, control labelling, avatar fallback, keyboard tab order. E2E still asserts the accessible names and list semantics it relies on to locate elements, but dedicated a11y scenarios (axe scans of each component and of the assembled panel) belong in component tests.
- **Last-updated time formatting** — the relative-time convention and its boundary cases. E2E asserts only that the field is present at the right breakpoints. The convention itself stands: `pr-updated` renders a human-relative string from `updatedAt` and keeps the ISO value in the `<time datetime>` attribute; tests that assert its text must freeze the clock.
- **Data edge cases** — empty list, single item, long titles, broken avatar images, and the client-side search predicate itself. These are pure render-from-props concerns. Only the API-failure case (suite 6) stays at e2e level, since it exercises the real fetch/error path.

### Descoped from the contract

An earlier draft of this plan specified fields and behaviour that were deliberately cut rather than built. They are recorded here so the decision is not rediscovered as a gap:

- **`body`** — the "first 50 characters of the PR body" requirement, and searching against body text. `PullRequest` has no `body` field.
- **`sha`** — the external commit link built from a commit SHA. `PullRequest` has no `sha` field.
- **`merged`** — a third state, and the question of whether merged PRs belong in the "Closed" filter bucket. `PullRequestState` is `open | closed` only.

`ListPullRequestsParams` does carry `state`, so filtering is a server round-trip. Search is not in the contract and remains client-side over already-loaded pages.

### Tech context

React 19, TanStack Start / TanStack Router (file-based; the `/` route lives in `apps/frontend/src/routes/index.tsx`), TanStack Query for data fetching, Vite dev server on port 3000 proxying `/api/*` to port 3001.

Endpoint: `GET /api/pull-requests?state=<open|closed|all>&cursor=<opaque>&limit=<n>` → `{ items: PullRequest[], nextCursor: string | null }`, cursor pagination, newest-first.

The route declares a loader that prefetches the first page, so the request is in flight before the list component renders. Pagination is a single `useInfiniteQuery` (`src/features/pull-requests/api/pull-requests-query.ts`) — every loaded page lives in the query cache, and `state` is part of the query key, so changing the filter selects a different cache entry rather than resetting component state.

### Running the suite

`bun run test:e2e`, or `turbo run test:e2e` from the repo root (this is what CI runs). Four projects: `mobile` (390×844), `tablet` (768×1024) and `desktop` (1440×900) each run every spec except `responsive.spec.ts`, which drives viewports itself and gets its own project.

The web server is a production build (`bun run build && bun run preview`), not the dev server: dev mode fires the initial query twice and adds transform latency before the first fetch, both of which race scenarios that assert on captured requests. Prerendering is disabled, since a statically prerendered heading would let page-load assertions pass before hydration and fetch even start.

**On `expect.poll` for request assertions:** `page.goto()`'s `load` event resolves before the SPA has hydrated and run the route loader that fires the first fetch. In SPA mode nothing the app can do closes that window, so specs poll rather than read captured requests synchronously. This is the correct assertion, not a temporary workaround.

## Test Scenarios

### 1. Rendering — Happy Path List Item Fields

**File:** `tests/pull-request-list/rendering.spec.ts`

#### 1.1. Desktop viewport renders all required fields per list item

Mock three items with deterministic fields and `nextCursor: null`. Navigate to `/`.

- Exactly one request is made, to `/api/pull-requests`.
- For each item: an avatar `img` with a descriptive accessible name (`Avatar for octocat` — not blank, not the URL, not the bare username), the title, a visible state label, and a last-updated time element.

#### 1.2. List uses proper semantic list markup

- The container exposes `role=list` with the accessible name "Pull requests"; each item is a `role=listitem`.
- Exactly one `<h1>`, and no heading level is skipped.

### 2. Responsive / Mobile-First Field Visibility

**File:** `tests/pull-request-list/responsive.spec.ts`

The field-visibility contract, stated once and used throughout:

| Tier          | Fields               | Visible from                            |
| ------------- | -------------------- | --------------------------------------- |
| Critical      | avatar, title, state | all viewports, including mobile 390×844 |
| Tablet and up | last-updated time    | tablet 768×1024                         |

#### 2.1. Mobile (390×844) shows only critical fields

- Avatar, title and state are visible.
- The last-updated element is _genuinely_ hidden — not merely scrolled out of view. The assertion checks the bounding box is absent rather than simply outside the viewport, so an element pushed below an unbounded scroll area still fails.

#### 2.2. Tablet (768×1024) reveals the last-updated time

#### 2.3. Desktop (1440×900) reveals all fields simultaneously

### 3. Filtering by State

**File:** `tests/pull-request-list/filtering.spec.ts`

#### 3.1. Filter control exposes open/closed options with an accessible name

Reachable via `getByRole` with the accessible name "Filter by state". Offers Closed, Open and All.

#### 3.2. Selecting 'Open' updates the URL query param and filters the list

- URL becomes `/?state=open`.
- The outgoing request carries `state=open` (asserted on the captured request URL).
- Only the open items render.

#### 3.3. Selecting 'Closed' updates the URL and filters the list

#### 3.4. Deep-linking to `?state=open` restores the filtered view on initial load

The _initial_ request already carries `state=open` — the filter is read from the URL before the first fetch, not applied client-side after an unfiltered one. The control shows "Open" as selected.

#### 3.5. Deep-linking to an invalid `?state=` value falls back without crashing

The decided fallback for `?state=bogus`: no filter applied. The request carries no `state` param, all items render, the control shows "All", and the page does not error out.

#### 3.6. Browser back/forward navigates through filter history

`/` → `/?state=open` → `/?state=closed`, then two `goBack()`s and a `goForward()`, each restoring both the URL and the corresponding item set. Filter changes push history entries; search changes do not (see 4.1).

### 4. Local Text Search

**File:** `tests/pull-request-list/search.spec.ts`

#### 4.1. Search control has an accessible name and filters loaded items client-side by title

- Present as a `searchbox` named "Search pull requests".
- Typing makes **no** new request to `/api/pull-requests` — the filter runs over already-fetched data.
- Matching is case-insensitive against the title.

#### 4.2. Search updates the URL and `?q=` deep-links restore it on load

URL becomes `/?q=refactor`; navigating directly to that URL pre-populates the input and renders only matching items without retyping.

#### 4.3. No-results empty state, and clearing search restores the full list

- A no-results message is shown in a `role=status` region, with zero list items.
- Clearing the input removes `q` from the URL and brings back every item.

#### 4.4. Search combined with the state filter — both params coexist

`/?state=open&q=auth` (order-independent). Results are the intersection: search applies within the already-filtered, already-fetched set and never resurrects items the state filter excluded. Deep-linking the combined URL restores both controls.

#### 4.5. Search combined with paginated (appended) results covers newly loaded items

With a search active that matches nothing in page one, the empty state shows **and the "Load more" button stays visible and enabled** — more data may contain matches, so a client-side filter must not hide the way to fetch it. After appending, the filter re-applies across the full expanded set, not just the new page.

### 5. Pagination (Load More)

**File:** `tests/pull-request-list/pagination.spec.ts`

#### 5.1. Load More appends new items rather than replacing the list

- The outgoing request carries the exact `nextCursor` value returned by the previous page, asserted on the captured request.
- Items from page one keep their original positions and the new page is appended after them; the count goes 3 → 6 without flashing empty.

#### 5.2. Load More is absent once `nextCursor` is null

Decided behaviour: not rendered at all, rather than left as a dead disabled control.

#### 5.3. Load More shows a busy state and cannot fire twice

While in flight the button is `aria-busy="true"` and disabled; a second click during that window produces no duplicate request. Its accessible name stays stable across the transition, so a locator bound to it survives.

#### 5.4. A failed Load More shows an error and preserves the existing list

- An accessible error message appears; the already-rendered items are untouched.
- Exactly **one** request was made for that cursor — failures are not retried silently.
- The button returns to enabled, and clicking again re-issues the request.

### 6. Error and Edge Cases

**File:** `tests/pull-request-list/errors.spec.ts`

#### 6.1. API returns HTTP 500 on initial load

- An accessible error message (`role=alert`) reading "Could not load pull requests", not a raw stack trace or error message.
- No list markup is rendered, so an error is semantically distinct from a legitimately empty result set.
- The page heading remains visible and no uncaught exception reaches `pageerror` — an initial-load failure is reported inside the page, not by blanking it.
