import type { ApiError } from "@/generated/models";

/**
 * The generated fetch client resolves with a response envelope rather than
 * throwing on a non-2xx status, so every caller would otherwise have to check
 * `status` by hand. Query functions convert that envelope into this error so
 * failures arrive through the normal TanStack Query error channel.
 */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiError | undefined,
  ) {
    super(body?.message ?? `Request failed with status ${status}`);
    this.name = "ApiRequestError";
  }
}
