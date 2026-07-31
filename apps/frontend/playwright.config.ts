import { defineConfig, devices } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

/**
 * End-to-end config, separate from the Vitest browser-mode block in
 * vite.config.ts: that one runs the component tests under `src`, this one runs
 * the `tests` suites described in specs/pull-request-list.md.
 *
 * Behavioural suites run in parallel across three viewport projects, so the
 * mobile-first layout is exercised at every breakpoint on every run. The
 * responsive suites assert one breakpoint each and drive the viewport
 * themselves, so they are carved out into their own project rather than run
 * three times over.
 */
const RESPONSIVE_SPECS = "**/responsive.spec.ts";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  reporter: "list",
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
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
