import { createFileRoute } from "@tanstack/react-router";

import type { PullRequestFilterValue } from "../pull-request-filter";
import { PullRequestList } from "../pull-request-list";

type IndexSearch = {
  state?: PullRequestFilterValue;
  q?: string;
};

/**
 * A `state` outside the known enum (e.g. a bogus deep link) falls back to "no
 * filter" rather than crashing, and an empty `q` is normalised away so the
 * param disappears from the URL instead of lingering as `q=`.
 */
function validateSearch(search: Record<string, unknown>): IndexSearch {
  return {
    state: search.state === "open" || search.state === "closed" ? search.state : undefined,
    q: typeof search.q === "string" && search.q.length > 0 ? search.q : undefined,
  };
}

export const Route = createFileRoute("/")({
  validateSearch,
  component: Home,
});

function Home() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <main>
      <h1>Pull requests</h1>
      <PullRequestList
        key={search.state}
        state={search.state}
        q={search.q}
        onStateChange={(state) => navigate({ search: (prev) => ({ ...prev, state }) })}
        onQChange={(q) => navigate({ search: (prev) => ({ ...prev, q }), replace: true })}
      />
    </main>
  );
}
