# MiniShop Postgres Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the repo's SQLite runtime with PostgreSQL, run the local database through Docker Compose, and keep deploys pointed at an external `DATABASE_URL`.

**Architecture:** Keep the app process on the host for normal `npm run dev`, but make every environment talk to PostgreSQL. Remove the SQLite-only reset script and migration history, create a fresh initial Prisma migration for Postgres, and convert CI/E2E/docs so every workflow assumes the same DB engine.

**Tech Stack:** Next.js 16 App Router, React 19, JavaScript, Prisma ORM, PostgreSQL 16, Docker Compose, Vitest, Playwright, GitHub Actions.

---

## Current Codebase Notes

- `package.json:5-20` still wires `db:migrate` through `node prisma/migrate.mjs`, which is a SQLite-only reset helper.
- `prisma/schema.prisma:5-8` still declares `provider = "sqlite"`.
- `.env.example:1-8` still points local `DATABASE_URL` at `file:./dev.db`.
- `.gitignore:25-30` still ignores `prisma/dev.db*`, which becomes dead config after the migration.
- `.github/workflows/ci.yml:16-53` still injects `DATABASE_URL=file:./dev.db` and installs `sqlite3`.
- `playwright.config.mjs:14-25` resets the demo DB before starting the dev server, but currently relies on the SQLite reset path.
- `README.md:18-135` and `docs/deploy/production-readiness.md:3-63` both document a SQLite-first workflow that needs a full rewrite.

## File Map

- Create: `docker-compose.yml`
- Create: `prisma/migrations/20260524000000_init_postgres/migration.sql`
- Modify: `package.json:5-36`
- Modify: `.env.example:1-8`
- Modify: `.gitignore:25-30`
- Modify: `prisma/schema.prisma:5-8`
- Modify: `prisma/migrations/migration_lock.toml`
- Modify: `.github/workflows/ci.yml:16-53`
- Modify: `playwright.config.mjs:14-25`
- Modify: `README.md:18-135`
- Modify: `README.md:196-204`
- Modify: `docs/deploy/production-readiness.md:3-63`
- Delete: `prisma/migrate.mjs`
- Delete: `prisma/dev.db`
- Delete: `prisma/migrations/20260516000000_init/migration.sql`
- Delete: `prisma/migrations/20260523000000_add_sessions/migration.sql`

## Verification Strategy

- Config sanity: `docker compose config`
- DB lifecycle: `npm run db:up`, `npm run db:reset:demo`, `npm run db:down`
- App checks: `npm run test`, `npm run build`
- Browser smoke: `npm run e2e`
- CI parity: inspect `.github/workflows/ci.yml`, then mirror with local commands instead of assuming the YAML is correct

---

### Task 1: Replace SQLite-only local tooling with Docker Compose Postgres

**Files:**
- Create: `docker-compose.yml`
- Modify: `package.json:5-36`
- Modify: `.env.example:1-8`
- Modify: `.gitignore:25-30`
- Delete: `prisma/migrate.mjs`
- Delete: `prisma/dev.db`

- [ ] **Step 1: Create the local Postgres Compose file**

Create `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: minishop-postgres
    environment:
      POSTGRES_DB: minishop
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d minishop"]
      interval: 5s
      timeout: 5s
      retries: 20

volumes:
  postgres_data:
```

- [ ] **Step 2: Replace the package scripts and register Prisma seed**

Update `package.json` so the script block and Prisma seed block look like this:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "e2e:install": "playwright install --with-deps chromium",
    "e2e:prepare": "npm run db:reset:demo",
    "e2e": "playwright test",
    "verify": "npm run test && npm run lint && npm run build",
    "db:up": "docker compose up -d",
    "db:down": "docker compose down",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:migrate:deploy": "prisma migrate deploy",
    "db:seed": "prisma db seed",
    "db:reset:demo": "prisma migrate reset --force",
    "db:studio": "prisma studio"
  },
  "prisma": {
    "seed": "node prisma/seed.mjs"
  }
}
```

- [ ] **Step 3: Replace the sample env and remove dead ignore rules**

Update `.env.example`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/minishop?schema=public"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
AUTH_SECRET="replace-me-with-a-long-random-string"

# Production examples:
# DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/minishop?schema=public"
# NEXT_PUBLIC_SITE_URL="https://minishop.example.com"
# AUTH_SECRET="use-a-long-random-secret-per-environment"
```

