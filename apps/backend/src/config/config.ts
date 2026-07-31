import type { RepositoryDto } from "../dto/pull-request";

/**
 * A token is optional: GitHub serves public pull requests unauthenticated, just
 * with a much lower rate limit.
 */
export const config = {
  githubToken: process.env.GITHUB_TOKEN,
  repository: {
    owner: process.env.GITHUB_OWNER ?? "react",
    name: process.env.GITHUB_REPO ?? "react",
  } satisfies RepositoryDto,
};
