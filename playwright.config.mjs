import { readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

const DEFAULT_LOCAL_E2E_DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/minishop?schema=public";

function readRepoLocalEnvFile() {
  try {
    return readFileSync(new URL("./.env", import.meta.url), "utf8");
  } catch {
    return "";
  }
}

function readEnvAssignment(envFileContents, name) {
  const match = envFileContents.match(
    new RegExp(`^\\s*${name}\\s*=\\s*(.+)\\s*$`, "m"),
  );

  if (!match) {
    return "";
  }

  const rawValue = match[1].trim();

  if (
    (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
    (rawValue.startsWith("'") && rawValue.endsWith("'"))
  ) {
    return rawValue.slice(1, -1).trim();
  }

  return rawValue;
}

export function resolveLocalE2EDatabaseUrl({
  envFileContents = readRepoLocalEnvFile(),
} = {}) {
  return (
    readEnvAssignment(envFileContents, "DATABASE_URL") ||
    DEFAULT_LOCAL_E2E_DATABASE_URL
  );
}

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
          "npm run db:up && until docker compose exec -T postgres pg_isready -U postgres -d minishop; do sleep 1; done && npm run db:reset:demo && npm run dev -- --hostname 127.0.0.1 --port 3000",
        env: {
          ...process.env,
          DATABASE_URL: resolveLocalE2EDatabaseUrl(),
          AUTH_SECRET: process.env.AUTH_SECRET ?? "test-auth-secret",
          NEXT_PUBLIC_SITE_URL:
            process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000",
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
