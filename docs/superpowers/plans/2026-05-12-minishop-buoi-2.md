# MiniShop Buổi 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the static product listing milestone in JavaScript: shared catalog data, reusable money formatting, sale/stock badges, and a dedicated `/products` page that reuses the same product source as the landing page.

**Architecture:** Keep the Buổi 1 homepage and reuse its section components. Move product content into a single mock catalog module in `src/lib/products.js` and a pure formatter in `src/lib/format-vnd.js`. `src/components/product-card.js` becomes the shared card UI for both the featured section and the full listing, while `src/app/products/page.js` only handles route composition and page copy. No DB, no cart state, no dynamic route yet.

**Tech Stack:** Next.js App Router, React 19, JavaScript, global CSS, `next/link`, `Intl.NumberFormat`.

---

## Current Codebase Notes

- `src/app/page.js` still owns an inline featured-products array from Buổi 1.
- `src/components/product-card.js` exists but only renders category, name, description, and note.
- `src/components/featured-products.js` already maps a product list.
- No `/products` route exists yet.
- No shared product data module or formatter helper exists yet.
- `src/app/globals.css` already has landing-page styles and will need listing additions.

## File Map

- Create: `src/lib/format-vnd.js`
- Create: `src/lib/products.js`
- Create: `src/app/products/page.js`
- Modify: `src/app/page.js`
- Modify: `src/components/product-card.js`
- Modify: `src/components/featured-products.js`
- Modify: `src/components/site-header.js`
- Modify: `src/app/globals.css`

## Verification Strategy

- Use `npm run lint` to catch JSX/import/style issues.
- Use `npm run build` to catch App Router, metadata, and import problems.
- Smoke test in browser at `/` and `/products` to confirm the listing is visually complete and responsive.

---

### Task 1: Extract the shared product catalog and price helper

**Files:**
- Create: `src/lib/format-vnd.js`
- Create: `src/lib/products.js`
- Modify: `src/app/page.js`

- [ ] **Step 1: Capture the baseline**

Run:
```bash
npm run lint
npm run build
```

Expected:
- Both commands pass on the current landing page before changes.

- [ ] **Step 2: Add a pure VND formatter and a shared mock catalog**

Use this helper:

```js
export function formatVnd(value) {
  return `${new Intl.NumberFormat("vi-VN").format(value)}đ`;
}
```

Use this catalog shape:

```js
export const products = [
  {
    slug: "air-runner-basic",
    name: "Air Runner Basic",
    category: "Running",
    description: "Mẫu sneaker gọn nhẹ, phù hợp cho buổi học đầu tiên.",
    price: 1290000,
    originalPrice: 1590000,
    badge: "Bestseller",
    inStock: true,
    featured: true,
  },
  {
    slug: "street-flex-pro",
    name: "Street Flex Pro",
    category: "Lifestyle",
    description: "Thiết kế nổi bật hơn, hợp với phong cách streetwear.",
    price: 1890000,
    badge: "New",
    inStock: true,
    featured: true,
  },
  {
    slug: "court-classic-white",
    name: "Court Classic White",
    category: "Classic",
    description: "Một đôi basic sạch, đơn giản, dễ dùng hằng ngày.",
    price: 990000,
    originalPrice: 1290000,
    badge: "Classic",
    inStock: true,
    featured: true,
  },
  {
    slug: "trail-boost-black",
    name: "Trail Boost Black",
    category: "Outdoor",
    description: "Một mẫu demo cho trạng thái hết hàng trong list.",
    price: 1690000,
    badge: "Sold out",
    inStock: false,
    featured: false,
  },
];

export const featuredProducts = products.filter((product) => product.featured);
```

- [ ] **Step 3: Replace inline featured data on the homepage**

Use this homepage data flow:

```js
import { SiteHeader } from "@/components/site-header";
import { HeroSection } from "@/components/hero-section";
import { FeaturedProducts } from "@/components/featured-products";
import { featuredProducts } from "@/lib/products";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <HeroSection />
        <FeaturedProducts products={featuredProducts} />
      </main>
    </>
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
- No lint errors.
- Build succeeds with the new shared catalog imports.

- [ ] **Step 5: Commit the shared-data extraction**

Run:
```bash
git add src/app/page.js src/lib/format-vnd.js src/lib/products.js
git commit -m "feat: extract shared product catalog"
```

---

### Task 2: Upgrade `ProductCard` for sale and stock states

**Files:**
- Modify: `src/components/product-card.js`
- Modify: `src/components/featured-products.js`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Rewrite the card to show price, sale, and stock state**

Use this card contract:

```js
import { formatVnd } from "@/lib/format-vnd";