Update `.gitignore` by removing the obsolete SQLite artifact line so the `# misc` block becomes:

```gitignore
# misc
.DS_Store
*.pem
.worktrees/
```

- [ ] **Step 4: Delete SQLite-only artifacts**

Run:

```bash
rm prisma/migrate.mjs
rm -f prisma/dev.db
```

Expected:
- `prisma/migrate.mjs` is gone from the tree.
- The repo no longer contains a checked-in SQLite database file.

- [ ] **Step 5: Verify the new local DB tooling works**

Run:

```bash
docker compose config
npm run db:up
docker compose ps
```

Expected:
- `docker compose config` exits `0`.
- `npm run db:up` starts `minishop-postgres`.
- `docker compose ps` shows the `postgres` service as `healthy` or `running`.

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml package.json .env.example .gitignore
git add -u prisma/migrate.mjs prisma/dev.db
git commit -m "chore: switch local db tooling to docker compose postgres"
```

---

### Task 2: Convert Prisma to Postgres and rebuild migration history

**Files:**
- Modify: `prisma/schema.prisma:5-8`
- Modify: `prisma/migrations/migration_lock.toml`
- Create: `prisma/migrations/20260524000000_init_postgres/migration.sql`
- Delete: `prisma/migrations/20260516000000_init/migration.sql`
- Delete: `prisma/migrations/20260523000000_add_sessions/migration.sql`

- [ ] **Step 1: Point Prisma at PostgreSQL**

Update the datasource block in `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

- [ ] **Step 2: Replace the migration lock file and remove the old SQLite migration folders**

Update `prisma/migrations/migration_lock.toml`:

```toml
provider = "postgresql"
```

Run:

```bash
rm -rf prisma/migrations/20260516000000_init
rm -rf prisma/migrations/20260523000000_add_sessions
mkdir -p prisma/migrations/20260524000000_init_postgres
```

Expected:
- Only `prisma/migrations/migration_lock.toml` and the new `20260524000000_init_postgres/` folder remain.

- [ ] **Step 3: Create the fresh initial Postgres migration**

Create `prisma/migrations/20260524000000_init_postgres/migration.sql`:

```sql
-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "originalPrice" INTEGER,
    "image" TEXT,
    "badge" TEXT,
    "note" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "shippingAddress" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "total" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_featured_idx" ON "Product"("featured");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- AddForeignKey
ALTER TABLE "Session"
ADD CONSTRAINT "Session_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product"
ADD CONSTRAINT "Product_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order"
ADD CONSTRAINT "Order_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem"
ADD CONSTRAINT "OrderItem_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem"
ADD CONSTRAINT "OrderItem_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
```

- [ ] **Step 4: Generate the Prisma client and rebuild the demo DB**

Run:

```bash
npm run db:generate
npm run db:reset:demo
```

Expected:
- `prisma generate` exits `0`.
- `prisma migrate reset --force` applies `20260524000000_init_postgres`.
- The seed script recreates 3 categories, 10 demo products, and 2 demo users.

- [ ] **Step 5: Verify the seeded Postgres database contains the expected rows**

Run:

```bash
node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const db = new PrismaClient(); const counts = await Promise.all([db.category.count(), db.product.count(), db.user.count(), db.session.count()]); console.log(JSON.stringify({ categories: counts[0], products: counts[1], users: counts[2], sessions: counts[3] })); await db.$disconnect();"
```

Expected:

