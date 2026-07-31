import { createFactory } from "hono/factory";

import { listPullRequestsAdapter } from "../adapters/primary/list-pull-requests";
import { zValidator } from "../generated/api.validator";
import { ListPullRequestsQueryParams, ListPullRequestsResponse } from "../generated/api.zod";

const factory = createFactory();

export const listPullRequestsHandlers = factory.createHandlers(
  listPullRequestsAdapter,
  zValidator("query", ListPullRequestsQueryParams),
  zValidator("response", ListPullRequestsResponse),
);
