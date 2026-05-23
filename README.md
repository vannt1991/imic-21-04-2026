# MiniShop

MiniShop la course project Next.js App Router mo phong mot flow ban hang hoan chinh:

`landing -> catalog -> product detail -> cart -> checkout -> order-success -> admin`

Hien tai app da co:

- storefront doc du lieu tu Prisma + SQLite
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
- `sqlite`
- `vitest`
- `eslint`

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

4. Generate Prisma Client:

```bash
npm run db:generate
```

5. Tao `prisma/dev.db` tu migration local hien tai:

```bash
npm run db:migrate
```

6. Seed database local:

```bash
npm run db:seed
```

7. Chay app:

```bash
npm run dev
```

8. Mo `http://localhost:3000`

## Environment variables

`.env.example` hien dung dung cac bien app dang doc:

```env
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
AUTH_SECRET="replace-me-with-a-long-random-string"
```

Ghi chu:

- `DATABASE_URL` la bat buoc cho Prisma.
- `NEXT_PUBLIC_SITE_URL` nen luon duoc set.
- `AUTH_SECRET` la bat buoc de ky/xac thuc session token phia server. Dev co the dung chuoi dai ngau nhien; production can dat secret rieng, khong commit.
- Theo semantics hien tai cua Task 3, dev/test co the fallback ve `http://localhost:3000`.
- O production, `NEXT_PUBLIC_SITE_URL` van nen duoc set day du. Cac code path dung `getSiteUrl()` / `buildAbsoluteUrl()` nhu `robots.txt`, `sitemap.xml`, canonical/Open Graph URL se fail neu bien nay thieu.

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
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:studio
```

Luu y:

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
- `POST /api/products` -> create product
- `GET /api/products/[id]` -> product detail by id
- `PATCH /api/products/[id]` -> update product
- `DELETE /api/products/[id]` -> delete product
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

### Environment

- Set `DATABASE_URL` dung moi truong deploy.
- Set `NEXT_PUBLIC_SITE_URL` thanh domain production day du, vi du `https://minishop.example.com`.
- Set `AUTH_SECRET` thanh chuoi dai, random, va giu kin theo moi truong.
- Kiem tra production khong con dung fallback local URL.

### Database

- Chay `npm install`.
- Chay `npm run db:generate`.
- Luu y: `npm run db:migrate` hien la script local cho SQLite demo, khong phai migration flow production-aware theo `DATABASE_URL`.
- Neu deploy production that, can thiet ke migration flow rieng cho database production truoc khi app serve traffic.
- Xac nhan database co categories/products seed hoac du lieu that.
- Neu dinh chay `npm run db:seed`, hieu ro script hien tai se xoa du lieu dang co.

### App verification

- Chay `npm run test`.
- Chay `npm run lint`.
- Chay `npm run build`.
- Verify manual cac route chinh: `/`, `/products`, `/products/[slug]`, `/cart`, `/checkout`, `/login`, `/admin`.
- Test 2 role demo:
  - `CUSTOMER` bi chan khoi `/admin`
  - `ADMIN` vao duoc `/admin` va `/admin/categories`
- Tao thu 1 order de xac nhan `POST /api/orders` con hoat dong va stock bi giam dung.
- Thu xoa 1 category dang con product de xac nhan relation safety dang chan delete.
- Kiem tra `robots.txt`, `sitemap.xml`, canonical metadata dung dung domain production.

### Operational notes

- Admin auth hien la session auth tu lam de phuc vu bai hoc, van can hardening them neu dua vao production that.
- SQLite phu hop local/demo; neu deploy production nhieu instance, can xem lai chien luoc database.
- Cart dang o client `localStorage`, nen doi device/browser se khong dong bo.

## Vercel notes

- Vercel can khai bao toi thieu:
  - `DATABASE_URL`
  - `NEXT_PUBLIC_SITE_URL`
  - `AUTH_SECRET`
- Neu deploy len domain that, dat `NEXT_PUBLIC_SITE_URL` dung domain do, khong de `localhost`.
- Vi app co `robots.txt`, `sitemap.xml`, Open Graph/canonical dua tren helper SEO, thieu `NEXT_PUBLIC_SITE_URL` o production se lam cac code path SEO can `getSiteUrl()` fail theo guard hien tai.
- Neu tiep tuc dung SQLite tren Vercel, can kiem tra ky persistence va gioi han moi truong deploy; day hop hon cho demo/local hon la production nghiem tuc.

## Cau truc hoc phan hien tai

- Buoi 5: Prisma + SQLite
- Buoi 6: API routes
- Buoi 7: admin product CRUD
- Buoi 8: cart + checkout + order API
- Buoi 9: auth stub + admin order management
- Buoi 10 Task 3: SEO semantics cung hon cho production
- Buoi 11: real session auth + protected mutation APIs + admin category CRUD
