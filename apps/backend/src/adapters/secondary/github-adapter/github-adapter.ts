import { Octokit } from "@octokit/rest";

import { config } from "../../../config/config";
import type {
  PullRequestDto,
  PullRequestStateFilterDto,
  RepositoryDto,
} from "../../../dto/pull-request";
import { RateLimitedError } from "../../../errors/rate-limited-error";
import { RepositoryNotFoundError } from "../../../errors/repository-not-found-error";
import { UpstreamUnavailableError } from "../../../errors/upstream-unavailable-error";

const octokit = new Octokit({ auth: config.githubToken });

/** GitHub's stand-in for an account that no longer exists. */
const GHOST_AUTHOR = {
  username: "ghost",
  profileImage: "https://avatars.githubusercontent.com/u/10137?v=4",
};

type GithubPullRequest = Awaited<ReturnType<typeof octokit.rest.pulls.list>>["data"][number];

export type RetrievePullRequestsInput = {
  repository: RepositoryDto;
  state: PullRequestStateFilterDto;
  page: number;
  pageSize: number;
};

export type RetrievedPullRequests = {
  pullRequests: PullRequestDto[];
  hasNextPage: boolean;
};

/**
 * Retrieves one page of pull requests, newest first. GitHub advertises whether
 * more pages exist through the `link` header, which is the only thing we need
 * from it — page addresses stay ours.
 */
export async function retrievePullRequests({
  repository,
  state,
  page,
  pageSize,
}: RetrievePullRequestsInput): Promise<RetrievedPullRequests> {
  try {
    const response = await octokit.rest.pulls.list({
      owner: repository.owner,
      repo: repository.name,
      state,
      sort: "created",
      direction: "desc",
      page,
      per_page: pageSize,
    });

    return {
      pullRequests: response.data.map((pullRequest) => toPullRequestDto(pullRequest, repository)),
      hasNextPage: /rel="next"/.test(response.headers.link ?? ""),
    };
  } catch (error) {
    throw toGithubError(error, repository);
  }
}

const toPullRequestDto = (
  pullRequest: GithubPullRequest,
  repository: RepositoryDto,
): PullRequestDto => ({
  id: pullRequest.id.toString(),
  title: pullRequest.title,
  state: pullRequest.state === "closed" ? "closed" : "open",
  author: pullRequest.user
    ? { username: pullRequest.user.login, profileImage: pullRequest.user.avatar_url }
    : GHOST_AUTHOR,
  repository,
  url: pullRequest.html_url,
  createdAt: pullRequest.created_at,
  updatedAt: pullRequest.updated_at,
});

type GithubRequestError = Error & {
  status: number;
  response?: { headers: Record<string, string | undefined> } | null;
};

const isGithubRequestError = (error: unknown): error is GithubRequestError =>
  error instanceof Error && typeof (error as GithubRequestError).status === "number";

/** Translates Octokit's failures into errors the rest of the app understands. */
const toGithubError = (error: unknown, repository: RepositoryDto): Error => {
  if (!isGithubRequestError(error)) {
    return new UpstreamUnavailableError(
      "We could not reach GitHub just now. Please try again shortly.",
    );
  }

  if (error.status === 404) {
    return new RepositoryNotFoundError(
      `We could not find the ${repository.owner}/${repository.name} repository on GitHub.`,
    );
  }

  const isRateLimited =
    error.status === 429 ||
    (error.status === 403 && error.response?.headers["x-ratelimit-remaining"] === "0");

  if (isRateLimited) {
    return new RateLimitedError(
      "GitHub is rate limiting us right now. Please try again in a few minutes.",
    );
  }

  return new UpstreamUnavailableError(
    "We could not reach GitHub just now. Please try again shortly.",
  );
};
