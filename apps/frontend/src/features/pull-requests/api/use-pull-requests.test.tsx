import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PullRequest, PullRequestPage } from "@/generated/models";

import { usePullRequests } from "./use-pull-requests";

function item(id: string): PullRequest {
  return {
    id,
    title: `Pull request ${id}`,
    state: "open",
    author: { username: "octocat", profileImage: "" },
    repository: { owner: "keys", name: "platform" },
    url: `https://example.test/pull/${id}`,
    createdAt: "2026-01-10T09:00:00.000Z",
    updatedAt: "2026-01-13T12:00:00.000Z",
  };
}

const FIRST_PAGE: PullRequestPage = {
  items: [item("PR_1"), item("PR_2")],
  nextCursor: "CURSOR_A",
};

const SECOND_PAGE: PullRequestPage = { items: [item("PR_3")], nextCursor: null };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Captures the URLs requested so cursor round-trips can be asserted directly. */
function stubApi(respond: (url: URL) => Response) {
  const urls: URL[] = [];

  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const href =
        typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const url = new URL(href, "http://localhost");
      urls.push(url);
      return Promise.resolve(respond(url));
    }),
  );

  return urls;
}

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("usePullRequests", () => {
  it("requests the endpoint described by the contract, with no params when unfiltered", async () => {
    const urls = stubApi(() => json(FIRST_PAGE));

    const { result } = renderHook(() => usePullRequests(undefined), { wrapper });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(urls).toHaveLength(1);
    expect(urls[0]?.pathname).toBe("/api/pull-requests");
    expect(urls[0]?.search).toBe("");
  });

  it("sends the active filter as a state param", async () => {
    const urls = stubApi(() => json(FIRST_PAGE));

    const { result } = renderHook(() => usePullRequests("open"), { wrapper });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(urls[0]?.searchParams.get("state")).toBe("open");
  });

  // The bug this replaces kept page one in the query cache and every later
  // page in component state, so the two could disagree about the cursor.
  it("appends the next page to the loaded items rather than replacing them", async () => {
    const urls = stubApi((url) =>
      json(url.searchParams.get("cursor") === "CURSOR_A" ? SECOND_PAGE : FIRST_PAGE),
    );

    const { result } = renderHook(() => usePullRequests(undefined), { wrapper });
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(result.current.hasNextPage).toBe(true);

    act(() => result.current.fetchNextPage());
    await waitFor(() => expect(result.current.items).toHaveLength(3));

    expect(result.current.items.map((pr) => pr.id)).toEqual(["PR_1", "PR_2", "PR_3"]);
    // The exact cursor handed back by the first page, not a recomputed one.
    expect(urls[1]?.searchParams.get("cursor")).toBe("CURSOR_A");
  });

  it("reports no further pages once the cursor comes back null", async () => {
    stubApi(() => json({ items: [item("PR_1")], nextCursor: null } satisfies PullRequestPage));

    const { result } = renderHook(() => usePullRequests(undefined), { wrapper });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.hasNextPage).toBe(false);
  });

  // The generated client resolves non-2xx responses instead of throwing, so
  // without normalisation an error would render as an empty list.
  it("surfaces a failed first page as an error, not as an empty list", async () => {
    stubApi(() => json({ message: "boom" }, 500));

    const { result } = renderHook(() => usePullRequests(undefined), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.items).toEqual([]);
  });

  it("keeps the loaded pages on screen when loading the next page fails", async () => {
    stubApi((url) =>
      url.searchParams.get("cursor") === "CURSOR_A"
        ? json({ message: "boom" }, 500)
        : json(FIRST_PAGE),
    );

    const { result } = renderHook(() => usePullRequests(undefined), { wrapper });
    await waitFor(() => expect(result.current.items).toHaveLength(2));

    act(() => result.current.fetchNextPage());
    await waitFor(() => expect(result.current.isNextPageError).toBe(true));

    // The list itself did not fail, so the page must not be replaced by an error.
    expect(result.current.isError).toBe(false);
    expect(result.current.items).toHaveLength(2);
    expect(result.current.hasNextPage).toBe(true);
  });
});
