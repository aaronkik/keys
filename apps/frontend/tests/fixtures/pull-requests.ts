import type { Page } from "@playwright/test";

import type { PullRequest, PullRequestPage } from "@/generated/models";

/**
 * Aliases of the generated models rather than a hand-written copy of them: a
 * contract change then fails these fixtures at typecheck, instead of leaving
 * mocked scenarios passing against a shape the API no longer returns.
 */
export type PullRequestFixture = PullRequest;
export type PullRequestPageFixture = PullRequestPage;

/**
 * Fixed "now" for the suite. Tests freeze the browser clock to this instant so
 * relative last-updated rendering ("2 days ago") is deterministic.
 */
export const FROZEN_NOW = new Date("2026-01-15T12:00:00.000Z");

/** A 1x1 transparent PNG, so avatars resolve without any network access. */
const AVATAR_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

/**
 * Builds one item with only the fields the UI needs, all deterministic. Pass a
 * `number` to derive a distinct id/title/url per item in a list; it is not
 * itself part of the returned fixture, since the contract has no such field.
 */
export function pullRequest(
  overrides: Partial<PullRequestFixture> & { number?: number } = {},
): PullRequestFixture {
  const { number: numberOverride, ...fields } = overrides;
  const number = numberOverride ?? 1;

  return {
    id: `PR_${number}`,
    title: `Pull request ${number}`,
    state: "open",
    author: { username: "octocat", profileImage: AVATAR_URL },
    repository: { owner: "keys", name: "platform" },
    url: `https://github.com/keys/platform/pull/${number}`,
    createdAt: "2026-01-10T09:00:00.000Z",
    updatedAt: "2026-01-13T12:00:00.000Z",
    ...fields,
  };
}

type ListResponse = PullRequestPageFixture | { status: number; body: unknown };

/** Decides what the list endpoint returns for a given request's query string. */
export type ListResponder = (query: URLSearchParams) => ListResponse | Promise<ListResponse>;

/**
 * Fulfils every `/api/pull-requests` call from fixtures, so no scenario needs
 * the backend running. Returns the list of intercepted request URLs, which
 * grows as the page fetches — assertions about `cursor` and `state` round-trips
 * read from it rather than inferring the query from what rendered.
 */
export async function mockPullRequestApi(page: Page, respond: ListResponder): Promise<URL[]> {
  const requests: URL[] = [];

  await page.route("**/api/pull-requests*", async (route) => {
    const url = new URL(route.request().url());
    requests.push(url);

    const result = await respond(url.searchParams);
    const isError = "status" in result;

    await route.fulfill({
      status: isError ? result.status : 200,
      contentType: "application/json",
      body: JSON.stringify(isError ? result.body : result),
    });
  });

  return requests;
}

/** Convenience responder for the common "one page, no filtering" case. */
export function singlePage(items: PullRequestFixture[]): ListResponder {
  return () => ({ items, nextCursor: null });
}

/**
 * Freezes the clock, stubs the list endpoint and loads the page — the three
 * opening lines every scenario shares. Returns the intercepted request URLs.
 *
 * The clock is frozen because the last-updated field renders relative time;
 * without it the rendered text would drift with the wall clock.
 */
export async function loadPullRequestList(
  page: Page,
  respond: ListResponder,
  url = "/",
): Promise<URL[]> {
  await page.clock.setFixedTime(FROZEN_NOW);
  const requests = await mockPullRequestApi(page, respond);
  await page.goto(url);

  return requests;
}
