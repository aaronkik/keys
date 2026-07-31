import { describe, expect, it } from "vitest";

import app from "./generated/api";
import { ListPullRequestsResponse } from "./generated/api.zod";
import {
  githubPullRequest,
  givenGithubFails,
  givenPullRequests,
  useGithubServer,
} from "./test/github-api";

useGithubServer();

const listPullRequests = (query: Record<string, string> = {}) =>
  app.request(`/pull-requests?${new URLSearchParams(query).toString()}`);

const readError = async (res: Response) => ((await res.json()) as { message: string }).message;

describe("GET /pull-requests", () => {
  it("returns react/react pull requests in the shape the contract promises", async () => {
    givenPullRequests([githubPullRequest({ number: 412, title: "Add cursor pagination" })]);

    const res = await listPullRequests();

    expect(res.status).toBe(200);
    // Parsing with the schema orval generated from the TypeSpec contract is
    // what makes this a contract test: it fails if the API drifts from the spec.
    const body = ListPullRequestsResponse.parse(await res.json());
    expect(body.items).toEqual([
      {
        id: "1412",
        title: "Add cursor pagination",
        state: "open",
        author: {
          username: "octocat",
          profileImage: "https://avatars.githubusercontent.com/u/583231?v=4",
        },
        repository: { owner: "react", name: "react" },
        url: "https://github.com/react/react/pull/412",
        createdAt: "2026-07-28T09:14:00Z",
        updatedAt: "2026-07-29T16:02:00Z",
      },
    ]);
    expect(body.nextCursor).toBeNull();
  });

  it("asks GitHub for the requested page size and state", async () => {
    let asked: { page: number; perPage: number; state: string } | undefined;
    givenPullRequests([githubPullRequest()], (request) => {
      asked = request;
    });

    await listPullRequests({ limit: "5", state: "closed" });

    expect(asked).toEqual({ page: 1, perPage: 5, state: "closed" });
  });

  it("hands back an opaque base64 cursor while more pages remain", async () => {
    givenPullRequests([githubPullRequest({ number: 2 }), githubPullRequest({ number: 1 })]);

    const res = await listPullRequests({ limit: "1" });

    const { nextCursor } = ListPullRequestsResponse.parse(await res.json());
    expect(nextCursor).toEqual(expect.any(String));
    expect(() => JSON.parse(Buffer.from(nextCursor!, "base64url").toString())).not.toThrow();
  });

  it("walks forward through every page and terminates", async () => {
    const pullRequests = [3, 2, 1].map((number) => githubPullRequest({ number }));
    givenPullRequests(pullRequests);

    const seen: string[] = [];
    let cursor: string | null = null;

    do {
      const res: Response = await listPullRequests({
        limit: "2",
        ...(cursor ? { cursor } : {}),
      });
      expect(res.status).toBe(200);

      const page = ListPullRequestsResponse.parse(await res.json());
      seen.push(...page.items.map((item) => item.title));
      cursor = page.nextCursor;
    } while (cursor !== null);

    expect(seen).toEqual(pullRequests.map((pullRequest) => pullRequest.title));
  });

  it("applies the contract's default limit when none is given", async () => {
    let asked: { perPage: number } | undefined;
    givenPullRequests([githubPullRequest()], (request) => {
      asked = request;
    });

    await listPullRequests();

    expect(asked?.perPage).toBe(10);
  });

  it("explains a limit above the documented maximum", async () => {
    const res = await listPullRequests({ limit: "999" });

    expect(res.status).toBe(400);
    expect(await readError(res)).toBe("Too big: expected number to be <=100");
  });

  it("explains a limit that is not a number", async () => {
    const res = await listPullRequests({ limit: "loads" });

    expect(res.status).toBe(400);
    expect(await readError(res)).toBe("Invalid input: expected number, received NaN");
  });

  it("explains an unsupported state", async () => {
    const res = await listPullRequests({ state: "merged" });

    expect(res.status).toBe(400);
    expect(await readError(res)).toBe('Invalid option: expected one of "open"|"closed"|"all"');
  });

  it("explains a cursor it cannot read", async () => {
    const res = await listPullRequests({ cursor: "not-a-real-cursor" });

    expect(res.status).toBe(400);
    expect(await readError(res)).toBe(
      "That page link is no longer valid. Reload the list to start again.",
    );
  });

  it("explains a repository GitHub cannot find", async () => {
    givenGithubFails(404);

    const res = await listPullRequests();

    expect(res.status).toBe(404);
    expect(await readError(res)).toBe("We could not find the react/react repository on GitHub.");
  });

  it("explains being rate limited by GitHub", async () => {
    givenGithubFails(403, { "x-ratelimit-remaining": "0" });

    const res = await listPullRequests();

    expect(res.status).toBe(429);
    expect(await readError(res)).toBe(
      "GitHub is rate limiting us right now. Please try again in a few minutes.",
    );
  });

  it("explains GitHub being unavailable", async () => {
    givenGithubFails(500);

    const res = await listPullRequests();

    expect(res.status).toBe(502);
    expect(await readError(res)).toBe(
      "We could not reach GitHub just now. Please try again shortly.",
    );
  });
});
