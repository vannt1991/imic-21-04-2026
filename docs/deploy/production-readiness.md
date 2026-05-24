# MiniShop Production Readiness

## 1. What stays local/demo-only

- `npm run db:migrate` is destructive and SQLite-specific.
- `npm run db:reset:demo` is for local/demo resets only and shells out to `sqlite3`.
- `npm run db:seed` rewrites demo data; do not run it against real customer data.
- The repo still uses Prisma `provider = "sqlite"` today, so Postgres is a documented rollout strategy, not the current runtime.

## 2. Required environment variables

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/minishop?schema=public"
NEXT_PUBLIC_SITE_URL="https://minishop.example.com"
AUTH_SECRET="use-a-long-random-secret-per-environment"
```

- `DATABASE_URL` is required by Prisma and all DB-backed render/build paths.
- `NEXT_PUBLIC_SITE_URL` is required for canonical URLs, Open Graph URLs, `robots.txt`, and `sitemap.xml`.
- `AUTH_SECRET` is required for session token signing and cookie validation.

## 3. Local demo workflow

```bash
npm install
cp .env.example .env
npm run db:reset:demo
npm run dev
```

Use this flow for teaching, local debugging, and CI-style smoke-test prep.

## 4. Production DB strategy

- Keep SQLite for course delivery and local demo speed.
- For a real deployment, create a dedicated Postgres rollout branch or worktree.
- In that Postgres rollout branch:
  - change Prisma datasource provider from `sqlite` to `postgresql`
  - point `DATABASE_URL` at the real Postgres instance
  - create a fresh initial Postgres migration history
  - use `npm run db:migrate:deploy` for later schema changes
- Do not assume the existing SQLite migration SQL can be replayed on Postgres unchanged.

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

- `.github/workflows/ci.yml` should install `sqlite3`, rebuild the demo DB, and run `test`, `lint`, `build`, and `e2e`.
- `npm run e2e` is plain `playwright test`. Without `E2E_BASE_URL`, Playwright self-manages the demo DB reset and local dev server; with `E2E_BASE_URL`, it targets the already-running deployment instead.
- Keep smoke coverage small; add cases only when a regression escaped lower-level tests.
