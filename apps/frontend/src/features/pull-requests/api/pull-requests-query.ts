import { infiniteQueryOptions } from "@tanstack/react-query";

import { listPullRequests } from "@/generated/api";
import type { ListPullRequestsState } from "@/generated/models";
import { ApiRequestError } from "@/lib/api-error";

export const pullRequestKeys = {
  all: ["pull-requests"] as const,
  list: (state: ListPullRequestsState | undefined) =>
    [...pullRequestKeys.all, "list", { state }] as const,
};

/**
 * Shared by the route loader and the component hook so both address the same
 * cache entry. Pagination is expressed as an infinite query because the
 * contract is cursor-based (`cursor` in, `nextCursor` out) — the query cache
 * owns every loaded page, rather than page one living in the cache and the
 * rest in component state.
 *
 * Requests go through the generated `listPullRequests` so the call site stays
 * bound to the OpenAPI document the backend is built from; the only thing
 * added here is turning its non-throwing response envelope into a rejection.
 */
export function pullRequestsQueryOptions(state: ListPullRequestsState | undefined) {
  return infiniteQueryOptions({
    queryKey: pullRequestKeys.list(state),
    queryFn: async ({ pageParam, signal }) => {
      const cursor = typeof pageParam === "string" ? pageParam : undefined;
      const response = await listPullRequests({ state, cursor }, { signal });

      if (response.status !== 200) {
        throw new ApiRequestError(response.status, response.data);
      }

      return response.data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
