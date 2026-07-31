import type { ContentfulStatusCode } from "hono/utils/http-status";

import type { ApiError } from "../../generated/models";

const STATUS_BY_ERROR_NAME: Record<string, ContentfulStatusCode> = {
  ValidationError: 400,
  InvalidCursorError: 400,
  RepositoryNotFoundError: 404,
  RateLimitedError: 429,
  UpstreamUnavailableError: 502,
};

/**
 * Maps the errors use cases and secondary adapters throw onto status codes.
 * Every named error carries a message written for the caller, so it is safe to
 * pass straight through; anything unnamed is not, and is logged instead.
 */
export const toErrorResponse = (
  error: unknown,
): { status: ContentfulStatusCode; body: ApiError } => {
  const status = error instanceof Error ? STATUS_BY_ERROR_NAME[error.name] : undefined;

  if (status !== undefined && error instanceof Error) {
    return { status, body: { message: error.message } };
  }

  console.error("Unhandled error while serving a request", error);

  return {
    status: 500,
    body: { message: "Something went wrong on our side. Please try again shortly." },
  };
};
