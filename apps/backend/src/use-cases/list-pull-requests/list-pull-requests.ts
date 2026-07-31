import { retrievePullRequests } from "../../adapters/secondary/github-adapter";
import { config } from "../../config/config";
import type { ListPullRequestsDto, PullRequestPageDto } from "../../dto/pull-request";
import { InvalidCursorError } from "../../errors/invalid-cursor-error";
import { UpstreamUnavailableError } from "../../errors/upstream-unavailable-error";
import { ListPullRequestsResponse } from "../../generated/api.zod";
import { decodeCursor, encodeCursor } from "../../shared/cursor";

const FIRST_PAGE = 1;

/**
 * List pull requests for the configured repository
 * Input: ListPullRequestsDto
 * Output: PullRequestPageDto
 *
 * Primary course:
 *  1. Resolve which page the cursor asks for, defaulting to the first
 *  2. Retrieve that page of pull requests, newest first
 *  3. Hand back a cursor for the next page, or null once there are no more
 *  4. Validate the page before returning it
 */
export async function listPullRequestsUseCase({
  cursor,
  state,
  limit,
}: ListPullRequestsDto): Promise<PullRequestPageDto> {
  const page = cursor ? decodeCursor(cursor) : FIRST_PAGE;

  if (page === null) {
    throw new InvalidCursorError(
      "That page link is no longer valid. Reload the list to start again.",
    );
  }

  const { pullRequests, hasNextPage } = await retrievePullRequests({
    repository: config.repository,
    state,
    page,
    pageSize: limit,
  });

  const pullRequestPage: PullRequestPageDto = {
    items: pullRequests,
    nextCursor: hasNextPage ? encodeCursor(page + 1) : null,
  };

  if (!ListPullRequestsResponse.safeParse(pullRequestPage).success) {
    throw new UpstreamUnavailableError(
      "We've received pull request data we could not read. Please try again shortly.",
    );
  }

  return pullRequestPage;
}
