import { configDefaults, defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  esbuild: {
    loader: "jsx",
    include: /src\/.*\.js$/,
    jsx: "automatic",
  },
  resolve: {
    alias: {
      "@": resolve(rootDir, "src"),
    },
  },
  test: {
    environment: "node",
    exclude: [
      ...configDefaults.exclude,
      "tests/e2e/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
});
