# MiniShop

MiniShop la course project Next.js App Router mo phong mot flow ban hang hoan chinh:

`landing -> catalog -> product detail -> cart -> checkout -> order-success -> admin`

Hien tai app da co:

- storefront doc du lieu tu Prisma + PostgreSQL
- catalog co `search`, `category filter`, `pagination` bang URL search params
- cart chay phia client bang Context + `localStorage`
- checkout goi `POST /api/orders`, tao order va tru ton kho
- admin product CRUD bang Server Actions
- auth that bang email/password + session cookie phia server
- admin order management va category CRUD voi server-side role guard
- SEO co ban voi `metadata`, `sitemap.xml`, `robots.txt`, canonical/Open Graph

## Tech stack

- `next@16`
- `react@19`
- `prisma`
- `postgresql`
- `docker compose`
- `vitest`
- `eslint`

## Local setup

1. Cai dependencies:

```bash
npm install
```

2. Tao file env tu template:

```bash
cp .env.example .env
```

3. Khoi dong local Postgres bang Docker:

```bash
npm run db:up
```

4. Cho Postgres san sang roi moi reset demo DB. Co the kiem tra bang `docker compose ps` va doi service database vao trang thai healthy/running.

5. Tao lai demo database + seed:

```bash
npm run db:reset:demo
```

6. Chay app:

```bash
npm run dev
```

7. Mo `http://localhost:3000`

## Environment variables

`.env.example` hien dung dung cac bien app dang doc:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/minishop?schema=public"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
AUTH_SECRET="replace-me-with-a-long-random-string"
```

Ghi chu:

- `DATABASE_URL` la bat buoc cho Prisma.
- Local mac dinh tro vao Postgres container tu `docker-compose.yml`; production phai tro vao external Postgres.
- `NEXT_PUBLIC_SITE_URL` nen luon duoc set; local dung `http://localhost:3000`, production dung domain that.
- `AUTH_SECRET` la bat buoc de ky/xac thuc session token phia server. Dev co the dung chuoi dai ngau nhien; production can dat secret rieng, khong commit.
- `.env.example` da kem production examples cho `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`, `AUTH_SECRET`.
- Neu doi hostname/user/password cho Postgres local, cap nhat lai `DATABASE_URL` trong `.env` cho khop.

## Demo flow

### Storefront

1. Vao `/` de xem landing + featured products.
2. Vao `/products` de test catalog search/filter/pagination.
3. Vao `/products/[slug]` de xem product detail.
4. Add to cart, mo `/cart`, roi sang `/checkout`.
5. Submit form checkout de goi `POST /api/orders`.
6. Sau khi tao order thanh cong app redirect sang `/order-success?orderId=...`.

### Demo roles

Auth hien dung user that trong database + session cookie `httpOnly` phia server.

- `ADMIN`
  - Login o `/login`
  - Co the vao `/admin`
  - Quan ly products, categories, orders
- `CUSTOMER`
  - Login o `/login`
  - Khong vao duoc `/admin`
  - Bi redirect ve `/login?next=/admin`

Tai khoan demo seed san:

- `ADMIN`: `admin@minishop.local` / `admin123`
- `CUSTOMER`: `customer@minishop.local` / `customer123`

Luu y: `CUSTOMER` van khong vao duoc `/admin` du dang nhap thanh cong.

## Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test
npm run verify
npm run e2e:install
npm run e2e:prepare
npm run e2e
npm run db:up
npm run db:down
npm run db:generate
npm run db:migrate
npm run db:migrate:deploy
npm run db:seed
npm run db:reset:demo
npm run db:studio
```

Luu y:

- `npm run verify` chay `test + lint + build`.
- `npm run e2e` hien chi la `playwright test`; Playwright config tu quan ly demo Postgres reset + dev server cho local CI-style runs.
- `npm run e2e:install` cai browser/deps Playwright, can thiet cho local machine/CI moi.
- `npm run e2e:prepare` gom reset demo DB truoc E2E khi can chay thu cong ben ngoai Playwright flow; can co Postgres local dang chay.
- `npm run db:up` / `npm run db:down` dung de bat/tat Postgres local qua Docker Compose.
- Sau `npm run db:up`, nen doi Postgres san sang (`docker compose ps` hoac `pg_isready`) truoc khi chay `npm run db:reset:demo`.
- `npm run db:migrate` va `npm run db:reset:demo` danh cho local Postgres workflow.
- `npm run db:migrate:deploy` la lenh migrate cho deploy/prod tren external Postgres.
- `npm run db:reset:demo` la shortcut local/demo: reset schema + apply migrations + seed lai toan bo demo data.
- `npm run db:seed` dang `deleteMany()` toan bo `orderItem`, `order`, `product`, `category`, `user` roi seed lai categories/products mau.
- Neu can giu du lieu local, khong chay seed bua truoc khi backup.

## Route map

### Public pages

- `/` -> landing page + featured products
- `/products` -> catalog voi `q`, `category`, `page`
- `/products/[slug]` -> product detail
- `/cart` -> cart phia client
- `/checkout` -> checkout form, goi order API
- `/order-success` -> trang redirect sau checkout
- `/login` -> email/password login

### Protected admin pages

- `/admin` -> admin dashboard
- `/admin/categories` -> category list
- `/admin/categories/new` -> create category
- `/admin/categories/[id]/edit` -> edit category
- `/admin/products` -> product list
- `/admin/products/new` -> create product
- `/admin/products/[id]/edit` -> edit product
- `/admin/orders` -> order list
- `/admin/orders/[id]` -> order detail + update status

### API routes

- `GET /api/categories` -> category list
- `GET /api/products` -> product list
- `POST /api/products` -> create product, admin-only
- `GET /api/products/[id]` -> product detail by id
- `PATCH /api/products/[id]` -> update product, admin-only
- `DELETE /api/products/[id]` -> delete product, admin-only
- `POST /api/orders` -> create order, validate payload, reserve stock

### SEO routes

- `/robots.txt` -> dung `NEXT_PUBLIC_SITE_URL`
- `/sitemap.xml` -> sinh tu homepage, catalog, product slugs

## Du lieu seed

Seed hien tao:

- 3 categories: `running`, `lifestyle`, `outdoor`
- 10 products demo
- 2 users demo: `ADMIN`, `CUSTOMER`

Category delete co relation safety: neu van con product tham chieu category do, admin se bi chan xoa.

Seed khong tao:

- order mau

Muon test admin orders, hay tao don qua flow `/cart -> /checkout`.

## Production checklist

Xem them tai `docs/deploy/production-readiness.md`.

## Vercel notes

- Vercel can khai bao toi thieu:
  - `DATABASE_URL`
  - `NEXT_PUBLIC_SITE_URL`
  - `AUTH_SECRET`
- Production tren Vercel phai dung external Postgres; khong co local database bundled/phu hop cho runtime production.
- Dat `NEXT_PUBLIC_SITE_URL` bang domain production day du, vi du `https://minishop.example.com`; khong de `localhost`.
- Dat `AUTH_SECRET` bang secret dai, ngau nhien, rieng cho tung environment; khong reuse gia tri demo.
- Vi app co `robots.txt`, `sitemap.xml`, Open Graph/canonical dua tren helper SEO, thieu `NEXT_PUBLIC_SITE_URL` o production se lam cac code path SEO can `getSiteUrl()` fail theo guard hien tai.

## Cau truc hoc phan hien tai

- Buoi 5: Prisma + PostgreSQL
- Buoi 6: API routes
- Buoi 7: admin product CRUD
- Buoi 8: cart + checkout + order API
- Buoi 9: auth stub + admin order management
- Buoi 10 Task 3: SEO semantics cung hon cho production
- Buoi 11: real session auth + protected mutation APIs + admin category CRUD
