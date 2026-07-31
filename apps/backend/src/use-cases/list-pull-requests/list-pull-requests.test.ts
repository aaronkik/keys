import { beforeEach, describe, expect, it, vi } from "vitest";

import { retrievePullRequests } from "../../adapters/secondary/github-adapter";
import { config } from "../../config/config";
import type { PullRequestDto } from "../../dto/pull-request";
import { encodeCursor } from "../../shared/cursor";
import { listPullRequestsUseCase } from "./list-pull-requests";

vi.mock("../../adapters/secondary/github-adapter");

const retrievePullRequestsMock = vi.mocked(retrievePullRequests);

const pullRequestDto = (overrides: Partial<PullRequestDto> = {}): PullRequestDto => ({
  id: "PR_kwDO1",
  title: "Add cursor pagination",
  state: "open",
  author: {
    username: "octocat",
    profileImage: "https://avatars.githubusercontent.com/u/583231?v=4",
  },
  repository: { owner: "react", name: "react" },
  url: "https://github.com/react/react/pull/1",
  createdAt: "2026-07-28T09:14:00Z",
  updatedAt: "2026-07-29T16:02:00Z",
  ...overrides,
});

const givenRetrieved = (pullRequests: PullRequestDto[], hasNextPage = false) =>
  retrievePullRequestsMock.mockResolvedValue({ pullRequests, hasNextPage });

describe("list-pull-requests-use-case", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    givenRetrieved([pullRequestDto()]);
  });

  it("retrieves the first page of the configured repository", async () => {
    await listPullRequestsUseCase({ state: "all", limit: 10 });

    expect(retrievePullRequestsMock).toHaveBeenCalledWith({
      repository: config.repository,
      state: "all",
      page: 1,
      pageSize: 10,
    });
  });

  it("retrieves the page a cursor points at", async () => {
    await listPullRequestsUseCase({ cursor: encodeCursor(3), state: "open", limit: 25 });

    expect(retrievePullRequestsMock).toHaveBeenCalledWith(
      expect.objectContaining({ page: 3, state: "open", pageSize: 25 }),
    );
  });

  it("hands back a cursor for the following page while more remain", async () => {
    givenRetrieved([pullRequestDto()], true);

    const page = await listPullRequestsUseCase({
      cursor: encodeCursor(3),
      state: "all",
      limit: 10,
    });

    expect(page.nextCursor).toBe(encodeCursor(4));
  });

  it("ends the sequence once GitHub has no further page", async () => {
    const page = await listPullRequestsUseCase({ state: "all", limit: 10 });

    expect(page.nextCursor).toBeNull();
  });

  it("rejects an unreadable cursor without calling GitHub", async () => {
    await expect(
      listPullRequestsUseCase({ cursor: "not-a-real-cursor", state: "all", limit: 10 }),
    ).rejects.toThrow("That page link is no longer valid. Reload the list to start again.");

    expect(retrievePullRequestsMock).not.toHaveBeenCalled();
  });

  it("refuses to serve a page it cannot vouch for", async () => {
    givenRetrieved([pullRequestDto({ url: "not-a-url" })]);

    await expect(listPullRequestsUseCase({ state: "all", limit: 10 })).rejects.toThrow(
      "We've received pull request data we could not read. Please try again shortly.",
    );
  });
});
