import type { PullRequest } from "./generated/models";

/**
 * Placeholder pull requests served until a real GitHub source is wired up.
 * Shaped by the generated `PullRequest` model, so it fails to compile if the
 * TypeSpec contract changes.
 */
export const pullRequests: PullRequest[] = [
  {
    id: "PR_kwDOAbc1",
    number: 412,
    title: "Add cursor pagination to the pull request list",
    state: "open",
    draft: false,
    author: {
      login: "octocat",
      avatarUrl: "https://avatars.githubusercontent.com/u/583231?v=4",
    },
    repository: { owner: "keys", name: "platform" },
    url: "https://github.com/keys/platform/pull/412",
    createdAt: "2026-07-28T09:14:00Z",
    updatedAt: "2026-07-29T16:02:00Z",
    mergedAt: null,
  },
  {
    id: "PR_kwDOAbc2",
    number: 411,
    title: "Bump Hono to 4.12",
    state: "merged",
    draft: false,
    author: {
      login: "hubot",
      avatarUrl: "https://avatars.githubusercontent.com/u/1?v=4",
    },
    repository: { owner: "keys", name: "platform" },
    url: "https://github.com/keys/platform/pull/411",
    createdAt: "2026-07-27T11:30:00Z",
    updatedAt: "2026-07-27T15:45:00Z",
    mergedAt: "2026-07-27T15:45:00Z",
  },
  {
    id: "PR_kwDOAbc3",
    number: 410,
    title: "Draft: experiment with rolldown builds",
    state: "open",
    draft: true,
    author: {
      login: "octocat",
      avatarUrl: "https://avatars.githubusercontent.com/u/583231?v=4",
    },
    repository: { owner: "keys", name: "tooling" },
    url: "https://github.com/keys/tooling/pull/410",
    createdAt: "2026-07-26T08:00:00Z",
    updatedAt: "2026-07-26T08:00:00Z",
    mergedAt: null,
  },
  {
    id: "PR_kwDOAbc4",
    number: 409,
    title: "Remove the legacy webhook handler",
    state: "closed",
    draft: false,
    author: {
      login: "mona",
      avatarUrl: "https://avatars.githubusercontent.com/u/9919?v=4",
    },
    repository: { owner: "keys", name: "platform" },
    url: "https://github.com/keys/platform/pull/409",
    createdAt: "2026-07-24T13:22:00Z",
    updatedAt: "2026-07-25T09:10:00Z",
    mergedAt: null,
  },
  {
    id: "PR_kwDOAbc5",
    number: 408,
    title: "Document the TypeSpec to Hono pipeline",
    state: "merged",
    draft: false,
    author: {
      login: "mona",
      avatarUrl: "https://avatars.githubusercontent.com/u/9919?v=4",
    },
    repository: { owner: "keys", name: "docs" },
    url: "https://github.com/keys/docs/pull/408",
    createdAt: "2026-07-22T10:05:00Z",
    updatedAt: "2026-07-23T12:40:00Z",
    mergedAt: "2026-07-23T12:40:00Z",
  },
];
