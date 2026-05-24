# MiniShop Buổi 12 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make MiniShop deploy-aware without overengineering the course repo: add explicit production env guardrails, a documented local-vs-production DB workflow, baseline CI, and a small E2E smoke suite for the most important flows.

**Architecture:** Keep the repo SQLite-first for local teaching, but separate “local demo convenience” from “production discipline” in commands and docs. Add one small env helper reused by auth/db/SEO, wire a Playwright smoke layer around the existing seeded demo data, and let GitHub Actions recreate the local demo DB before running `test`, `lint`, `build`, and `e2e`. Production DB support in this buổi is a documented Postgres migration path, not a full dual-database runtime inside the same repo.

**Tech Stack:** Next.js 16 App Router, React 19, JavaScript, Prisma ORM, SQLite local demo DB, Playwright, Vitest, ESLint, GitHub Actions.

---

## Current Codebase Notes

- `prisma/migrate.mjs` is intentionally local-demo-oriented: it deletes `prisma/dev.db`, then shells out to `sqlite3` and replays raw SQL migrations.
- `prisma/schema.prisma` still targets `provider = "sqlite"`, so this repo is not ready to point directly at Postgres without a deliberate migration plan.
- `src/app/page.js`, `src/app/products/[slug]/page.js`, and `src/app/sitemap.js` query Prisma during render/build paths, so CI cannot treat DB setup as optional.
- `src/lib/auth.js` and `src/lib/seo.js` each validate env in isolation; there is no shared helper for “required env” semantics yet.
- `.env.example` and `README.md` already mention production concerns, but the rules are spread out and there is no dedicated deploy/readiness document to hand students.
- There is no `.github/workflows/` directory, no Playwright config, and no browser-level verification of login, admin guard, catalog, or checkout.
- `tests/` currently covers unit/server-action/API behavior well enough for course scope, so buổi 12 should add smoke coverage rather than replacing those tests.

## Scope Decisions

- Do **not** convert the whole repo to Postgres in this buổi. That would turn an “optional advanced” session into a schema migration project.
- Do **not** add a CI matrix yet. One Ubuntu job is enough to teach the workflow clearly.
- Do **not** add broad E2E coverage. Keep only the shortest happy-path/guard-path flows that prove the app still works end-to-end.
- Keep `npm run db:migrate` as the destructive local reset script for course convenience, but add a clearly named production migration command beside it.
- Treat “production DB” here as operational discipline: env validation, migration semantics, seed caveats, and documented Postgres rollout notes.

## File Map

- Create: `src/lib/env.js`
- Create: `tests/lib/env.test.js`
- Create: `playwright.config.mjs`
- Create: `tests/e2e/smoke.spec.js`
- Create: `.github/workflows/ci.yml`
- Create: `docs/deploy/production-readiness.md`
- Modify: `package.json`
- Modify: `.gitignore`
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `src/lib/auth.js`
- Modify: `src/lib/db.js`
- Modify: `src/lib/seo.js`

## Verification Strategy

- Use `npm run test -- tests/lib/env.test.js` to lock env helper semantics first.
- Use `npm run test` after env helper wiring to confirm auth/SEO tests still pass under the shared helper.
- Use `npm run build` with explicit env vars to confirm App Router render/build paths still work once guardrails are stricter.
- Use `npm run e2e` locally to verify the seeded DB, dev server, and smoke flows work together.
- Mirror the CI job locally before handing off: `npm run verify` then `npm run e2e`.

---

### Task 1: Add shared env guardrails and production-aware scripts

**Files:**
- Create: `src/lib/env.js`
- Create: `tests/lib/env.test.js`
- Modify: `src/lib/auth.js`
- Modify: `src/lib/db.js`
- Modify: `src/lib/seo.js`
- Modify: `package.json`
- Modify: `.env.example`

- [ ] **Step 1: Write the failing env-helper tests**

Create `tests/lib/env.test.js`:

