import { defineConfig } from "@playwright/test";

const chromiumExecutable = process.env.REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE;

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 60000,
  workers: 1,
  use: {
    baseURL: process.env.QA_BASE_URL || "http://127.0.0.1:3000",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    launchOptions: chromiumExecutable
      ? {
          executablePath: chromiumExecutable,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--font-render-hinting=none",
            "--disable-gpu",
          ],
        }
      : undefined,
  },
  reporter: [["list"]],
});
