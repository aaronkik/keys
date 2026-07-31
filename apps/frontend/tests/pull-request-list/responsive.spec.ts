// spec: specs/pull-request-list.md
// seed: tests/seed.spec.ts

import { expect, test, type Locator, type Page } from "@playwright/test";

import { loadPullRequestList, pullRequest, singlePage } from "../fixtures/pull-requests";

// The field-visibility contract these three scenarios pin down:
//   CRITICAL (every viewport)  = avatar image, PR title, PR state
//   TABLET AND UP              = last-updated time, SHA link
//   DESKTOP ONLY               = truncated PR body text
// Each breakpoint gets its own viewport, so this file is routed to the
// dedicated `responsive` project rather than run once per viewport project.
const ITEM = pullRequest({
  number: 1,
  title: "Add mobile-first responsive layout",
  body: "This pull request adds a fully responsive layout so critical fields remain visible at every breakpoint.",
});

async function loadItem(page: Page): Promise<Locator> {
  await loadPullRequestList(page, singlePage([ITEM]));

  return page.getByRole("list", { name: "Pull requests" }).getByRole("listitem").first();
}

function criticalFields(listItem: Locator) {
  return {
    avatar: listItem.getByRole("img", { name: `Avatar for ${ITEM.author.login}` }),
    title: listItem.getByRole("link", { name: ITEM.title }),
    state: listItem.getByTestId("pr-state"),
  };
}

/**
 * A field withheld at this breakpoint must be absent or CSS-hidden, not merely
 * pushed off-screen where a user could still scroll to it — hence the bounding
 * box check on top of `toBeHidden()`.
 */
async function expectGenuinelyHidden(locator: Locator) {
  await expect(locator).toBeHidden();

  if ((await locator.count()) > 0) {
    expect(await locator.boundingBox()).toBeNull();
  }
}

async function expectNoHorizontalOverflow(page: Page) {
  const viewportSize = page.viewportSize();
  const bodyBox = await page.locator("body").boundingBox();

  if (bodyBox && viewportSize) {
    expect(bodyBox.width).toBeLessThanOrEqual(viewportSize.width);
  }
}

test.describe("Responsive / Mobile-First Field Visibility", () => {
  test.describe("mobile", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("Mobile viewport (390x844) shows only critical fields and hides the rest", async ({
      page,
    }) => {
      // 1. Mock 1 fixed item with all fields populated (body > 50 chars). Set viewport to 390x844 and navigate
      // to `/`.
      const listItem = await loadItem(page);

      // 2. Assert the avatar image, title text, and state label are visible.
      const { avatar, title, state } = criticalFields(listItem);
      await expect(avatar).toBeVisible();
      await expect(title).toBeVisible();
      await expect(state).toBeVisible();

      // 3. Assert the last-updated time element, the SHA link, and the truncated body text are each not visible,
      // and genuinely hidden rather than scrolled off-screen.
      await expectGenuinelyHidden(listItem.getByTestId("pr-updated"));
      await expectGenuinelyHidden(listItem.getByRole("link", { name: /commit [0-9a-f]{7}/i }));
      await expectGenuinelyHidden(listItem.getByTestId("pr-body-preview"));

      await expectNoHorizontalOverflow(page);
    });
  });

  test.describe("tablet", () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test("Tablet viewport (768x1024) reveals last-updated and SHA link but still hides body", async ({
      page,
    }) => {
      // 1. Mock the same fixed item. Set viewport to 768x1024 and navigate to `/`.
      const listItem = await loadItem(page);

      // 2. Assert avatar, title, state (critical fields) are visible. Assert last-updated time and the SHA link
      // are now visible. Assert the truncated body text is still hidden/absent, using the same 'genuinely
      // hidden, not off-screen' check as the mobile scenario.
      const { avatar, title, state } = criticalFields(listItem);
      await expect(avatar).toBeVisible();
      await expect(title).toBeVisible();
      await expect(state).toBeVisible();

      await expect(listItem.getByTestId("pr-updated")).toBeVisible();
      await expect(listItem.getByRole("link", { name: /commit [0-9a-f]{7}/i })).toBeVisible();

      await expectGenuinelyHidden(listItem.getByTestId("pr-body-preview"));

      await expectNoHorizontalOverflow(page);
    });
  });

  test.describe("desktop", () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test("Desktop viewport (1440x900) reveals all six fields simultaneously", async ({ page }) => {
      // 1. Mock the same fixed item. Set viewport to 1440x900 and navigate to `/`.
      const listItem = await loadItem(page);

      // 2. Assert all six fields (avatar, title, state, last-updated, truncated body, SHA link) are visible
      // simultaneously for the item.
      const { avatar, title, state } = criticalFields(listItem);
      await expect(avatar).toBeVisible();
      await expect(title).toBeVisible();
      await expect(state).toBeVisible();
      await expect(listItem.getByTestId("pr-updated")).toBeVisible();
      await expect(listItem.getByTestId("pr-body-preview")).toBeVisible();
      await expect(listItem.getByRole("link", { name: /commit [0-9a-f]{7}/i })).toBeVisible();
    });
  });
});
