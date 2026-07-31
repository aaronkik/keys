import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PullRequestPage } from "./generated/models";
import { PullRequestList } from "./pull-request-list";

const page: PullRequestPage = {
  items: [
    {
      id: "PR_1",
      title: "Add cursor pagination to the pull request list",
      state: "open",
      author: { username: "octocat", profileImage: "https://example.test/a.png" },
      repository: { owner: "keys", name: "platform" },
      url: "https://example.test/pull/412",
      createdAt: "2026-07-28T09:14:00Z",
      updatedAt: "2026-07-29T16:02:00Z",
    },
  ],
  nextCursor: null,
};

function renderWithClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("PullRequestList", () => {
  it("renders the pull requests returned by the generated client", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(page), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    renderWithClient(<PullRequestList />);

    expect(await screen.findByText(/Add cursor pagination to the pull request list/)).toBeDefined();
  });

  it("requests the endpoint and limit described by the contract", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(page), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderWithClient(<PullRequestList />);
    await screen.findByText(/Add cursor pagination/);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/pull-requests?limit=20",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("surfaces a failed request instead of rendering an empty list", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: "boom", message: "nope" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    renderWithClient(<PullRequestList />);

    expect(await screen.findByRole("alert")).toBeDefined();
  });
});
