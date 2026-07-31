import { useInfiniteQuery } from "@tanstack/react-query";

import type { ListPullRequestsState, PullRequest } from "@/generated/models";

import { pullRequestsQueryOptions } from "./pull-requests-query";

export type UsePullRequestsResult = {
  items: PullRequest[];
  isPending: boolean;
  isError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isNextPageError: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
};

/**
 * Flattens the paged cache into the single list the UI renders, so no
 * component has to know that the data arrives in pages.
 */
export function usePullRequests(state: ListPullRequestsState | undefined): UsePullRequestsResult {
  const query = useInfiniteQuery(pullRequestsQueryOptions(state));

  const items = query.data?.pages.flatMap((page) => page.items) ?? [];

  return {
    items,
    isPending: query.isPending,
    // Failing to load the list at all and failing to extend it are different
    // events with different remedies, and only the first should replace the
    // page with an error.
    isError: query.isError && items.length === 0,
    isNextPageError: query.isFetchNextPageError,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: () => {
      void query.fetchNextPage();
    },
    refetch: () => {
      void query.refetch();
    },
  };
}
