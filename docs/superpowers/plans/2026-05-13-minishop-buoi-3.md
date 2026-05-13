# MiniShop Buổi 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the product detail milestone in JavaScript: dynamic `/products/[slug]` routing, static params from the shared catalog, route-level `notFound()` handling, and click-through navigation from product cards.

**Architecture:** Keep `src/lib/products.js` as the single source of truth for mock product data, then layer route helpers on top of it so the detail page can resolve one product by slug and prebuild all known paths. `src/app/products/[slug]/page.js` owns the detail view and metadata, `src/app/products/[slug]/not-found.js` owns the local 404 state, and `src/components/product-card.js` becomes the shared entry point from both the homepage and listing page. No DB yet, no cart yet, no API routes yet.

**Tech Stack:** Next.js App Router, React 19, JavaScript, `next/link`, `next/navigation`, `generateMetadata`, `generateStaticParams`, global CSS, `Intl.NumberFormat`.

---

## Current Codebase Notes

- `src/lib/products.js` already centralizes the mock catalog and `featuredProducts`.
- `src/app/products/page.js` already renders the full static listing.
- `src/components/product-card.js` already shows price, sale, and stock state, but it is not yet a click target to a product detail page.
- `src/app/products/[slug]/page.js` does not exist yet.
- `src/app/products/[slug]/not-found.js` does not exist yet.
- `src/app/globals.css` already has listing styles and needs a detail-page section added.

## File Map

- Modify: `src/lib/products.js`
- Modify: `src/components/product-card.js`
- Create: `src/app/products/[slug]/page.js`
- Create: `src/app/products/[slug]/not-found.js`
- Modify: `src/app/globals.css`

## Verification Strategy

- Use `npm run lint` to catch JSX/import/style issues.
- Use `npm run build` to catch App Router, metadata, and static-param problems.
- Smoke test in browser at `/products`, `/products/air-runner-basic`, and an invalid slug like `/products/does-not-exist` to confirm the happy path and local 404.

---

### Task 1: Add catalog lookup helpers for dynamic routes

**Files:**
- Modify: `src/lib/products.js`

- [ ] **Step 1: Capture the baseline**

Run:
```bash
npm run lint
npm run build
```

Expected:
- Both commands pass before any buoi 3 changes.

- [ ] **Step 2: Add route helpers on top of the existing catalog**

Use this module shape:

```js
export const products = [
  {
    slug: "air-runner-basic",
    name: "Air Runner Basic",
    category: "Running",
    badge: "Bestseller",
    description: "Mẫu sneaker gọn nhẹ, phù hợp cho buổi học đầu tiên.",
    price: 1290000,
    originalPrice: 1490000,
    inStock: true,
    featured: true,
    note: "Dễ phối đồ",
  },
  {
    slug: "street-flex-pro",
    name: "Street Flex Pro",
    category: "Lifestyle",
    badge: "New",
    description: "Thiết kế nổi bật hơn, hợp với phong cách streetwear.",
    price: 1890000,
    originalPrice: null,
    inStock: true,
    featured: true,
    note: "Phối outfit nhanh",
  },
  {
    slug: "court-classic-white",
    name: "Court Classic White",
    category: "Classic",
    badge: "Sale",
    description: "Một đôi basic sạch, đơn giản, dễ dùng hằng ngày.",
    price: 990000,
    originalPrice: 1190000,
    inStock: true,
    featured: true,
    note: "Giá dễ tiếp cận",
  },
  {
    slug: "trail-guard-mid",
    name: "Trail Guard Mid",
    category: "Outdoor",
    badge: "Sold out",
    description: "Bản mid-top chắc chân cho những buổi đi bộ cuối tuần.",
    price: 1590000,
    originalPrice: null,
    inStock: false,
    featured: false,
    note: "Hết hàng tạm thời",
  },
];

export const featuredProducts = products.filter((product) => product.featured);

export function getProductBySlug(slug) {
  return products.find((product) => product.slug === slug) ?? null;
}

export function getProductSlugs() {
  return products.map((product) => ({ slug: product.slug }));
}

export function getRelatedProducts(slug, limit = 3) {
  return products.filter((product) => product.slug !== slug).slice(0, limit);
}
```

- [ ] **Step 3: Re-run compile checks**

Run:
```bash
npm run lint
npm run build
```