```js
import { afterEach, describe, expect, it } from "vitest";
import {
  assertEnv,
  getMissingEnvNames,
  isProductionEnvironment,
  readRequiredEnv,
} from "../../src/lib/env.js";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("env helpers", () => {
  it("lists missing env names in declaration order", () => {
    process.env.DATABASE_URL = "";
    delete process.env.AUTH_SECRET;

    expect(getMissingEnvNames(["DATABASE_URL", "AUTH_SECRET"])).toEqual([
      "DATABASE_URL",
      "AUTH_SECRET",
    ]);
  });

  it("throws a labeled error when required env vars are missing", () => {
    delete process.env.DATABASE_URL;

    expect(() =>
      assertEnv(["DATABASE_URL"], { label: "Prisma client" }),
    ).toThrowError("Prisma client is missing required env vars: DATABASE_URL");
  });

  it("returns the test fallback only in test mode", () => {
    process.env.NODE_ENV = "test";
    delete process.env.AUTH_SECRET;

    expect(
      readRequiredEnv("AUTH_SECRET", { fallbackInTest: "test-auth-secret" }),
    ).toBe("test-auth-secret");
  });

  it("detects production strictly from NODE_ENV", () => {
    expect(isProductionEnvironment("production")).toBe(true);
    expect(isProductionEnvironment("development")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the env test file to verify the helper does not exist yet**

Run:
```bash
npm run test -- tests/lib/env.test.js
```

Expected:
- Vitest fails with a module-not-found error for `src/lib/env.js`.

- [ ] **Step 3: Implement the shared env helper**

Create `src/lib/env.js`:

```js
export function isProductionEnvironment(nodeEnv = process.env.NODE_ENV) {
  return nodeEnv === "production";
}

function readEnvValue(name, envObject = process.env) {
  const value = envObject[name];
  return typeof value === "string" ? value.trim() : "";
}

export function getMissingEnvNames(names, envObject = process.env) {
  return names.filter((name) => !readEnvValue(name, envObject));
}

export function assertEnv(
  names,
  { envObject = process.env, label = "Environment" } = {},
) {
  const missing = getMissingEnvNames(names, envObject);

  if (!missing.length) {
    return;
  }

  throw new Error(
    `${label} is missing required env vars: ${missing.join(", ")}`,
  );
}

export function readRequiredEnv(
  name,
  { envObject = process.env, fallbackInTest = "" } = {},
) {
  const value = readEnvValue(name, envObject);

  if (value) {
    return value;
  }

  if (envObject.NODE_ENV === "test" && fallbackInTest) {
    return fallbackInTest;
  }

  throw new Error(`Missing required environment variable: ${name}`);
}
```

- [ ] **Step 4: Reuse the helper in auth, db, and SEO**

Update `src/lib/auth.js`:

```js
import { readRequiredEnv } from "@/lib/env";

function getAuthSecret() {
  return readRequiredEnv("AUTH_SECRET", {
    fallbackInTest: "test-auth-secret",
  });
}
```

Update `src/lib/db.js`:

```js
import { PrismaClient } from "@prisma/client";
import { assertEnv } from "@/lib/env";

assertEnv(["DATABASE_URL"], { label: "Prisma client" });

const globalForPrisma = globalThis;

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
```

Update the environment checks in `src/lib/seo.js`:

```js
import { isProductionEnvironment } from "@/lib/env";

export function getOptionalSiteUrl() {
  const siteUrl = readSiteUrlValue();

  if (!siteUrl) {
    if (isProductionEnvironment()) {
      return null;
    }

    return FALLBACK_SITE_URL;
  }

  return siteUrl;
}

