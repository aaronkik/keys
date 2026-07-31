import { usePullRequestFilters } from "../api/use-pull-request-filters";
import { PullRequestFilter } from "./pull-request-filter";
import { PullRequestSearch } from "./pull-request-search";

/**
 * Reads and writes the filters directly. The two controls below stay
 * controlled `value`/`onChange` primitives — that is their interface, not
 * state being threaded through them.
 */
export function PullRequestToolbar() {
  const { state, query, setState, setQuery } = usePullRequestFilters();

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <PullRequestFilter value={state} onChange={setState} />
      <PullRequestSearch value={query} onChange={setQuery} />
    </div>
  );
}
