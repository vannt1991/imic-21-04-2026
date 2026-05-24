# MiniShop Production Readiness

## 1. What stays local/demo-only

- `npm run db:reset:demo` is destructive and local-only. It drops and recreates the local demo schema before reseeding.
- `npm run db:seed` is destructive and local-only. It rewrites demo users, categories, and products, and clears any local orders before reseeding.
- `docker-compose.yml` is local-only infra for the Postgres container used during development and smoke testing.
- `npm run db:migrate` is the local developer migration workflow. Do not point it at a shared/staging/production database.

## 2. Required environment variables

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/minishop?schema=public"
NEXT_PUBLIC_SITE_URL="https://minishop.example.com"
AUTH_SECRET="use-a-long-random-secret-per-environment"
```

- `DATABASE_URL` is required by Prisma and all DB-backed render/build paths.
- In every environment, `DATABASE_URL` must point at a Postgres instance.
- `NEXT_PUBLIC_SITE_URL` is required for canonical URLs, Open Graph URLs, `robots.txt`, and `sitemap.xml`.
- `AUTH_SECRET` is required for session token signing and cookie validation.

## 3. Local demo workflow

```bash
npm install
cp .env.example .env
npm run db:up
# wait for Postgres to be healthy/ready, e.g. `docker compose ps`
npm run db:reset:demo
npm run dev
```

Use this flow for teaching, local debugging, and CI-style smoke-test prep.

## 4. Production DB strategy

- Provision an external Postgres database for every deployed environment.
- Set `DATABASE_URL` to that external Postgres instance before build/deploy steps run.
- Apply schema changes in deploy pipelines with `npm run db:migrate:deploy`.
- Do not run `docker-compose.yml`, `npm run db:reset:demo`, or `npm run db:seed` against production data.

## 5. Pre-deploy checklist

```bash
npm run verify
E2E_BASE_URL="https://minishop.example.com" npm run e2e
```

Manual checks:

- Visit `/`, `/products`, `/products/[slug]`, `/cart`, `/checkout`, `/login`, and `/admin`.
- Confirm anonymous `/admin` redirects to `/login?next=/admin`.
- Confirm admin access works via your production bootstrap/provisioning path, using a separately created admin user instead of demo seed credentials.
- Complete one checkout flow and confirm redirect to `/order-success?orderId=...`.
- Open `/robots.txt` and `/sitemap.xml` under the real domain.

## 6. CI expectations

- `.github/workflows/ci.yml` should boot Postgres, set a Postgres `DATABASE_URL`, rebuild the demo DB, and run `test`, `lint`, `build`, and `e2e`.
- `npm run e2e` is plain `playwright test`. Without `E2E_BASE_URL`, Playwright self-manages the local Postgres demo DB reset and dev server; with `E2E_BASE_URL`, it targets the already-running deployment instead.
- Keep smoke coverage small; add cases only when a regression escaped lower-level tests.
