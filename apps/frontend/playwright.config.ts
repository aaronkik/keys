import { defineConfig, devices } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

const RESPONSIVE_SPECS = "**/responsive.spec.ts";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  // A stray `test.only` would otherwise silently reduce CI to one scenario.
  forbidOnly: !!process.env.CI,
  // Only on CI, and only so `trace: "on-first-retry"` has a retry to attach to;
  // locally a failure should stay failed rather than be papered over.
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "mobile",
      testIgnore: RESPONSIVE_SPECS,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "tablet",
      testIgnore: RESPONSIVE_SPECS,
      use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } },
    },
    {
      name: "desktop",
      testIgnore: RESPONSIVE_SPECS,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "responsive",
      testMatch: RESPONSIVE_SPECS,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Every scenario fulfils `/api/pull-requests` from a fixture, so only a
  // static frontend build is needed — the Hono backend on 3001 is never
  // reached. A production build + preview server is used rather than the dev
  // server: dev mode fires the initial query twice (observed, not a
  // StrictMode artifact — none is used in this app) and adds dev-only
  // transform latency before the first fetch, both of which race or break
  // scenarios that assert on captured requests. Prerendering is disabled
  // (see vite.config.ts) since a statically prerendered heading would let
  // page-load assertions pass before hydration/fetch even starts.
  webServer: {
    command: "bun run build && bun run preview",
    url: BASE_URL,
    // Reusing a server someone left running is a convenience locally and a
    // way to test a stale build on CI.
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
