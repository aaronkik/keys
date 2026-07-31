import { createFactory } from "hono/factory";

import { listPullRequestsAdapter } from "../adapters/primary/list-pull-requests";

const factory = createFactory();

export const listPullRequestsHandlers = factory.createHandlers(listPullRequestsAdapter);