export function getSiteUrl() {
  const siteUrl = readSiteUrlValue();

  if (!siteUrl) {
    if (isProductionEnvironment()) {
      throw new Error(MISSING_SITE_URL_ERROR);
    }

    return FALLBACK_SITE_URL;
  }

  return siteUrl;
}
```

- [ ] **Step 5: Add explicit local/demo vs deploy scripts**

Update the `scripts` section in `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "verify": "npm run test && npm run lint && npm run build",
    "db:generate": "prisma generate",
    "db:migrate": "node prisma/migrate.mjs",
    "db:migrate:deploy": "prisma migrate deploy",
    "db:seed": "node prisma/seed.mjs",
    "db:reset:demo": "npm run db:generate && npm run db:migrate && npm run db:seed",
    "db:studio": "prisma studio"
  }
}
```

Update `.env.example`:

```env
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
AUTH_SECRET="replace-me-with-a-long-random-string"

# Production examples:
# DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/minishop?schema=public"
# NEXT_PUBLIC_SITE_URL="https://minishop.example.com"
# AUTH_SECRET="use-a-long-random-secret-per-environment"
```

- [ ] **Step 6: Run the focused env test again**

Run:
```bash
npm run test -- tests/lib/env.test.js
```

Expected:
- Vitest passes all env-helper tests.

- [ ] **Step 7: Run the broader app verification after tightening env rules**

Run:
```bash
DATABASE_URL="file:./dev.db" NEXT_PUBLIC_SITE_URL="http://127.0.0.1:3000" AUTH_SECRET="test-auth-secret" npm run db:reset:demo
DATABASE_URL="file:./dev.db" NEXT_PUBLIC_SITE_URL="http://127.0.0.1:3000" AUTH_SECRET="test-auth-secret" npm run verify
```

Expected:
- `npm run db:reset:demo` recreates and seeds the SQLite demo DB.
- `npm run test` passes.
- `npm run lint` passes.
- `npm run build` completes successfully.

- [ ] **Step 8: Commit the env/scripts guardrail work**

Run:
```bash
git add src/lib/env.js tests/lib/env.test.js src/lib/auth.js src/lib/db.js src/lib/seo.js package.json package-lock.json .env.example
git commit -m "chore: add production env guardrails"
```

---

### Task 2: Add Playwright smoke coverage for auth, catalog, and checkout

**Files:**
- Create: `playwright.config.mjs`
- Create: `tests/e2e/smoke.spec.js`
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: Add the failing smoke suite**

Create `tests/e2e/smoke.spec.js`:

```js
import { expect, test } from "@playwright/test";

test("anonymous users are redirected to login before admin", async ({
  page,
}) => {
  await page.goto("/admin");

  await expect(page).toHaveURL(/\/login\?next=%2Fadmin$/);
  await expect(
    page.getByRole("heading", { name: "Đăng nhập bằng tài khoản thật" }),
  ).toBeVisible();
});

test("admin can log in and reach the dashboard", async ({ page }) => {
  await page.goto("/login?next=/admin");
  await page.getByLabel("Email").fill("admin@minishop.local");
  await page.getByLabel("Mật khẩu").fill("admin123");
  await page.getByRole("button", { name: "Đăng nhập" }).click();

  await expect(page).toHaveURL("/admin");
  await expect(
    page.getByRole("heading", {
      name: "Quản lý MiniShop bằng route guard phía server",
    }),
  ).toBeVisible();
});

