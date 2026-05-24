import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command:
          "npm run db:reset:demo && npm run dev -- --hostname 127.0.0.1 --port 3000",
        env: {
          ...process.env,
          AUTH_SECRET: process.env.AUTH_SECRET ?? "test-auth-secret",
        },
        url: "http://127.0.0.1:3000",
        reuseExistingServer: false,
        timeout: 120000,
      },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
