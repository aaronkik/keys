import { useState } from "react";

import { listPullRequests, useListPullRequests } from "./generated/api";
import type { PullRequest } from "./generated/models";
import { LoadMoreButton } from "./load-more-button";
import type { PullRequestFilterValue } from "./pull-request-filter";
import { PullRequestFilter } from "./pull-request-filter";
import { PullRequestListItem } from "./pull-request-list-item";
import { PullRequestSearch } from "./pull-request-search";

type PullRequestListProps = {
  state?: PullRequestFilterValue;
  q?: string;
  onStateChange?: (state: PullRequestFilterValue | undefined) => void;
  onQChange?: (q: string | undefined) => void;
};

type LoadMoreStatus = "idle" | "loading" | "error";

/**
 * Reads the API through the client orval generated from the same OpenAPI
 * document the backend is built from, so the types here and the handler
 * signatures over there cannot drift apart. "Load more" pages are fetched via
 * the generated `listPullRequests` function directly (rather than the query
 * hook), since the contract has no infinite-query variant and appended pages
 * are appended to local state instead of replacing the cached first page.
 */
export function PullRequestList({ state, q, onStateChange, onQChange }: PullRequestListProps) {
  const { data, isPending, isError, error } = useListPullRequests({ state });

  const [appendedItems, setAppendedItems] = useState<PullRequest[]>([]);
  const [appendedCursor, setAppendedCursor] = useState<string | null>(null);
  const [loadMoreStatus, setLoadMoreStatus] = useState<LoadMoreStatus>("idle");

  if (isPending) return <p>Loading pull requests…</p>;
  if (isError) {
    return <p role="alert">Could not load pull requests: {error.message}</p>;
  }

  // The generated fetch client resolves with the response envelope instead of
  // throwing on a non-2xx status, so failures are checked explicitly.
  if (data.status !== 200) {
    return <p role="alert">Could not load pull requests (HTTP {data.status}).</p>;
  }

  const items = [...data.data.items, ...appendedItems];
  const nextCursor = appendedItems.length > 0 ? appendedCursor : data.data.nextCursor;

  const trimmedQuery = q?.trim() ?? "";
  const filteredItems = trimmedQuery
    ? items.filter((item) => item.title.toLowerCase().includes(trimmedQuery.toLowerCase()))
    : items;

  async function handleLoadMore() {
    if (loadMoreStatus === "loading" || nextCursor == null) return;

    setLoadMoreStatus("loading");
    const response = await listPullRequests({ state, cursor: nextCursor });

    if (response.status === 200) {
      setAppendedItems((previous) => [...previous, ...response.data.items]);
      setAppendedCursor(response.data.nextCursor);
      setLoadMoreStatus("idle");
    } else {
      setLoadMoreStatus("error");
    }
  }

  const now = new Date();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PullRequestFilter value={state} onChange={(next) => onStateChange?.(next)} />
        <PullRequestSearch value={q ?? ""} onChange={(next) => onQChange?.(next || undefined)} />
      </div>

      <ul aria-label="Pull requests" className="flex flex-col divide-y divide-border">
        {filteredItems.map((item) => (
          <PullRequestListItem key={item.id} pullRequest={item} now={now} />
        ))}
      </ul>

      {trimmedQuery.length > 0 && filteredItems.length === 0 && (
        <p data-testid="empty-state" role="status">
          No pull requests match your search.
        </p>
      )}

      {loadMoreStatus === "error" && (
        <p role="alert">Could not load more pull requests. Please try again.</p>
      )}

      {nextCursor != null && (
        <LoadMoreButton loading={loadMoreStatus === "loading"} onClick={handleLoadMore} />
      )}
    </div>
  );
}
