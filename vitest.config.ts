import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  resolve: { alias: { "@": path.resolve("artifacts/birthday-surprise/src") } },
  test: { globals: true, environment: "node", include: ["artifacts/birthday-surprise/src/**/*.test.ts"], maxWorkers: 2 },
});