test("catalog search and checkout happy path still work", async ({ page }) => {
  await page.goto("/products?q=air");

  await expect(
    page.getByRole("heading", { name: "Air Runner Basic" }),
  ).toBeVisible();

  await page
    .getByRole("link", { name: "Xem chi tiết Air Runner Basic" })
    .click();
  await page.getByRole("button", { name: "Thêm vào giỏ" }).click();
  await page.getByRole("link", { name: "Mở giỏ hàng" }).click();

  await expect(page).toHaveURL("/cart");
  await page.getByRole("link", { name: "Tiến hành checkout" }).click();

  await page.getByLabel("Họ tên").fill("Smoke Test");
  await page.getByLabel("Email").fill("smoke@example.com");
  await page.getByLabel("Số điện thoại").fill("0900000000");
  await page.getByLabel("Địa chỉ giao hàng").fill("123 Smoke Street");
  await page.getByRole("button", { name: "Đặt hàng" }).click();

  await expect(page).toHaveURL(/\/order-success\?orderId=/);
  await expect(page.getByText("Mã tham chiếu từ URL")).toBeVisible();
});
```

- [ ] **Step 2: Run the smoke command before Playwright is installed**

First extend `package.json`:

```json
{
  "scripts": {
    "e2e:install": "playwright install --with-deps chromium",
    "e2e:prepare": "npm run db:reset:demo",
    "e2e": "npm run e2e:prepare && playwright test"
  }
}
```

Run:
```bash
npm run e2e
```

Expected:
- npm fails because `playwright` / `@playwright/test` is not installed yet.

- [ ] **Step 3: Install Playwright and add the config**

Run:
```bash
npm install -D @playwright/test
```

Create `playwright.config.mjs`:

```js
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
        command: "npm run dev -- --hostname 127.0.0.1 --port 3000",
        url: "http://127.0.0.1:3000",
        reuseExistingServer: !process.env.CI,
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
```

Update `.gitignore`:

```gitignore
playwright-report/
test-results/
```

- [ ] **Step 4: Install the browser binary and run the smoke suite**

Run:
```bash
npm run e2e:install
npm run e2e
```

Expected:
- Demo DB is regenerated and seeded.
- Playwright starts the app locally.
- All 3 smoke tests pass in Chromium.

- [ ] **Step 5: Commit the smoke-test setup**

Run:
```bash
git add playwright.config.mjs tests/e2e/smoke.spec.js package.json package-lock.json .gitignore
git commit -m "test: add playwright smoke coverage"
```

---

### Task 3: Wire baseline GitHub Actions CI around the demo DB and smoke suite

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create the CI workflow**

Create `.github/workflows/ci.yml`:

```yml
name: ci

on:
  push:
    branches:
      - main
  pull_request:

permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    env:
      DATABASE_URL: "file:./dev.db"
      NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3000"
      AUTH_SECRET: "ci-auth-secret"
      CI: "true"
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browser
        run: npm run e2e:install

      - name: Rebuild demo database
        run: npm run db:reset:demo

      - name: Run unit and integration tests
        run: npm run test

      - name: Run lint
        run: npm run lint

      - name: Build app
        run: npm run build

      - name: Run smoke tests
        run: npm run e2e
```

- [ ] **Step 2: Mirror the workflow locally**

Run:
```bash
DATABASE_URL="file:./dev.db" NEXT_PUBLIC_SITE_URL="http://127.0.0.1:3000" AUTH_SECRET="ci-auth-secret" npm run db:reset:demo
DATABASE_URL="file:./dev.db" NEXT_PUBLIC_SITE_URL="http://127.0.0.1:3000" AUTH_SECRET="ci-auth-secret" npm run verify
DATABASE_URL="file:./dev.db" NEXT_PUBLIC_SITE_URL="http://127.0.0.1:3000" AUTH_SECRET="ci-auth-secret" npm run e2e
```

Expected:
- The local command sequence matches the CI workflow and both commands pass.

- [ ] **Step 3: Commit the CI workflow**

Run:
```bash
git add .github/workflows/ci.yml
git commit -m "ci: verify build and smoke flows"
```

---

### Task 4: Document the deploy/readiness story, including Postgres production notes

**Files:**
- Create: `docs/deploy/production-readiness.md`
- Modify: `README.md`

- [ ] **Step 1: Write the dedicated production-readiness document**

Create `docs/deploy/production-readiness.md`:

````md
# MiniShop Production Readiness

## 1. What stays local-demo-only

- `npm run db:migrate` is destructive and SQLite-specific.
- `npm run db:seed` resets demo data; do not run it against real customer data.
- The repo's committed migration SQL currently represents the SQLite teaching path.

## 2. Required environment variables

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/minishop?schema=public"
NEXT_PUBLIC_SITE_URL="https://minishop.example.com"
AUTH_SECRET="use-a-long-random-secret-per-environment"
```