Expected:
- No lint errors.
- Build still succeeds with the new helper exports.

- [ ] **Step 4: Commit the lookup helper work**

Run:
```bash
git add src/lib/products.js
git commit -m "feat: add product lookup helpers"
```

---

### Task 2: Build the dynamic product detail route

**Files:**
- Create: `src/app/products/[slug]/page.js`
- Create: `src/app/products/[slug]/not-found.js`

- [ ] **Step 1: Write the detail page contract**

Use this route structure:

```js
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getProductBySlug,
  getProductSlugs,
  getRelatedProducts,
} from "@/lib/products";
import { formatVnd } from "@/lib/format-vnd";

export function generateStaticParams() {
  return getProductSlugs();
}

export async function generateMetadata({ params }) {
  const product = getProductBySlug(params.slug);

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

export default function ProductDetailPage({ params }) {
  const product = getProductBySlug(params.slug);

  if (!product) {
    notFound();
  }

  const relatedProducts = getRelatedProducts(product.slug);
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
              <article key={relatedProduct.slug} className="related-products__item">
                <h3>{relatedProduct.name}</h3>
                <p>{relatedProduct.category}</p>
                <Link href={`/products/${relatedProduct.slug}`}>Xem chi tiết</Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Add a route-level empty state**

Use this not-found screen:

```js
import Link from "next/link";

