import axe from "axe-core";
import { expect } from "vitest";

// vitest-axe's ESM build loads axe-core via `createRequire(import.meta.url)`,
// a Node-only API this project's browser-mode Vitest (a real Chromium
// instance, since jsdom isn't resolvable from Vite+'s isolated Vitest store —
// see vite.config.ts) can't provide, so the package fails at import time here
// ("module.createRequire is not a function"). axe-core itself has no such
// dependency, so this drives it directly with a small matcher instead.
interface CustomMatchers<R = unknown> {
  toHaveNoViolations(): R;
}

declare module "vitest" {
  interface Assertion<T = any> extends CustomMatchers<T> {}
}

expect.extend({
  toHaveNoViolations(results: axe.AxeResults) {
    const { violations } = results;

    return {
      pass: violations.length === 0,
      message: () =>
        violations
          .map((violation) => {
            const nodes = violation.nodes.map((node) => node.target.join(" ")).join(", ");
            return `${violation.id}: ${violation.help} (${violation.helpUrl})\n  affected: ${nodes}`;
          })
          .join("\n\n") || "expected accessibility violations, found none",
    };
  },
});
