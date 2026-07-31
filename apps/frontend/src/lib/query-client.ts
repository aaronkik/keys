import { QueryClient } from "@tanstack/react-query";

/**
 * A factory rather than a module singleton: the router owns one client per
 * instance (see router.tsx), which keeps each test's cache isolated and lets
 * route loaders reach the client through router context.
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Failures are surfaced with an explicit retry affordance instead of
        // being retried silently, so a failed request stays one request — the
        // e2e pagination suite asserts exactly that.
        retry: false,
      },
    },
  });
}
