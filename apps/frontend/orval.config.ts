import { defineConfig } from "orval";

export default defineConfig({
  client: {
    input: {
      target: "../../packages/api-contract/openapi/openapi.yaml",
    },
    output: {
      mode: "split",
      client: "react-query",
      httpClient: "fetch",
      target: "src/generated/api.ts",
      schemas: "src/generated/models",
      // Requests go to the same origin; vite proxies /api to the backend.
      baseUrl: "/api",
    },
  },
});
