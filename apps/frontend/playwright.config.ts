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
  // Every scenario fulfils `/api/pull-requests` from a fixture, so only the
  // Vite dev server is needed — the Hono backend on 3001 is never reached.
  webServer: {
    command: "bun run dev",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
