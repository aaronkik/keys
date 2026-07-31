import { ErrorAlert } from "@/components/error-alert";

import { usePullRequestFilters } from "../api/use-pull-request-filters";
import { usePullRequests } from "../api/use-pull-requests";
import { filterPullRequests } from "../lib/filter-pull-requests";
import { LoadMoreButton } from "./load-more-button";
import { PullRequestList } from "./pull-request-list";
import { PullRequestListSkeleton } from "./pull-request-list-skeleton";
import { PullRequestToolbar } from "./pull-request-toolbar";

export function PullRequestsPanel() {
  const { state, query } = usePullRequestFilters();
  const pullRequests = usePullRequests(state);

  if (pullRequests.isPending) return <PullRequestListSkeleton />;

  if (pullRequests.isError) {
    return (
      <ErrorAlert
        title="Could not load pull requests."
        description="The list could not be fetched. Check your connection and try again."
        onRetry={pullRequests.refetch}
      />
    );
  }

  const visibleItems = filterPullRequests(pullRequests.items, query);
  const hasSearch = query.trim().length > 0;

  return (
    <div className="flex flex-col gap-4">
      <PullRequestToolbar />

      <PullRequestList items={visibleItems} />

      {hasSearch && visibleItems.length === 0 ? (
        <p data-testid="empty-state" role="status">
          No pull requests match your search.
        </p>
      ) : null}

      {pullRequests.isNextPageError ? (
        <ErrorAlert title="Could not load more pull requests." description="Please try again." />
      ) : null}

      {pullRequests.hasNextPage ? (
        <LoadMoreButton
          loading={pullRequests.isFetchingNextPage}
          onClick={pullRequests.fetchNextPage}
        />
      ) : null}
    </div>
  );
}
