import { defineConfig, configDefaults } from "vite-plus";

const GENERATED = [
  "**/dist/**",
  "**/.turbo/**",
  "**/generated/**",
  "**/routeTree.gen.ts",
  "**/.claude/**",
];

export default defineConfig({
  lint: {
    ignorePatterns: [...configDefaults.exclude, ...GENERATED],
    options: {
      typeAware: true,
      typeCheck: true,
      maxWarnings: 1,
    },
  },
  fmt: {
    ignorePatterns: [...configDefaults.exclude, ...GENERATED, "**/openapi/*.yaml"],
    sortImports: true,
  },
});
