import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PullRequest, PullRequestPage } from "@/generated/models";

import { validateSearch } from "../api/search-params";
import { PullRequestsPanel } from "./pull-requests-panel";

function item(id: string, title: string): PullRequest {
  return {
    id,
    title,
    state: "open",
    author: { username: "octocat", profileImage: "" },
    repository: { owner: "keys", name: "platform" },
    url: `https://example.test/pull/${id}`,
    createdAt: "2026-01-10T09:00:00.000Z",
    updatedAt: "2026-01-13T12:00:00.000Z",
  };
}

const FIRST_PAGE: PullRequestPage = {
  items: [item("PR_1", "Refactor the cursor pagination"), item("PR_2", "Add a search box")],
  nextCursor: null,
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function stubApi(respond: (url: URL) => Response) {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const href =
        typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      return Promise.resolve(respond(new URL(href, "http://localhost")));
    }),
  );
}

/**
 * The panel reads the URL through the router and its data through the query
 * cache, so exercising it means standing both up. A memory router with a `/`
 * route mirrors what `routes/index.tsx` registers, which is what
 * `getRouteApi("/")` resolves against at runtime.
 */
function renderPanel(url = "/") {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    validateSearch,
    component: PullRequestsPanel,
  });

  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute]),
    history: createMemoryHistory({ initialEntries: [url] }),
  });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

function titles() {
  return screen
    .getAllByRole("listitem")
    .map((listItem) => listItem.querySelector("a")?.textContent);
}

const loadMoreButton = () => screen.getByRole("button", { name: "Load more pull requests" });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("PullRequestsPanel", () => {
  it("renders every loaded pull request when no search is active", async () => {
    stubApi(() => json(FIRST_PAGE));
    renderPanel();

    await screen.findByRole("list", { name: "Pull requests" });

    expect(titles()).toEqual(["Refactor the cursor pagination", "Add a search box"]);
    expect(screen.queryByTestId("empty-state")).toBeNull();
  });

  it("narrows the list to case-insensitive title matches from the URL", async () => {
    stubApi(() => json(FIRST_PAGE));
    renderPanel("/?q=refactor");

    await screen.findByRole("list", { name: "Pull requests" });

    expect(titles()).toEqual(["Refactor the cursor pagination"]);
  });

  it("shows an announced empty state when a search matches nothing", async () => {
    stubApi(() => json(FIRST_PAGE));
    renderPanel("/?q=zzzznomatch");

    const empty = await screen.findByTestId("empty-state");

    expect(empty.getAttribute("role")).toBe("status");
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("reflects the filter from the URL in the control", async () => {
    stubApi(() => json(FIRST_PAGE));
    const { container } = renderPanel("/?state=open");

    await screen.findByRole("list", { name: "Pull requests" });

    expect(container.querySelector('[data-slot="select-value"]')?.textContent).toBe("Open");
  });

  it("hides the load more button once there are no further pages", async () => {
    stubApi(() => json(FIRST_PAGE));
    renderPanel();

    await screen.findByRole("list", { name: "Pull requests" });

    expect(screen.queryByRole("button", { name: "Load more pull requests" })).toBeNull();
  });

  it("appends the next page when the button is pressed", async () => {
    stubApi((url) =>
      json(
        url.searchParams.get("cursor") === "CURSOR_A"
          ? { items: [item("PR_3", "Third")], nextCursor: null }
          : { ...FIRST_PAGE, nextCursor: "CURSOR_A" },
      ),
    );
    renderPanel();

    await screen.findByRole("list", { name: "Pull requests" });
    fireEvent.click(loadMoreButton());

    expect(await screen.findByText("Third")).toBeDefined();
    expect(titles()).toHaveLength(3);
  });

  // Pages already on screen are unrelated to the page that failed to arrive.
  it("keeps the loaded items and a retryable button when loading more fails", async () => {
    stubApi((url) =>
      url.searchParams.get("cursor") === "CURSOR_A"
        ? json({ message: "boom" }, 500)
        : json({ ...FIRST_PAGE, nextCursor: "CURSOR_A" }),
    );
    renderPanel();

    await screen.findByRole("list", { name: "Pull requests" });
    fireEvent.click(loadMoreButton());

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Could not load more pull requests");
    expect(titles()).toHaveLength(2);
    expect((loadMoreButton() as HTMLButtonElement).disabled).toBe(false);
  });

  it("reports a failed first page as an error instead of an empty list", async () => {
    stubApi(() => json({ message: "boom" }, 500));
    renderPanel();

    const alert = await screen.findByRole("alert");

    expect(alert.textContent).toContain("Could not load pull requests");
    expect(screen.queryByRole("list", { name: "Pull requests" })).toBeNull();
  });

  // The leaf components are scanned individually elsewhere; this covers the
  // assembled tree, where duplicate landmarks and label collisions show up.
  it("has no accessibility violations as a whole", async () => {
    stubApi(() => json({ ...FIRST_PAGE, nextCursor: "CURSOR_A" }));
    const { container } = renderPanel();

    await screen.findByRole("list", { name: "Pull requests" });

    expect(await axe.run(container)).toHaveNoViolations();
  });

  it("has no accessibility violations while reporting a load more failure", async () => {
    stubApi((url) =>
      url.searchParams.get("cursor") === "CURSOR_A"
        ? json({ message: "boom" }, 500)
        : json({ ...FIRST_PAGE, nextCursor: "CURSOR_A" }),
    );
    const { container } = renderPanel();

    await screen.findByRole("list", { name: "Pull requests" });
    fireEvent.click(loadMoreButton());
    await screen.findByRole("alert");

    expect(await axe.run(container)).toHaveNoViolations();
  });
});
