import { ListPullRequestsState } from "@/generated/models";

export type PullRequestSearchParams = {
  state?: ListPullRequestsState;
  q?: string;
};

// `all` is the contract's default and is expressed as the absence of the
// param, so a URL never carries it and only the two real states validate.
const states: readonly string[] = [ListPullRequestsState.open, ListPullRequestsState.closed];

function isState(value: unknown): value is ListPullRequestsState {
  return typeof value === "string" && states.includes(value);
}

export function validateSearch(search: Record<string, unknown>): PullRequestSearchParams {
  return {
    state: isState(search.state) ? search.state : undefined,
    q: typeof search.q === "string" && search.q.length > 0 ? search.q : undefined,
  };
}
