import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { pullRequestsQueryOptions } from "@/features/pull-requests/api/pull-requests-query";
import { validateSearch } from "@/features/pull-requests/api/search-params";
import { PullRequestListSkeleton } from "@/features/pull-requests/components/pull-request-list-skeleton";
import { PullRequestsPanel } from "@/features/pull-requests/components/pull-requests-panel";

export const Route = createFileRoute("/")({
  validateSearch,
  // `q` is deliberately absent: search filters the pages already loaded, so
  // typing must not re-run the loader or issue a request.
  loaderDeps: ({ search: { state } }) => ({ state }),
  // Prefetch rather than ensure: this warms the cache so the list is present
  // on first paint, but a failed request resolves into the cache as an errored
  // query for the view to report, instead of throwing past the page heading
  // into the router's error boundary.
  loader: ({ context, deps }) =>
    context.queryClient.prefetchInfiniteQuery(pullRequestsQueryOptions(deps.state)),
  component: Home,
  pendingComponent: PendingHome,
});

function HomeLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Pull requests</h1>
      {children}
    </main>
  );
}

function Home() {
  return (
    <HomeLayout>
      <PullRequestsPanel />
    </HomeLayout>
  );
}

function PendingHome() {
  return (
    <HomeLayout>
      <PullRequestListSkeleton />
    </HomeLayout>
  );
}
