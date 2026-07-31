import { createRouter } from "@tanstack/react-router";

import { ErrorFallback, NotFound } from "@/components/error-fallback";
import { createQueryClient } from "@/lib/query-client";

import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const queryClient = createQueryClient();

  return createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultErrorComponent: ErrorFallback,
    defaultNotFoundComponent: NotFound,
  });
}