export function ProductCard({ product }) {
  const isSale = Boolean(product.originalPrice);
  const isOutOfStock = !product.inStock;
  const badgeLabel = isSale ? "Sale" : product.badge;

  return (
    <article
      className={`product-card ${isOutOfStock ? "product-card--soldout" : ""}`}
      aria-label={`${badgeLabel} - ${product.name}`}
    >
      <div className="product-card__image" aria-hidden="true">
        <span>{badgeLabel}</span>
      </div>

      <div className="product-card__body">
        <p className="product-card__category">{product.category}</p>
        <h2 className="product-card__name">{product.name}</h2>
        <p className="product-card__description">{product.description}</p>

        <div className="product-card__price-row">
          <strong>{formatVnd(product.price)}</strong>
          {isSale ? (
            <span className="product-card__compare">
              {formatVnd(product.originalPrice)}
            </span>
          ) : null}
        </div>

        <p
          className={`product-card__stock ${
            isOutOfStock ? "product-card__stock--soldout" : ""
          }`}
        >
          {isOutOfStock ? "Hết hàng" : "Còn hàng"}
        </p>
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Keep the featured section thin and reusable**

Use this section shell:

```js
import Link from "next/link";
import { ProductCard } from "@/components/product-card";

export function FeaturedProducts({ products = [] }) {
  return (
    <section className="featured" id="featured">
      <div className="site-shell">
        <div className="section-heading section-heading--split">
          <div>
            <p className="section-heading__eyebrow">Sản phẩm nổi bật</p>
            <h2>3 mẫu cơ bản để học cách render list bằng component</h2>
          </div>

          <Link href="/products" className="section-heading__link">
            Xem tất cả
          </Link>
        </div>

        <div className="featured__grid">
          {products.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Add listing + card styles for sale and stock states**

Use this CSS baseline:

```css
.section-heading--split {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
}

.section-heading__link {
  align-self: center;
  color: var(--accent-strong);
  font-weight: 600;
}

.product-card__price-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-top: 14px;
}

.product-card__compare {
  color: var(--muted);
  text-decoration: line-through;
}

.product-card__stock {
  margin: 12px 0 0;
  font-size: 0.92rem;
  color: var(--accent-strong);
}

.product-card--soldout {
  opacity: 0.9;
}

.product-card__stock--soldout {
  color: #7f1d1d;
}
```

- [ ] **Step 4: Re-run compile checks**

Run:
```bash
npm run lint
npm run build
```

Expected:
- Product cards render sale and stock state correctly.
- Featured products still reuse the same card component.

- [ ] **Step 5: Commit the card and section update**

Run:
```bash
git add src/components/product-card.js src/components/featured-products.js src/app/globals.css
git commit -m "feat: upgrade product card for listing states"
```

---

### Task 3: Create the `/products` route and surface it in navigation

**Files:**
- Create: `src/app/products/page.js`
- Modify: `src/components/site-header.js`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Write the listing page contract**

Use this page structure:

```js
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { products } from "@/lib/products";

export const metadata = {
  title: "MiniShop | Tất cả sản phẩm",
  description: "Danh sách sản phẩm tĩnh của MiniShop.",
};

export default function ProductsPage() {
  return (
    <main className="products-page">
      <section className="products-page__hero">
        <div className="site-shell">
          <p className="products-page__eyebrow">Product listing</p>
          <h1>Tất cả sản phẩm</h1>
          <p className="products-page__description">
            Trang này dùng cùng data với homepage để học cách render list bằng
            `map()` và component tái sử dụng.
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

- [ ] **Step 2: Add a visible route link in the header**

Use this navigation shape:

```js
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-shell site-header__inner">
        <Link href="/" className="site-brand">
          MiniShop
        </Link>

        <nav className="site-nav" aria-label="Primary">
          <a href="#featured">Sản phẩm nổi bật</a>
          <Link href="/products">Tất cả sản phẩm</Link>
          <a href="#story">Câu chuyện</a>
          <a href="#contact">Liên hệ</a>
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Add responsive layout rules for the listing page**

Use this CSS baseline:

```css
.products-page__hero {
  padding: 64px 0 28px;
}

.products-page__eyebrow {
  margin: 0 0 12px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.78rem;
  color: var(--accent);
}

.products-page__hero h1 {
  margin: 0;
  font-family: var(--font-space-grotesk), Arial, sans-serif;
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  line-height: 0.96;
  letter-spacing: -0.05em;
}

.products-page__description {
  max-width: 60ch;
  margin: 16px 0 0;
  color: var(--muted);
  line-height: 1.7;
}

.products-page__list {
  padding: 24px 0 72px;
}

.products-page__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

@media (max-width: 960px) {
  .featured__grid,
  .products-page__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .featured__grid,
  .products-page__grid,
  .section-heading--split {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: Re-run compile checks and smoke test both routes**

Run:
```bash
npm run lint
npm run build
npm run dev
```

Expected:
- `/` still shows the landing page and featured products.
- `/products` shows the full card grid.
- Header nav includes a working link to `/products`.

- [ ] **Step 5: Commit the route work**

Run:
```bash
git add src/app/products/page.js src/components/site-header.js src/app/globals.css
git commit -m "feat: add static products listing page"
```

---

### Task 4: Final pass and cleanup

**Files:**
- Modify: `src/app/page.js`
- Modify: `src/app/products/page.js`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Check for duplicated catalog logic**

Confirm the only product data source is `src/lib/products.js`, and both pages import from it instead of keeping local arrays.

- [ ] **Step 2: Verify the responsive card grid**

Check desktop, tablet, and mobile widths in the browser:
- desktop: 3 columns
- tablet: 2 columns
- mobile: 1 column

- [ ] **Step 3: Run the final verification commands**

Run:
```bash
npm run lint
npm run build
```

Expected:
- No lint errors.
- Build succeeds with the new listing route.

- [ ] **Step 4: Commit the final polish**

Run:
```bash
git add src/app/page.js src/app/products/page.js src/app/globals.css
git commit -m "chore: polish buoi 2 listing flow"
```

