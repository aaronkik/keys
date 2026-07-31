import type { PullRequest } from "@/generated/models";

/**
 * Case-insensitive title match over the pages already loaded. The contract has
 * no search parameter, so this deliberately cannot reach rows the client has
 * not fetched yet — "load more" widens the set it searches.
 */
export function filterPullRequests(items: PullRequest[], query: string): PullRequest[] {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length === 0) return items;

  return items.filter((item) => item.title.toLowerCase().includes(trimmed));
}
