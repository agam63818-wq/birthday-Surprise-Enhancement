import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 60000,
  workers: 1,
  use: { baseURL: process.env.QA_BASE_URL || "http://127.0.0.1:3000", headless: true, screenshot: "only-on-failure", trace: "retain-on-failure" },
  reporter: [["list"]],
});
