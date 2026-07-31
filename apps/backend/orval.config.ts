import { defineConfig } from "orval";

export default defineConfig({
  api: {
    input: {
      target: "../../packages/api-contract/openapi/openapi.yaml",
    },
    output: {
      mode: "split",
      client: "hono",
      target: "src/generated/api.ts",
      schemas: "src/generated/models",
      override: {
        hono: {
          handlers: "src/handlers",
          handlerGenerationStrategy: "smart",
        },
      },
    },
  },
});
