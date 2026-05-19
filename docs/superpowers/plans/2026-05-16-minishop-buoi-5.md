# MiniShop Buổi 5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local Prisma-backed database for MiniShop, seed categories/products, and switch the storefront/detail reads from mock arrays to DB queries without changing the presentational UI.

**Architecture:** Use SQLite + Prisma as the source of truth for product/category/order/user data. `src/lib/db.js` owns the Prisma singleton. `src/lib/products.js` becomes the server-side read adapter that maps Prisma rows into the current UI shape, so `src/components/*` can stay unchanged. `src/app/page.js`, `src/app/products/page.js`, and `src/app/products/[slug]/page.js` become async server components that read through those helpers. `prisma/schema.prisma` defines the e-commerce entities now, and `prisma/seed.mjs` creates the initial demo catalog for the course.

**Tech Stack:** Next.js App Router, React 19, JavaScript, Prisma ORM, SQLite, Prisma CLI, Vitest, `Intl.NumberFormat`.

---

## Current Codebase Notes

- `src/lib/products.js` still hardcodes the mock catalog and sync lookup helpers.
- `src/app/page.js` and `src/app/products/page.js` both read that mock catalog today.
- `src/app/products/[slug]/page.js` uses `getProductBySlug`, `getProductSlugs`, and `getRelatedProducts`, so the DB-backed rewrite has to preserve those exports.
- No Prisma files exist yet.
- `.gitignore` already ignores `.env*`, but it does not ignore the SQLite DB file Prisma will generate.

## File Map

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.gitignore`
- Create: `.env` `# local only, not committed`
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.mjs`
- Generated: `prisma/migrations`
- Create: `src/lib/db.js`
- Create: `tests/lib/products.test.js`
- Modify: `src/lib/products.js`
- Modify: `src/app/page.js`
- Modify: `src/app/products/page.js`
- Modify: `src/app/products/[slug]/page.js`

## Verification Strategy

- Use `npm run test -- tests/lib/products.test.js` for the pure adapter helper.
- Use `npm run lint` to catch import / async / JSX issues.
- Use `npm run build` to catch App Router, metadata, and static param problems.
- Use `npm run db:seed` and `npx prisma studio` to confirm the local DB has rows.
- Smoke test `/`, `/products`, and `/products/air-runner-basic` in the browser.

---

### Task 1: Bootstrap Prisma and the local SQLite target

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.gitignore`
- Create: `.env`
- Create: `src/lib/db.js`

- [ ] **Step 1: Capture the baseline**

Run:
```bash
npm run lint
npm run build
```

Expected:
- Both commands pass before any Prisma files exist.

- [ ] **Step 2: Install Prisma packages**

Run:
```bash
npm install @prisma/client prisma
```

Expected:
- `package.json` gains Prisma dependencies and the lockfile updates.

- [ ] **Step 3: Add the Prisma scripts, DB ignore rule, env, and singleton**

Update `package.json` scripts to this shape:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:seed": "node prisma/seed.mjs",
    "db:studio": "prisma studio"
  }
}
```

Extend `.gitignore` with the local Prisma DB file:

```gitignore
prisma/dev.db*
```

Create `.env` with the SQLite datasource URL:

```env
DATABASE_URL="file:./dev.db"
```

Create `src/lib/db.js` with the Prisma singleton:

```js
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
```

- [ ] **Step 4: Re-run compile checks**

Run:
```bash
npm run lint
npm run build
```

Expected:
- No lint errors.
- Build still succeeds with the new Prisma dependency and helper.

- [ ] **Step 5: Commit the Prisma bootstrap**

Run:
```bash
git add package.json package-lock.json .gitignore src/lib/db.js
git commit -m "feat: bootstrap prisma database"
```

---

### Task 2: Define the schema and seed the demo catalog

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.mjs`

- [ ] **Step 1: Write the schema first**

