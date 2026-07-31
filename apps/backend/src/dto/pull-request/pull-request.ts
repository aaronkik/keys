/** The lifecycle state a pull request can be in. */
export type PullRequestStateDto = "open" | "closed";

/** The states callers can filter a listing by. */
export type PullRequestStateFilterDto = PullRequestStateDto | "all";

export type AuthorDto = {
  username: string;
  profileImage: string;
};

export type RepositoryDto = {
  owner: string;
  name: string;
};

export type PullRequestDto = {
  id: string;
  title: string;
  state: PullRequestStateDto;
  author: AuthorDto;
  repository: RepositoryDto;
  url: string;
  createdAt: string;
  updatedAt: string;
};

/** One page of pull requests, addressed by an opaque forward-only cursor. */
export type PullRequestPageDto = {
  items: PullRequestDto[];
  nextCursor: string | null;
};

/** What a caller supplies to list pull requests. */
export type ListPullRequestsDto = {
  cursor?: string;
  state: PullRequestStateFilterDto;
  limit: number;
};