- `DATABASE_URL`: required by Prisma and every DB-backed render/build path.
- `NEXT_PUBLIC_SITE_URL`: required for canonical URLs, Open Graph URLs, `robots.txt`, and `sitemap.xml`.
- `AUTH_SECRET`: required for hashing session tokens and validating cookies.

## 3. Local demo workflow

```bash
npm install
npm run db:reset:demo
npm run dev
```

Use this flow for teaching, local debugging, and smoke-test preparation.

## 4. Production DB strategy

- Keep SQLite for course delivery and local demo speed.
- For a real deployment, create a dedicated Postgres rollout branch or worktree.
- In that Postgres rollout branch:
  - change Prisma datasource provider from `sqlite` to `postgresql`
  - point `DATABASE_URL` at the real Postgres instance
  - create a fresh initial Postgres migration history
  - use `npm run db:migrate:deploy` for later schema changes
- Do not assume the existing SQLite SQL migrations can be replayed directly on Postgres unchanged.

## 5. Pre-deploy checklist

```bash
npm run verify
npm run e2e
```

Manual checks:

- Visit `/`, `/products`, `/products/[slug]`, `/cart`, `/checkout`, `/login`, `/admin`.
- Confirm anonymous `/admin` redirects to `/login?next=/admin`.
- Log in with the seeded admin account and confirm `/admin` loads.
- Complete one checkout flow and confirm redirect to `/order-success?orderId=...`.
- Open `/robots.txt` and `/sitemap.xml` under the real domain.

## 6. CI expectations

- Every push/PR should recreate the demo DB.
- CI should run `test`, `lint`, `build`, and `e2e`.
- Smoke tests should stay small; add cases only when a regression escaped lower-level tests.
````

- [ ] **Step 2: Update the README to point at the new deploy workflow**

Update the relevant sections in `README.md`:

````md
## Local setup

1. Cai dependencies:

```bash
npm install
```

2. Dam bao may da co `sqlite3` CLI vi `npm run db:migrate` hien shell-out truc tiep sang lenh nay.

3. Tao file env tu template:

```bash
cp .env.example .env
```

4. Tao lai demo database + seed:

```bash
npm run db:reset:demo
```

5. Chay app:

```bash
npm run dev
```

## Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test
npm run verify
npm run e2e:install
npm run e2e
npm run db:generate
npm run db:migrate
npm run db:migrate:deploy
npm run db:seed
npm run db:reset:demo
npm run db:studio
```

## Production checklist

Xem them tai `docs/deploy/production-readiness.md`.
````

- [ ] **Step 3: Verify the docs mention every new command and deploy note**

Run:
```bash
rg -n "db:reset:demo|db:migrate:deploy|npm run e2e|production-readiness" README.md docs/deploy/production-readiness.md package.json
```

Expected:
- `README.md`, `docs/deploy/production-readiness.md`, and `package.json` all reference the same command names.

- [ ] **Step 4: Commit the deploy/readiness docs**

Run:
```bash
git add README.md docs/deploy/production-readiness.md
git commit -m "docs: add production readiness guide"
```

---

## Self-Review

### Spec coverage

- Production DB mindset: covered by Task 1 command split and Task 4 Postgres rollout notes.
- Deploy checklist: covered by Task 4 dedicated doc + README link.
- CI basics (`test`, `lint`, `build`): covered by Task 3.
- E2E smoke tests for login/admin guard/catalog/checkout: covered by Task 2.
- Important env verification (`DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`, `AUTH_SECRET`): covered by Task 1 helper + Task 4 docs.

### Placeholder scan

- No `TODO`, `TBD`, “appropriate error handling”, or “write tests later” placeholders remain.
- Every created file has concrete starter content.
- Every command step includes a concrete command and expected result.

### Type consistency

- New command names are consistent across tasks: `verify`, `db:reset:demo`, `db:migrate:deploy`, `e2e:install`, `e2e`.
- Env helper API names are consistent across tests and implementation: `assertEnv`, `getMissingEnvNames`, `isProductionEnvironment`, `readRequiredEnv`.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-24-minishop-buoi-12.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
