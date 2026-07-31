import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vite-plus";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 3000,
    proxy: {
      // Same-origin in the browser; forwarded to the Hono app in dev so the
      // generated client needs no base URL configuration.
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  plugins: [
    tanstackStart({
      spa: { enabled: true },
      prerender: { enabled: false },
    }),
    viteReact(),
    tailwindcss(),
  ],
  preview: {
    port: 3000,
  },
  test: {
    include: ["src/**/*.test.tsx"],
    setupFiles: ["./vitest-setup.ts"],
    // Vite+ installs its Vitest into an isolated store, so a bare `jsdom`
    // environment is not resolvable from there. Browser mode is the DOM
    // environment Vite+ actually ships support for.
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: "chromium" }],
    },
  },
});