export default function ProductNotFound() {
  return (
    <main className="product-not-found">
      <div className="site-shell product-not-found__inner">
        <p className="product-not-found__eyebrow">404</p>
        <h1>Không tìm thấy sản phẩm</h1>
        <p>
          Slug này không khớp với catalog demo. Hãy quay lại danh sách để chọn
          một sản phẩm hợp lệ.
        </p>

        <Link href="/products" className="button button--primary">
          Về trang danh sách
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Re-run compile checks**

Run:
```bash
npm run lint
npm run build
```

Expected:
- `generateStaticParams` is accepted by the build.
- Valid slugs render.
- Invalid slugs route into the local 404.

- [ ] **Step 4: Commit the route implementation**

Run:
```bash
git add src/app/products/[slug]/page.js src/app/products/[slug]/not-found.js
git commit -m "feat: add product detail route"
```

---

### Task 3: Make cards open the detail page and add detail-page styles

**Files:**
- Modify: `src/components/product-card.js`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Turn the product card into a detail-page entry point**

Use this card contract:

```js
import Link from "next/link";
import { formatVnd } from "@/lib/format-vnd";

export function ProductCard({ product }) {
  const isSale = Boolean(product.originalPrice);
  const isOutOfStock = !product.inStock;
  const badgeLabel = isSale ? "Sale" : product.badge;

  return (
    <article
      className={`product-card ${isOutOfStock ? "product-card--soldout" : ""}`}
    >
      <Link
        href={`/products/${product.slug}`}
        className="product-card__link"
        aria-label={`Xem chi tiết ${product.name}`}
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
      </Link>
    </article>
  );
}
```

- [ ] **Step 2: Add detail-page and card-link styles**

Use this CSS baseline:

```css
.product-card__link {
  display: grid;
  height: 100%;
  color: inherit;
  text-decoration: none;
}

.product-card__link:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: -3px;
}

.product-detail {
  padding: 40px 0 72px;
}

.product-detail__hero {
  padding: 20px 0 40px;
}

.product-detail__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  gap: 24px;
  align-items: stretch;
}

.product-detail__visual {
  min-height: 420px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 24px;
  border: 1px solid var(--border);
  border-radius: 28px;
  background: linear-gradient(135deg, rgba(194, 65, 12, 0.18), rgba(255, 255, 255, 0.88));
  box-shadow: var(--shadow);
}

.product-detail__badge {
  display: inline-flex;
  width: fit-content;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  font-weight: 700;
}

.product-detail__visual-label {
  margin: 0;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.8rem;
}

.product-detail__summary {
  padding: 24px;
  border: 1px solid var(--border);
  border-radius: 28px;
  background: var(--surface-strong);
  box-shadow: var(--shadow);
}

.product-detail__eyebrow {
  margin: 0 0 12px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.78rem;
  color: var(--accent);
}

.product-detail__summary h1 {
  margin: 0;
  font-family: var(--font-space-grotesk), Arial, sans-serif;
  font-size: clamp(2.2rem, 4vw, 4rem);
  line-height: 0.96;
  letter-spacing: -0.05em;
}

.product-detail__description {
  margin: 16px 0 0;
  color: var(--muted);
  line-height: 1.7;
}

.product-detail__price-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-top: 18px;
}

.product-detail__compare {
  color: var(--muted);
  text-decoration: line-through;
}

.product-detail__stock {
  margin: 12px 0 0;
  color: var(--accent-strong);
  font-weight: 600;
}

.product-detail__stock--soldout {
  color: #7f1d1d;
}

.product-detail__note {
  margin: 12px 0 0;
  color: var(--muted);
}

.product-detail__actions {
  margin-top: 24px;
}

.product-detail__related {
  padding-top: 12px;
}

.related-products__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

.related-products__item {
  padding: 18px;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.7);
}

.product-not-found {
  padding: 96px 0 72px;
}

.product-not-found__inner {
  max-width: 560px;
}

@media (max-width: 960px) {
  .product-detail__grid,
  .related-products__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .product-detail__visual {
    min-height: 300px;
  }
}
```

- [ ] **Step 3: Smoke test the click-through flow**

Run:
```bash
npm run lint
npm run build
npm run dev
```

Expected:
- `/products` still renders the full grid.
- Clicking a card opens `/products/[slug]`.
- The detail page shows price, sale state, stock state, and related products.
- An invalid slug shows the local not-found screen.

- [ ] **Step 4: Commit the UI flow polish**

Run:
```bash
git add src/components/product-card.js src/app/globals.css
git commit -m "feat: link products to detail page"
```

---

### Task 4: Final verification and teaching pass

**Files:**
- Modify: `src/app/products/[slug]/page.js`
- Modify: `src/app/products/[slug]/not-found.js`
- Modify: `src/components/product-card.js`
- Modify: `src/lib/products.js`

- [ ] **Step 1: Check for duplicated route logic**

Confirm the detail page reads from `src/lib/products.js` only, and does not duplicate catalog data or helper logic locally.

- [ ] **Step 2: Verify the route behavior in the browser**

Check these URLs:
- `/products/air-runner-basic`
- `/products/street-flex-pro`
- `/products/does-not-exist`

Expected:
- Valid slugs show product detail.
- Invalid slug shows the local 404.

- [ ] **Step 3: Run the final verification commands**

Run:
```bash
npm run lint
npm run build
```

Expected:
- No lint errors.
- Build succeeds with the new dynamic route and metadata.

- [ ] **Step 4: Commit the final polish**

Run:
```bash
git add src/app/products/[slug]/page.js src/app/products/[slug]/not-found.js src/components/product-card.js src/lib/products.js src/app/globals.css
git commit -m "chore: finish buoi 3 detail flow"
```

---

## Teaching Notes

### Lesson outline

1. Warm-up: hỏi "một sản phẩm nên có một URL riêng để làm gì?"
2. Concept 1: dynamic route `[slug]` là gì và dùng khi nào.
3. Concept 2: `params` lấy slug từ URL như thế nào.
4. Concept 3: `notFound()` xử lý slug sai hoặc data thiếu ra sao.
5. Demo: thêm helper lookup, dựng detail page, prebuild paths.
6. Checkpoint: test một slug đúng và một slug sai.
7. Practice: thêm related products và link từ card sang detail.
8. Review: nhắc lại vì sao catalog tĩnh vẫn làm được route động.

### Speaker notes

- Mở bằng ý: mỗi product cần một địa chỉ riêng để share, bookmark, và SEO.
- Giải thích `slug` là key đọc được của URL, không phải state UI.
- Khi nói `params`, nhấn mạnh đây là input từ Next, không phải dữ liệu tự sinh trong component.
- `notFound()` nên được dạy như nhánh kết thúc hợp lệ, không phải lỗi crash.
- Chốt: dynamic route không yêu cầu DB; mock catalog vẫn đủ để học routing.

### Quick check

- `params.slug` đến từ đâu?
- Khi nào nên gọi `notFound()`?
- Vì sao `generateStaticParams()` hợp với catalog mock?

### Misconception traps

- `params` không phải query string.
- `notFound()` không phải console error.
- Dynamic route không đồng nghĩa với data từ server thật.
- Related products không nên hard-code copy-paste card HTML.
