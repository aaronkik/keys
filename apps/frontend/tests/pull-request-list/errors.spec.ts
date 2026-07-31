// spec: specs/pull-request-list.md
// seed: tests/seed.spec.ts

import { expect, test } from "@playwright/test";

import { loadPullRequestList } from "../fixtures/pull-requests";

test.describe("Error and Edge Cases", () => {
  test("API returns HTTP 500 on initial load", async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (error) => pageErrors.push(error));

    // 1. Mock `GET /api/pull-requests*` to fulfil with HTTP 500 and a JSON error body. Navigate to `/`.
    await loadPullRequestList(page, () => ({
      status: 500,
      body: { message: "Internal Server Error" },
    }));

    // expect: An accessible error message is rendered (`role=alert` or equivalent), e.g. "Could not load pull
    // requests", distinct from a raw stack trace.
    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/could not load pull requests/i);

    // expect: No list/empty-list markup is rendered as if it were valid empty data (i.e. an error state is
    // visually and semantically distinct from a legitimate empty result set).
    await expect(page.getByRole("list", { name: "Pull requests" })).toHaveCount(0);

    // expect: The page does not crash to a blank white screen or an unhandled JS exception (check console for
    // uncaught errors).
    await expect(page.getByRole("heading", { level: 1, name: "Pull requests" })).toBeVisible();
    expect(pageErrors).toHaveLength(0);
  });
});
