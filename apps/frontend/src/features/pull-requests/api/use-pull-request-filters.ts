import { getRouteApi } from "@tanstack/react-router";

import { ListPullRequestsState } from "@/generated/models";

// `getRouteApi` rather than importing `Route` from routes/index.tsx: the route
// module imports this feature's components, so importing back would close a
// cycle.
const route = getRouteApi("/");

export type PullRequestFilters = {
  state: ListPullRequestsState | undefined;
  query: string;
  setState: (state: ListPullRequestsState | undefined) => void;
  setQuery: (query: string) => void;
};

/**
 * The URL is the single source of truth for both controls, so filter and
 * search state survive reloads, deep links and browser history.
 */
export function usePullRequestFilters(): PullRequestFilters {
  const { state, q } = route.useSearch();
  const navigate = route.useNavigate();

  return {
    state,
    query: q ?? "",
    setState: (next) => {
      void navigate({ search: (prev) => ({ ...prev, state: next }) });
    },
    // Replaces rather than pushes: every keystroke would otherwise become a
    // history entry the user has to walk back through.
    setQuery: (next) => {
      void navigate({ search: (prev) => ({ ...prev, q: next || undefined }), replace: true });
    },
  };
}
