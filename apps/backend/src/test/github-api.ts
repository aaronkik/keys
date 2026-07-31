import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";

/**
 * Test doubles for the GitHub REST API. Octokit calls it over `fetch`, so MSW
 * intercepts at the network boundary and every layer below the handler runs for
 * real. Orval's MSW generation (https://orval.dev/docs/guides/msw) mocks *our*
 * contract, which is the thing under test here, so the upstream is mocked by
 * hand instead.
 */
export const PULLS_URL = "https://api.github.com/repos/react/react/pulls";

export const githubServer = setupServer();

export const useGithubServer = () => {
  beforeAll(() => githubServer.listen({ onUnhandledRequest: "error" }));
  afterEach(() => githubServer.resetHandlers());
  afterAll(() => githubServer.close());
};

type GithubPullRequestOverrides = {
  number?: number;
  title?: string;
  state?: "open" | "closed";
  user?: { login: string; avatar_url: string } | null;
  created_at?: string;
  updated_at?: string;
};

export const githubPullRequest = (overrides: GithubPullRequestOverrides = {}) => {
  const number = overrides.number ?? 1;

  return {
    id: 1000 + number,
    node_id: `PR_kwDO${number}`,
    number,
    title: `Pull request ${number}`,
    state: "open",
    html_url: `https://github.com/react/react/pull/${number}`,
    created_at: "2026-07-28T09:14:00Z",
    updated_at: "2026-07-29T16:02:00Z",
    user: { login: "octocat", avatar_url: "https://avatars.githubusercontent.com/u/583231?v=4" },
    ...overrides,
  };
};

type PageRequest = { page: number; perPage: number; state: string };

/**
 * Serves `pullRequests` one page at a time, mirroring how GitHub advertises
 * further pages through the `link` header. `onRequest` lets a test assert what
 * the secondary adapter actually asked for.
 */
export const givenPullRequests = (
  pullRequests: ReturnType<typeof githubPullRequest>[],
  onRequest?: (request: PageRequest) => void,
) =>
  githubServer.use(
    http.get(PULLS_URL, ({ request }) => {
      const url = new URL(request.url);
      const page = Number(url.searchParams.get("page") ?? 1);
      const perPage = Number(url.searchParams.get("per_page") ?? 30);

      onRequest?.({ page, perPage, state: url.searchParams.get("state") ?? "open" });

      const start = (page - 1) * perPage;
      const items = pullRequests.slice(start, start + perPage);
      const hasNextPage = start + perPage < pullRequests.length;

      return HttpResponse.json(items, {
        headers: hasNextPage
          ? {
              link: `<${PULLS_URL}?page=${page + 1}>; rel="next", <${PULLS_URL}?page=9>; rel="last"`,
            }
          : {},
      });
    }),
  );

export const givenGithubFails = (status: number, headers: Record<string, string> = {}) =>
  githubServer.use(
    http.get(PULLS_URL, () =>
      HttpResponse.json({ message: "GitHub said no" }, { status, headers }),
    ),
  );
