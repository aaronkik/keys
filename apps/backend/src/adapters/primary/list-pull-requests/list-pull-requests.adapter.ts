import { ValidationError } from "../../../errors/validation-error";
import type { ListPullRequestsContext } from "../../../generated/api.context";
import { ListPullRequestsQueryParams } from "../../../generated/api.zod";
import type { PullRequestPage } from "../../../generated/models";
import { listPullRequestsUseCase } from "../../../use-cases/list-pull-requests";
import { toErrorResponse } from "../error-handler";

export const listPullRequestsAdapter = async (c: ListPullRequestsContext) => {
  try {
    const limitQuery = c.req.query("limit");
    const limit = limitQuery ? Number(limitQuery) : undefined;
    const result = ListPullRequestsQueryParams.safeParse({ ...c.req.query(), limit });

    if (!result.success) {
      throw new ValidationError(result.error.issues.map((issue) => issue.message).join(" "));
    }

    const page: PullRequestPage = await listPullRequestsUseCase(result.data);

    return c.json(page);
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return c.json(body, status);
  }
};