Create `prisma/schema.prisma` with the e-commerce models:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(cuid())
  name         String?
  email        String   @unique
  passwordHash String?
  role         String   @default("CUSTOMER")
  orders       Order[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model Category {
  id        String    @id @default(cuid())
  name      String
  slug      String    @unique
  products  Product[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Product {
  id           String    @id @default(cuid())
  name         String
  slug         String    @unique
  description  String
  price        Int
  originalPrice Int?
  image        String?
  badge        String?
  note         String?
  stock        Int       @default(0)
  featured     Boolean   @default(false)
  isActive     Boolean   @default(true)
  categoryId   String
  category     Category  @relation(fields: [categoryId], references: [id])
  orderItems   OrderItem[]
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  @@index([categoryId])
  @@index([featured])
}

model Order {
  id              String      @id @default(cuid())
  userId          String?
  user            User?       @relation(fields: [userId], references: [id])
  customerName    String
  customerEmail   String
  customerPhone   String
  shippingAddress String
  status          String      @default("PENDING")
  total           Int
  items           OrderItem[]
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@index([userId])
  @@index([status])
}

model OrderItem {
  id        String  @id @default(cuid())
  orderId   String
  order     Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId String
  product   Product @relation(fields: [productId], references: [id])
  quantity  Int
  price     Int

  @@index([orderId])
  @@index([productId])
}
```

- [ ] **Step 2: Seed categories and products**

Create `prisma/seed.mjs` with this seed flow:

```js
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const categories = [
  { slug: "running", name: "Running" },
  { slug: "lifestyle", name: "Lifestyle" },
  { slug: "outdoor", name: "Outdoor" },
];

const products = [
  {
    slug: "air-runner-basic",
    name: "Air Runner Basic",
    categorySlug: "running",
    description: "Mẫu sneaker gọn nhẹ, phù hợp cho buổi học đầu tiên.",
    price: 1290000,
    originalPrice: 1490000,
    image: null,
    badge: "Bestseller",
    note: "Dễ phối đồ",
    stock: 12,
    featured: true,
    isActive: true,
  },
  {
    slug: "street-flex-pro",
    name: "Street Flex Pro",
    categorySlug: "lifestyle",
    description: "Thiết kế nổi bật hơn, hợp với phong cách streetwear.",
    price: 1890000,
    originalPrice: null,
    image: null,
    badge: "New",
    note: "Phối outfit nhanh",
    stock: 9,
    featured: true,
    isActive: true,
  },
  {
    slug: "court-classic-white",
    name: "Court Classic White",
    categorySlug: "lifestyle",
    description: "Một đôi basic sạch, đơn giản, dễ dùng hằng ngày.",
    price: 990000,
    originalPrice: 1190000,
    image: null,
    badge: "Sale",
    note: "Giá dễ tiếp cận",
    stock: 16,
    featured: true,
    isActive: true,
  },
  {
    slug: "trail-guard-mid",
    name: "Trail Guard Mid",
    categorySlug: "outdoor",
    description: "Bản mid-top chắc chân cho những buổi đi bộ cuối tuần.",
    price: 1590000,
    originalPrice: null,
    image: null,
    badge: "Sold out",
    note: "Hết hàng tạm thời",
    stock: 0,
    featured: false,
    isActive: true,
  },
  {
    slug: "sprint-core-grey",
    name: "Sprint Core Grey",
    categorySlug: "running",
    description: "Dòng chạy bộ cơ bản cho học viên cần một ví dụ mới.",
    price: 1190000,
    originalPrice: null,
    image: null,
    badge: "Core",
    note: "Nhẹ, dễ dùng",
    stock: 11,
    featured: false,
    isActive: true,
  },
  {
    slug: "urban-flow-black",
    name: "Urban Flow Black",
    categorySlug: "lifestyle",
    description: "Tông đen tối giản cho layout sản phẩm thêm đa dạng.",
    price: 1390000,
    originalPrice: 1690000,
    image: null,
    badge: "Sale",
    note: "Phối nhanh với mọi outfit",
    stock: 8,
    featured: false,
    isActive: true,
  },
  {
    slug: "trail-peak-olive",
    name: "Trail Peak Olive",
    categorySlug: "outdoor",
    description: "Mẫu outdoor để demo category khác với lifestyle/running.",
    price: 1790000,
    originalPrice: null,
    image: null,
    badge: "Trail",
    note: "Đế bám tốt",
    stock: 6,
    featured: false,
    isActive: true,
  },
  {
    slug: "retro-court-navy",
    name: "Retro Court Navy",
    categorySlug: "lifestyle",
    description: "Phong cách retro, hợp để minh họa product detail.",
    price: 1490000,
    originalPrice: 1790000,
    image: null,
    badge: "Retro",
    note: "Phối đồ cổ điển",
    stock: 7,
    featured: false,
    isActive: true,
  },
  {
    slug: "flex-knit-sand",
    name: "Flex Knit Sand",
    categorySlug: "running",
    description: "Upper knit mềm, nhẹ, hợp demo material khác nhau.",
    price: 1590000,
    originalPrice: null,
    image: null,
    badge: "Knit",
    note: "Thoáng khí",
    stock: 10,
    featured: false,
    isActive: true,
  },
  {
    slug: "metro-lace-white",
    name: "Metro Lace White",
    categorySlug: "lifestyle",
    description: "Một sản phẩm trắng cơ bản để lấp đầy catalog seed.",
    price: 1090000,
    originalPrice: null,
    image: null,
    badge: "Basic",
    note: "Dễ phối, dễ dạy",
    stock: 14,
    featured: false,
    isActive: true,
  },
];

async function main() {
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.product.deleteMany();
  await db.category.deleteMany();
  await db.user.deleteMany();

  await db.category.createMany({ data: categories });

  const categoryRows = await db.category.findMany();
  const categoryMap = new Map(categoryRows.map((category) => [category.slug, category.id]));

  await db.product.createMany({
    data: products.map(({ categorySlug, ...product }) => ({
      ...product,
      categoryId: categoryMap.get(categorySlug),
    })),
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
```

- [ ] **Step 3: Run the migration and seed**

Run:
```bash
npx prisma migrate dev --name init
npm run db:seed
npx prisma studio
```

Expected:
- Prisma creates `prisma/dev.db`.
- The studio shows 3 categories and 10 products.
- `Product` rows are linked to `Category` rows through `categoryId`.

- [ ] **Step 4: Re-run compile checks**

Run:
```bash
npm run lint
npm run build
```

Expected:
- Schema and seed files do not break the app build.

- [ ] **Step 5: Commit the schema and seed**

Run:
```bash
git add prisma/schema.prisma prisma/seed.mjs prisma/migrations
git commit -m "feat: add prisma schema and seed data"
```

---

### Task 3: Replace the mock catalog with Prisma-backed read helpers

**Files:**
- Create: `tests/lib/products.test.js`
- Modify: `src/lib/products.js`

- [ ] **Step 1: Write the failing helper test**

Create `tests/lib/products.test.js` with this suite:

```js
import { describe, expect, it } from "vitest";
import { toProductViewModel } from "../../src/lib/products.js";

describe("toProductViewModel", () => {
  it("flattens the category relation and derives inStock from stock", () => {
    expect(
      toProductViewModel({
        slug: "air-runner-basic",
        name: "Air Runner Basic",
        description: "Mẫu sneaker gọn nhẹ, phù hợp cho buổi học đầu tiên.",
        price: 1290000,
        originalPrice: 1490000,
        image: null,
        badge: "Bestseller",
        note: "Dễ phối đồ",
        stock: 12,
        featured: true,
        isActive: true,
        category: { name: "Running" },
      }),
    ).toEqual({
      slug: "air-runner-basic",
      name: "Air Runner Basic",
      category: "Running",
      badge: "Bestseller",
      description: "Mẫu sneaker gọn nhẹ, phù hợp cho buổi học đầu tiên.",
      price: 1290000,
      originalPrice: 1490000,
      image: null,
      note: "Dễ phối đồ",
      inStock: true,
      featured: true,
      isActive: true,
    });
  });
});
```

- [ ] **Step 2: Run the helper test and confirm it fails before the adapter exists**

Run:
```bash
npm run test -- tests/lib/products.test.js
```

Expected:
- Vitest fails because `toProductViewModel` is not exported yet.

- [ ] **Step 3: Rewrite `src/lib/products.js` as the Prisma adapter**

Replace the mock-array module with this DB-backed version:

```js
import { db } from "@/lib/db";

export function toProductViewModel(product) {
  return {
    slug: product.slug,
    name: product.name,
    category: product.category?.name ?? "",
    badge: product.badge ?? (product.originalPrice ? "Sale" : "New"),
    description: product.description,
    price: product.price,
    originalPrice: product.originalPrice ?? null,
    image: product.image ?? null,
    note: product.note ?? "",
    inStock: product.stock > 0,
    featured: product.featured,
    isActive: product.isActive,
  };
}

async function findProducts(where = {}, take) {
  const products = await db.product.findMany({
    where: { isActive: true, ...where },
    include: { category: true },
    ...(take ? { take } : {}),
    orderBy: { createdAt: "desc" },
  });

  return products.map(toProductViewModel);
}

export async function getProducts() {
  return findProducts();
}

export async function getFeaturedProducts(limit = 3) {
  return findProducts({ featured: true }, limit);
}

export async function getProductBySlug(slug) {
  if (!slug) {
    return null;
  }

  const product = await db.product.findUnique({
    where: { slug },
    include: { category: true },
  });

  if (!product || !product.isActive) {
    return null;
  }

  return toProductViewModel(product);
}

export async function getProductSlugs() {
  const products = await db.product.findMany({
    where: { isActive: true },
    select: { slug: true },
    orderBy: { createdAt: "desc" },
  });

  return products.map(({ slug }) => ({ slug }));
}

export async function getRelatedProducts(slug, limit = 3) {
  const currentProduct = await db.product.findUnique({
    where: { slug },
    select: { categoryId: true },
  });

  if (!currentProduct) {
    return [];
  }

  return findProducts(
    {
      slug: { not: slug },
      categoryId: currentProduct.categoryId,
    },
    limit,
  );
}
```

- [ ] **Step 4: Re-run the helper test**

Run:
```bash
npm run test -- tests/lib/products.test.js
```

Expected:
- The mapper test passes.

- [ ] **Step 5: Commit the adapter rewrite**

Run:
```bash
git add src/lib/products.js tests/lib/products.test.js
git commit -m "feat: move catalog reads to prisma"
```

---

### Task 4: Switch the storefront pages to async DB reads

**Files:**
- Modify: `src/app/page.js`
- Modify: `src/app/products/page.js`
- Modify: `src/app/products/[slug]/page.js`

- [ ] **Step 1: Update the homepage to await featured products**

Use this homepage shape:

```js
import { HeroSection } from "@/components/hero-section";
import { FeaturedProducts } from "@/components/featured-products";
import { getFeaturedProducts } from "@/lib/products";

export default async function HomePage() {
  const featuredProducts = await getFeaturedProducts();

  return (
    <main>
      <HeroSection />
      <FeaturedProducts products={featuredProducts} />
      <section className="story" id="story">
        <div className="site-shell">
          <h2>Vì sao MiniShop?</h2>
          <p>
            Mục tiêu của project là học App Router bằng một flow bán hàng thật:
            landing → listing → detail → cart → checkout.
          </p>
        </div>
      </section>

      <section className="contact" id="contact">
        <div className="site-shell">
          <h2>Liên hệ</h2>
          <p>Email demo cho buổi học đầu tiên.</p>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Update `/products` to fetch the full catalog**

Use this route shape:

```js
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { getProducts } from "@/lib/products";

export const metadata = {
  title: "MiniShop | Tất cả sản phẩm",
  description: "Danh sách sản phẩm từ database của MiniShop.",
};

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <main className="products-page">
      <section className="products-page__hero">
        <div className="site-shell">
          <p className="products-page__eyebrow">Product listing</p>
          <h1>Tất cả sản phẩm</h1>
          <p className="products-page__description">
            Trang này đọc trực tiếp từ database để học cách tách data layer khỏi
            UI layer.
          </p>

          <Link href="/" className="button button--secondary">
            Quay lại trang chủ
          </Link>
        </div>
      </section>

      <section className="products-page__list">
        <div className="site-shell">
          <div className="products-page__grid">
            {products.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Update the product detail route to use async Prisma helpers**

Use this route shape:

```js
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/add-to-cart-button";
import {
  getProductBySlug,
  getProductSlugs,
  getRelatedProducts,
} from "@/lib/products";
import { formatVnd } from "@/lib/format-vnd";

export async function generateStaticParams() {
  return getProductSlugs();
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: "MiniShop | Không tìm thấy sản phẩm",
      description: "Sản phẩm không tồn tại trong catalog demo của MiniShop.",
    };
  }

  return {
    title: `MiniShop | ${product.name}`,
    description: product.description,
  };
}

export default async function ProductDetailPage({ params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const relatedProducts = await getRelatedProducts(product.slug);
  const isSale = Boolean(product.originalPrice);

  return (
    <main className="product-detail">
      <section className="product-detail__hero">
        <div className="site-shell product-detail__grid">
          <div className="product-detail__visual" aria-hidden="true">
            <span className="product-detail__badge">{product.badge}</span>
            <p className="product-detail__visual-label">{product.category}</p>
          </div>

          <div className="product-detail__summary">
            <p className="product-detail__eyebrow">Product detail</p>
            <h1>{product.name}</h1>
            <p className="product-detail__description">{product.description}</p>

            <div className="product-detail__price-row">
              <strong>{formatVnd(product.price)}</strong>
              {isSale ? (
                <span className="product-detail__compare">
                  {formatVnd(product.originalPrice)}
                </span>
              ) : null}
            </div>

            <p
              className={`product-detail__stock ${
                product.inStock ? "" : "product-detail__stock--soldout"
              }`}
            >
              {product.inStock ? "Còn hàng" : "Hết hàng"}
            </p>

            <p className="product-detail__note">{product.note}</p>

            <div className="product-detail__actions">
              <AddToCartButton product={product} />
              <Link href="/cart" className="button button--secondary">
                Mở giỏ hàng
              </Link>
              <Link href="/products" className="button button--secondary">
                Quay lại danh sách
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="product-detail__related">
        <div className="site-shell">
          <div className="section-heading">
            <p className="section-heading__eyebrow">Sản phẩm liên quan</p>
            <h2>Gợi ý thêm để học cách nối từ detail sang list</h2>
          </div>

          <div className="related-products__grid">
            {relatedProducts.map((relatedProduct) => (
              <article
                key={relatedProduct.slug}
                className="related-products__item"
              >
                <h3>{relatedProduct.name}</h3>
                <p>{relatedProduct.category}</p>
                <Link href={`/products/${relatedProduct.slug}`}>
                  Xem chi tiết
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Re-run compile checks**

Run:
```bash
npm run lint
npm run build
```

Expected:
- Home, listing, and detail routes all compile against the Prisma-backed helpers.
- `generateStaticParams()` still produces product slugs at build time.

- [ ] **Step 5: Smoke test the DB-backed pages**

Run:
```bash
npm run dev
```

Open:
- `/`
- `/products`
- `/products/air-runner-basic`

Expected:
- The homepage renders featured products from the database.
- `/products` shows the seeded catalog.
- The detail route still works and `notFound()` still triggers for unknown slugs.

- [ ] **Step 6: Commit the route switch**

Run:
```bash
git add src/app/page.js src/app/products/page.js src/app/products/[slug]/page.js
git commit -m "feat: read storefront pages from prisma"
```