```json
{"categories":3,"products":10,"users":2,"sessions":0}
```

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git add -u prisma/migrations
git commit -m "feat: migrate prisma schema to postgres"
```

---

### Task 3: Convert CI and E2E flows to the new Postgres lifecycle

**Files:**
- Modify: `.github/workflows/ci.yml:16-53`
- Modify: `playwright.config.mjs:14-25`

- [ ] **Step 1: Update Playwright so local smoke runs can self-start Postgres**

Replace the `webServer` block in `playwright.config.mjs` with:

```js
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command:
          "npm run db:up && npm run db:reset:demo && npm run dev -- --hostname 127.0.0.1 --port 3000",
        env: {
          ...process.env,
          DATABASE_URL:
            process.env.DATABASE_URL ??
            "postgresql://postgres:postgres@localhost:5432/minishop?schema=public",
          AUTH_SECRET: process.env.AUTH_SECRET ?? "test-auth-secret",
          NEXT_PUBLIC_SITE_URL:
            process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000",
        },
        url: "http://127.0.0.1:3000",
        reuseExistingServer: false,
        timeout: 120000,
      },
```

- [ ] **Step 2: Update GitHub Actions to run against Compose-backed Postgres**

Replace the `env` block and SQLite-specific steps in `.github/workflows/ci.yml` with:

```yaml
    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/minishop?schema=public
      NEXT_PUBLIC_SITE_URL: http://127.0.0.1:3000
      AUTH_SECRET: ci-auth-secret
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

      - name: Start Postgres
        run: npm run db:up

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

- [ ] **Step 3: Run the smoke flow locally**

Run:

```bash
npm run e2e
```

Expected:
- Playwright starts Postgres if needed.
- The app boots on `http://127.0.0.1:3000`.
- All smoke tests in `tests/e2e/smoke.spec.js` pass against the Postgres-backed app.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml playwright.config.mjs
git commit -m "chore: move ci and e2e to postgres workflow"
```

---

### Task 4: Rewrite docs for the Postgres-first workflow

**Files:**
- Modify: `README.md:18-135`
- Modify: `README.md:196-204`
- Modify: `docs/deploy/production-readiness.md:3-63`

- [ ] **Step 1: Rewrite the README tech stack, setup, env, and commands sections**

In `README.md`, make these content replacements:

```md
## Tech stack

- `next@16`
- `react@19`
- `prisma`
- `postgresql`
- `docker compose`
- `vitest`
- `eslint`
```

````md
## Local setup

1. Cai dependencies:

```bash
npm install
```

2. Tao file env tu template:

```bash
cp .env.example .env
```

3. Start local Postgres:

```bash
npm run db:up
```

4. Reset schema + seed demo data:

```bash
npm run db:reset:demo
```

5. Chay app:

```bash
npm run dev
```

6. Mo `http://localhost:3000`
````

````md
## Environment variables

`.env.example` hien dung cac bien app dang doc:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/minishop?schema=public"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
AUTH_SECRET="replace-me-with-a-long-random-string"
```

Ghi chu:

- `DATABASE_URL` la bat buoc cho Prisma.
- Local mac dinh dung Postgres trong Docker Compose o `localhost:5432`.
- Production dung `DATABASE_URL` cua Postgres ben ngoai, khong dung `docker-compose.yml` cua repo.
- `NEXT_PUBLIC_SITE_URL` nen luon duoc set; local dung `http://localhost:3000`, production dung domain that.
- `AUTH_SECRET` la bat buoc de ky/xac thuc session token phia server.
````

```md
Luu y:

- `npm run verify` chay `test + lint + build`.
- `npm run db:up` va `npm run db:down` quan ly Postgres local bang Docker Compose.
- `npm run db:migrate` dung `prisma migrate dev` cho local schema changes.
- `npm run db:migrate:deploy` la lenh migration discipline cho deploy.
- `npm run db:reset:demo` la lenh destructive, chi dung cho local/demo.
- `npm run db:seed` se ghi lai demo data, khong chay vao production DB.
```

- [ ] **Step 2: Rewrite the README production note so it stops recommending SQLite**

Replace `README.md:196-204` with:

```md
## Vercel notes

- Vercel can khai bao toi thieu:
  - `DATABASE_URL`
  - `NEXT_PUBLIC_SITE_URL`
  - `AUTH_SECRET`
- `DATABASE_URL` phai tro toi Postgres ben ngoai co the truy cap tu Vercel.
- Neu deploy len domain that, dat `NEXT_PUBLIC_SITE_URL` dung domain do, khong de `localhost`.
- Vi app co `robots.txt`, `sitemap.xml`, Open Graph/canonical dua tren helper SEO, thieu `NEXT_PUBLIC_SITE_URL` o production se lam cac code path SEO fail.
```

- [ ] **Step 3: Rewrite the production-readiness doc around Postgres**

Replace the operational sections in `docs/deploy/production-readiness.md` with:

````md
## 1. What stays local/demo-only

- `npm run db:reset:demo` la destructive va chi dung cho local/demo.
- `npm run db:seed` rewrite demo data; khong chay vao database that.
- `docker-compose.yml` chi de cap Postgres local, khong phai production topology.

## 2. Required environment variables

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/minishop?schema=public"
NEXT_PUBLIC_SITE_URL="https://minishop.example.com"
AUTH_SECRET="use-a-long-random-secret-per-environment"
```

- `DATABASE_URL` la bat buoc cho Prisma va moi DB-backed render/build path.
- `NEXT_PUBLIC_SITE_URL` la bat buoc cho canonical, Open Graph, `robots.txt`, va `sitemap.xml`.
- `AUTH_SECRET` la bat buoc cho session token signing va cookie validation.

## 3. Local workflow

```bash
npm install
cp .env.example .env
npm run db:up
npm run db:reset:demo
npm run dev
```

## 4. Production DB strategy

- Production dung Postgres duoc quan ly ben ngoai repo.
- App deploy chi can `DATABASE_URL` tro toi database do.
- Release step phai chay `npm run db:migrate:deploy`.
- Khong chay `db:reset:demo` hoac `db:seed` vao production DB.

## 5. Pre-deploy checklist

```bash
npm run verify
E2E_BASE_URL="https://minishop.example.com" npm run e2e
```

Manual checks:

- Visit `/`, `/products`, `/products/[slug]`, `/cart`, `/checkout`, `/login`, and `/admin`.
- Confirm anonymous `/admin` redirects to `/login?next=/admin`.
- Log in with the seeded admin account and confirm `/admin` loads.
- Complete one checkout flow and confirm redirect to `/order-success?orderId=...`.
- Open `/robots.txt` and `/sitemap.xml` under the real domain.

## 6. CI expectations

- CI should start Postgres with `docker compose up -d`.
- CI should rebuild the demo DB with `npm run db:reset:demo`.
- CI should run `test`, `lint`, `build`, and `e2e`.
````

- [ ] **Step 4: Verify the docs no longer describe SQLite as the active runtime**

Run:

```bash
rg -n "sqlite3|file:\\./dev\\.db|provider = \"sqlite\"|SQLite-first" README.md docs/deploy/production-readiness.md
```

Expected:
- No matches.

- [ ] **Step 5: Commit**

```bash
git add README.md docs/deploy/production-readiness.md
git commit -m "docs: rewrite setup and deploy guides for postgres"
```

---

### Task 5: Final verification and cleanup

**Files:**
- Verify only: working tree after Tasks 1-4

- [ ] **Step 1: Run the full verification suite**

Run:

```bash
npm run verify
npm run e2e
```

Expected:
- Vitest passes.
- ESLint passes.
- Next.js build passes.
- Playwright smoke tests pass against the Postgres-backed app.

- [ ] **Step 2: Confirm no SQLite-specific artifacts remain**

Run:

```bash
rg -n "sqlite|dev\\.db|sqlite3" package.json prisma .github/workflows/ci.yml README.md docs/deploy/production-readiness.md playwright.config.mjs .gitignore
```

Expected:
- No matches in runtime/config/docs paths.

- [ ] **Step 3: Stop local services**

Run:

```bash
npm run db:down
```

Expected:
- The `minishop-postgres` container is stopped and removed.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: finish postgres migration rollout"
```
