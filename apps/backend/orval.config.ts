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
        // Query params arrive as strings, so `limit: int32` must be converted
        // before the generated validator will accept it. `coerce` cannot do
        // this: zod 4 has no `z.coerce.int`, which is what `int32` maps to.
        zod: {
          preprocess: {
            query: {
              name: "coerceNumericQuery",
              path: "./src/zod-preprocess.ts",
            },
          },
        },
      },
    },
  },
});
