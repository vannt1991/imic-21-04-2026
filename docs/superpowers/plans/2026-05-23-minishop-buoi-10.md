# MiniShop Buổi 10 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish MiniShop with URL-based search/filter/pagination on `/products`, baseline SEO metadata plus sitemap/robots, product-list loading/error/empty states, and deploy-ready docs/checklists.

**Architecture:** Keep `/products` server-rendered and let the URL be the source of truth for catalog state. Centralize query parsing and shareable-link generation in `src/lib/product-search.js`, extend `src/lib/products.js` with one paginated catalog query, then add small presentational components for controls and pagination so route code stays thin. For SEO/deploy work, introduce one minimal `src/lib/seo.js` helper for absolute URLs, upgrade metadata in `src/app/layout.js` plus `/products`, add `sitemap.js`/`robots.js`, and document the local-SQLite versus production-PostgreSQL path in `README.md` instead of changing the datasource in this buổi.

**Tech Stack:** Next.js 16 App Router, React 19, JavaScript, Prisma ORM, SQLite for local dev, Vitest, ESLint, global CSS, Vercel-style deployment docs.

---

## Current Codebase Notes

- `src/app/products/page.js` currently renders every active product with no `searchParams`, no empty state, and no pagination, so long catalogs will only grow vertically.
- `src/lib/products.js` already owns the storefront read layer and exposes `toProductViewModel()`, so buổi 10 should extend that module instead of creating a second competing product repository.
- `src/app/layout.js` only sets a flat title/description; there is no `metadataBase`, Open Graph metadata, sitemap, or robots file yet.
- The app already has route-level metadata on several pages and a product-detail `not-found.js`, but there is no segment `loading.js`, `error.js`, or global `not-found.js`.
- `README.md` is still the `create-next-app` default and does not explain Prisma setup, testing, build verification, auth demo roles, or deployment caveats.
- `prisma/schema.prisma` is intentionally pinned to SQLite and `prisma/migrate.mjs` shells out to `sqlite3`, so production PostgreSQL should stay in documentation/homework for this buổi rather than expanding scope into a datasource migration.

## File Map

- Create: `src/lib/product-search.js`
- Create: `tests/lib/product-search.test.js`
- Create: `tests/lib/product-catalog.test.js`
- Create: `src/components/product-catalog-controls.js`
- Create: `src/components/product-pagination.js`
- Create: `src/lib/seo.js`
- Create: `tests/lib/seo.test.js`
- Create: `src/app/products/loading.js`
- Create: `src/app/products/error.js`
- Create: `src/app/not-found.js`
- Create: `src/app/sitemap.js`
- Create: `src/app/robots.js`
- Create: `.env.example`
- Modify: `src/lib/products.js`
- Modify: `src/app/products/page.js`
- Modify: `src/app/layout.js`
- Modify: `src/app/globals.css`
- Modify: `README.md`

## Verification Strategy

- Use `npm run test -- tests/lib/product-search.test.js` for pure URL/query normalization logic.
- Use `npm run test -- tests/lib/product-catalog.test.js tests/lib/products.test.js` for paginated Prisma-query behavior plus the existing storefront view-model contract.
- Use `npm run test -- tests/lib/seo.test.js` for absolute URL generation and `NEXT_PUBLIC_SITE_URL` fallback handling.
- Run `npm run lint` and `npm run build` after the route/state/SEO work so App Router signatures and metadata exports are validated.
- Run `npm run db:seed`, then `npm run dev`, and manually verify `/products`, `/products?q=trail`, `/products?category=lifestyle`, `/products?page=2`, `/products?q=missing`, `/no-such-route`, `/sitemap.xml`, and `/robots.txt`.

---

### Task 1: Add reusable product-search helpers first

**Files:**
- Create: `src/lib/product-search.js`
- Create: `tests/lib/product-search.test.js`

- [ ] **Step 1: Write the failing search-helper tests**

Create `tests/lib/product-search.test.js` with this suite:

```js
import { describe, expect, it } from "vitest";
import {
  PRODUCTS_PER_PAGE,
  buildCatalogHref,
  buildProductWhere,
  normalizeProductCatalogParams,
} from "../../src/lib/product-search.js";

describe("product search helpers", () => {
  it("normalizes q/category/page from URL-like input", () => {
    expect(
      normalizeProductCatalogParams({
        q: "  trail  ",
        category: " Outdoor ",
        page: "0",
      }),
    ).toEqual({
      q: "trail",
      category: "outdoor",
      page: 1,
    });
  });

  it("drops unsafe category slugs and caps long queries", () => {
    expect(
      normalizeProductCatalogParams({
        q: "x".repeat(80),
        category: "../admin",
        page: "abc",
      }),
    ).toEqual({
      q: "x".repeat(60),
      category: "",
      page: 1,
    });
  });

  it("rejects malformed page strings", () => {
    expect(
      normalizeProductCatalogParams({
        q: "",
        category: "",
        page: "2abc",
      }),
    ).toEqual({
      q: "",
      category: "",
      page: 1,
    });

    expect(
      normalizeProductCatalogParams({
        q: "",
        category: "",
        page: "1.9",
      }),
    ).toEqual({
      q: "",
      category: "",
      page: 1,
    });
  });

  it("builds a Prisma where clause for keyword and category filters", () => {
    expect(
      buildProductWhere({
        q: "trail",
        category: "outdoor",
        page: 2,
      }),
    ).toEqual({
      isActive: true,
      AND: [
        {
          OR: [
            { name: { contains: "trail", mode: "insensitive" } },
            { description: { contains: "trail", mode: "insensitive" } },
            {
              category: {
                name: { contains: "trail", mode: "insensitive" },
              },
            },
          ],
        },
        {
          category: {
            slug: "outdoor",
          },
        },
      ],
    });
  });

  it("builds shareable hrefs and resets page when filters change", () => {
    expect(
      buildCatalogHref(
        { q: "trail", category: "outdoor", page: 3 },
        { q: "runner" },
      ),
    ).toBe("/products?q=runner&category=outdoor");

    expect(
      buildCatalogHref({ q: "", category: "", page: 1 }, { page: 2 }),
    ).toBe(`/products?page=2`);

    expect(
      buildCatalogHref(
        { q: "trail", category: "outdoor", page: 3 },
        { q: " trail " },
      ),
    ).toBe("/products?q=trail&category=outdoor&page=3");

    expect(PRODUCTS_PER_PAGE).toBe(9);
  });
});
```

- [ ] **Step 2: Run the new helper test file to verify the module does not exist yet**

Run:
```bash
npm run test -- tests/lib/product-search.test.js
```

Expected:
- Vitest fails with a module-not-found error for `src/lib/product-search.js`.

- [ ] **Step 3: Implement the product-search helper module**

Create `src/lib/product-search.js` with this code:

```js
export const PRODUCTS_PER_PAGE = 9;

const CATEGORY_SLUG_PATTERN = /^[a-z0-9-]+$/;

function normalizeQuery(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, 60);
}

function normalizeCategory(value) {
  if (typeof value !== "string") {
    return "";
  }

  const normalized = value.trim().toLowerCase();

  return CATEGORY_SLUG_PATTERN.test(normalized) ? normalized : "";
}

function normalizePage(value) {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : 1;
  }

  if (typeof value !== "string") {
    return 1;
  }

  const normalized = value.trim();

  if (!/^[1-9]\d*$/.test(normalized)) {
    return 1;
  }

  return Number(normalized);
}

export function normalizeProductCatalogParams(searchParams = {}) {
  return {
    q: normalizeQuery(searchParams.q),
    category: normalizeCategory(searchParams.category),
    page: normalizePage(searchParams.page),
  };
}

export function buildProductWhere(filters) {
  const and = [];

  if (filters.q) {
    and.push({
      OR: [
        { name: { contains: filters.q, mode: "insensitive" } },
        { description: { contains: filters.q, mode: "insensitive" } },
        { category: { name: { contains: filters.q, mode: "insensitive" } } },
      ],
    });
  }

  if (filters.category) {
    and.push({
      category: {
        slug: filters.category,
      },
    });
  }

  return {
    isActive: true,
    ...(and.length > 0 ? { AND: and } : {}),
  };
}

export function buildCatalogHref(currentParams, overrides = {}) {
  const currentFilters = normalizeProductCatalogParams(currentParams);
  const mergedParams = normalizeProductCatalogParams({
    ...currentParams,
    ...overrides,
  });
  const shouldResetPage =
    (mergedParams.q !== currentFilters.q ||
      mergedParams.category !== currentFilters.category) &&
    !Object.prototype.hasOwnProperty.call(overrides, "page");

  const nextParams = normalizeProductCatalogParams({
    ...mergedParams,
    ...(shouldResetPage && !("page" in overrides) ? { page: 1 } : {}),
  });

  const searchParams = new URLSearchParams();

  if (nextParams.q) {
    searchParams.set("q", nextParams.q);
  }

  if (nextParams.category) {
    searchParams.set("category", nextParams.category);
  }

  if (nextParams.page > 1) {
    searchParams.set("page", String(nextParams.page));
  }

  const query = searchParams.toString();

  return query ? `/products?${query}` : "/products";
}
```

- [ ] **Step 4: Run the search-helper tests and confirm the contract passes**

Run:
```bash
npm run test -- tests/lib/product-search.test.js
```

Expected:
- Vitest reports `5 passed` for `tests/lib/product-search.test.js`.

- [ ] **Step 5: Commit the search-helper baseline**

Run:
```bash
git add src/lib/product-search.js tests/lib/product-search.test.js
git commit -m "feat: add product search helpers"
```

---

### Task 2: Add paginated catalog search/filter UI on `/products`

**Files:**
- Create: `tests/lib/product-catalog.test.js`
- Create: `src/components/product-catalog-controls.js`
- Create: `src/components/product-pagination.js`
- Modify: `src/lib/products.js`
- Modify: `src/app/products/page.js`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Write failing tests for the paginated catalog query**

Create `tests/lib/product-catalog.test.js` with this suite:

```js
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) =>
    React.createElement("a", { href, ...props }, children),
}));

const { countMock, findManyMock, categoryFindManyMock } = vi.hoisted(() => ({
  countMock: vi.fn(),
  findManyMock: vi.fn(),
  categoryFindManyMock: vi.fn(),
}));

vi.mock("../../src/lib/db.js", () => ({
  db: {
    product: {
      count: countMock,
      findMany: findManyMock,
    },
    category: {
      findMany: categoryFindManyMock,
    },
  },
}));

import { getProductCatalogPage } from "../../src/lib/products.js";
import { ProductPagination } from "../../src/components/product-pagination.js";

describe("getProductCatalogPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns paginated products with normalized filters", async () => {
    countMock.mockResolvedValue(11);
    categoryFindManyMock.mockResolvedValue([
      { slug: "outdoor", name: "Outdoor" },
      { slug: "running", name: "Running" },
    ]);
    findManyMock.mockResolvedValue([
      {
        slug: "trail-guard-mid",
        name: "Trail Guard Mid",
        description: "Bản mid-top chắc chân cho những buổi đi bộ cuối tuần.",
        price: 1590000,
        originalPrice: null,
        image: null,
        badge: "Trail",
        note: "Đế bám tốt",
        stock: 6,
        featured: false,
        isActive: true,
        category: { name: "Outdoor" },
      },
    ]);

    await expect(
      getProductCatalogPage({
        q: " trail ",
        category: "OUTDOOR",
        page: "2",
      }),
    ).resolves.toEqual({
      filters: {
        q: "trail",
        category: "outdoor",
        page: 2,
      },
      pagination: {
        page: 2,
        perPage: 9,
        totalItems: 11,
        totalPages: 2,
      },
      categories: [
        { slug: "outdoor", name: "Outdoor" },
        { slug: "running", name: "Running" },
      ],
      products: [
        {
          slug: "trail-guard-mid",
          name: "Trail Guard Mid",
          category: "Outdoor",
          badge: "Trail",
          description: "Bản mid-top chắc chân cho những buổi đi bộ cuối tuần.",
          price: 1590000,
          originalPrice: null,
          image: null,
          note: "Đế bám tốt",
          inStock: true,
          featured: false,
          isActive: true,
        },
      ],
      hasResults: true,
    });

    expect(countMock).toHaveBeenCalledWith({
      where: {
        isActive: true,
        AND: [
          {
            OR: [
              { name: { contains: "trail", mode: "insensitive" } },
              {
                description: {
                  contains: "trail",
                  mode: "insensitive",
                },
              },
              {
                category: {
                  name: { contains: "trail", mode: "insensitive" },
                },
              },
            ],
          },
          {
            category: {
              slug: "outdoor",
            },
          },
        ],
      },
    });
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
          AND: [
            {
              OR: [
                { name: { contains: "trail", mode: "insensitive" } },
                {
                  description: {
                    contains: "trail",
                    mode: "insensitive",
                  },
                },
                {
                  category: {
                    name: { contains: "trail", mode: "insensitive" },
                  },
                },
              ],
            },
            {
              category: {
                slug: "outdoor",
              },
            },
          ],
        },
        skip: 9,
        take: 9,
      }),
    );
  });

  it("clamps page to 1 for empty result sets", async () => {
    countMock.mockResolvedValue(0);
    categoryFindManyMock.mockResolvedValue([]);
    findManyMock.mockResolvedValue([]);

    await expect(
      getProductCatalogPage({
        q: "missing",
        category: "",
        page: "99",
      }),
    ).resolves.toEqual({
      filters: {
        q: "missing",
        category: "",
        page: 1,
      },
      pagination: {
        page: 1,
        perPage: 9,
        totalItems: 0,
        totalPages: 1,
      },
      categories: [],
      products: [],
      hasResults: false,
    });

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
          AND: [
            {
              OR: [
                { name: { contains: "missing", mode: "insensitive" } },
                {
                  description: {
                    contains: "missing",
                    mode: "insensitive",
                  },
                },
                {
                  category: {
                    name: { contains: "missing", mode: "insensitive" },
                  },
                },
              ],
            },
          ],
        },
        skip: 0,
        take: 9,
      }),
    );
  });

  it("clamps page to the last page when results exist", async () => {
    countMock.mockResolvedValue(10);
    categoryFindManyMock.mockResolvedValue([{ slug: "running", name: "Running" }]);
    findManyMock.mockResolvedValue([]);

    await expect(
      getProductCatalogPage({
        q: "",
        category: "RUNNING",
        page: "99",
      }),
    ).resolves.toEqual({
      filters: {
        q: "",
        category: "running",
        page: 2,
      },
      pagination: {
        page: 2,
        perPage: 9,
        totalItems: 10,
        totalPages: 2,
      },
      categories: [{ slug: "running", name: "Running" }],
      products: [],
      hasResults: true,
    });

    expect(countMock).toHaveBeenCalledWith({
      where: {
        isActive: true,
        AND: [
          {
            category: {
              slug: "running",
            },
          },
        ],
      },
    });
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
          AND: [
            {
              category: {
                slug: "running",
              },
            },
          ],
        },
        skip: 9,
        take: 9,
      }),
    );
  });
});

describe("ProductPagination", () => {
  it("renders boundary controls as non-interactive elements", () => {
    const firstPageMarkup = renderToStaticMarkup(
      React.createElement(ProductPagination, {
        filters: { q: "trail", category: "outdoor", page: 1 },
        pagination: { page: 1, totalPages: 3 },
      }),
    );

    expect(firstPageMarkup).toContain(
      '<span class="catalog-pagination__nav catalog-pagination__nav--disabled" aria-disabled="true">Trước</span>',
    );
    expect(firstPageMarkup).toContain(
      'href="/products?q=trail&amp;category=outdoor&amp;page=2"',
    );
    expect(firstPageMarkup).not.toContain(">Trước</a>");

    const lastPageMarkup = renderToStaticMarkup(
      React.createElement(ProductPagination, {
        filters: { q: "trail", category: "outdoor", page: 3 },
        pagination: { page: 3, totalPages: 3 },
      }),
    );

    expect(lastPageMarkup).toContain(
      '<span class="catalog-pagination__nav catalog-pagination__nav--disabled" aria-disabled="true">Sau</span>',
    );
    expect(lastPageMarkup).not.toContain(">Sau</a>");
  });
});
```

- [ ] **Step 2: Run the catalog query tests to verify the new export is missing**

Run:
```bash
npm run test -- tests/lib/product-catalog.test.js
```

Expected:
- Vitest fails because `getProductCatalogPage` is not exported yet.

- [ ] **Step 3: Extend the storefront data layer with one paginated catalog query**

Update `src/lib/products.js` with these additions:

```js
import { db } from "@/lib/db";
import {
  PRODUCTS_PER_PAGE,
  buildProductWhere,
  normalizeProductCatalogParams,
} from "@/lib/product-search";

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

async function getCatalogCategories() {
  return db.category.findMany({
    where: {
      products: {
        some: {
          isActive: true,
        },
      },
    },
    select: {
      slug: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}

export async function getProductCatalogPage(rawParams = {}) {
  const filters = normalizeProductCatalogParams(rawParams);
  const where = buildProductWhere(filters);
  const [totalItems, categories] = await Promise.all([
    db.product.count({ where }),
    getCatalogCategories(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalItems / PRODUCTS_PER_PAGE));
  const page = Math.min(filters.page, totalPages);

  const products = await db.product.findMany({
    where,
    include: { category: true },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    skip: (page - 1) * PRODUCTS_PER_PAGE,
    take: PRODUCTS_PER_PAGE,
  });

  return {
    filters: {
      ...filters,
      page,
    },
    pagination: {
      page,
      perPage: PRODUCTS_PER_PAGE,
      totalItems,
      totalPages,
    },
    categories,
    products: products.map(toProductViewModel),
    hasResults: totalItems > 0,
  };
}

export async function getProducts() {
  return findProducts();
}
```

- [ ] **Step 4: Replace the flat `/products` page with URL-driven controls, empty state, and pagination**

Create `src/components/product-catalog-controls.js`:

```js
import Link from "next/link";

export function ProductCatalogControls({ filters, categories }) {
  return (
    <form className="catalog-controls" action="/products">
      <label className="catalog-controls__field">
        <span>Từ khóa</span>
        <input
          type="search"
          name="q"
          defaultValue={filters.q}
          placeholder="Ví dụ: trail, running, sale"
        />
      </label>

      <label className="catalog-controls__field">
        <span>Danh mục</span>
        <select name="category" defaultValue={filters.category}>
          <option value="">Tất cả danh mục</option>
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <div className="catalog-controls__actions">
        <button type="submit" className="button button--primary">
          Áp dụng
        </button>

        <Link href="/products" className="button button--secondary">
          Xóa bộ lọc
        </Link>
      </div>
    </form>
  );
}
```

Create `src/components/product-pagination.js`:

```js
import { createElement } from "react";
import Link from "next/link";
import { buildCatalogHref } from "@/lib/product-search";

function renderNavControl({ disabled, href, label, key }) {
  if (disabled) {
    return createElement(
      "span",
      {
        key,
        className: "catalog-pagination__nav catalog-pagination__nav--disabled",
        "aria-disabled": "true",
      },
      label,
    );
  }

  return createElement(
    Link,
    {
      key,
      href,
      className: "catalog-pagination__nav",
    },
    label,
  );
}

export function ProductPagination({ filters, pagination }) {
  const { page, totalPages } = pagination;

  if (totalPages <= 1) {
    return null;
  }

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return createElement(
    "nav",
    {
      className: "catalog-pagination",
      "aria-label": "Phân trang sản phẩm",
    },
    [
      renderNavControl({
        disabled: page === 1,
        href: buildCatalogHref(filters, { page: page - 1 }),
        key: "previous",
        label: "Trước",
      }),
      createElement(
        "div",
        {
          className: "catalog-pagination__pages",
          key: "pages",
        },
        pages.map((pageNumber) =>
          createElement(
            Link,
            {
              key: pageNumber,
              href: buildCatalogHref(filters, { page: pageNumber }),
              className: `catalog-pagination__page ${
                pageNumber === page ? "catalog-pagination__page--current" : ""
              }`,
              "aria-current": pageNumber === page ? "page" : undefined,
            },
            pageNumber,
          ),
        ),
      ),
      renderNavControl({
        disabled: page === totalPages,
        href: buildCatalogHref(filters, { page: page + 1 }),
        key: "next",
        label: "Sau",
      }),
    ],
  );
}
```

Update `src/app/products/page.js` to this:

```js
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { ProductCatalogControls } from "@/components/product-catalog-controls";
import { ProductPagination } from "@/components/product-pagination";
import { getProductCatalogPage } from "@/lib/products";

export const metadata = {
  title: "MiniShop | Tất cả sản phẩm",
  description: "Danh sách sản phẩm của MiniShop với filter và pagination.",
};

export default async function ProductsPage({ searchParams }) {
  const catalog = await getProductCatalogPage(await searchParams);

  return (
    <main className="products-page">
      <section className="products-page__hero">
        <div className="site-shell">
          <p className="products-page__eyebrow">Search + filter + pagination</p>
          <h1>Tất cả sản phẩm</h1>
          <p className="products-page__description">
            URL là source of truth để người học bookmark, chia sẻ, và debug
            trạng thái catalog.
          </p>
          <Link href="/" className="button button--secondary">
            Quay lại trang chủ
          </Link>
        </div>
      </section>

      <section className="products-page__list">
        <div className="site-shell products-page__stack">
          <div className="products-page__summary">
            <strong>{catalog.pagination.totalItems}</strong>
            <span>sản phẩm khớp điều kiện hiện tại</span>
          </div>

          <ProductCatalogControls
            filters={catalog.filters}
            categories={catalog.categories}
          />

          {catalog.hasResults ? (
            <>
              <div className="products-page__grid">
                {catalog.products.map((product) => (
                  <ProductCard key={product.slug} product={product} />
                ))}
              </div>

              <ProductPagination
                filters={catalog.filters}
                pagination={catalog.pagination}
              />
            </>
          ) : (
            <article className="products-empty-state">
              <p className="products-page__eyebrow">Empty state</p>
              <h2>Không có sản phẩm phù hợp</h2>
              <p>
                Thử đổi từ khóa, bỏ category filter, hoặc quay lại danh sách đầy
                đủ để kiểm tra catalog seed.
              </p>
              <Link href="/products" className="button button--primary">
                Xem lại toàn bộ sản phẩm
              </Link>
            </article>
          )}
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 5: Add responsive styles for controls, summary, empty state, and pagination**

Append these rules to `src/app/globals.css`:

```css
.products-page__stack {
  display: grid;
  gap: 24px;
}

.products-page__summary {
  display: flex;
  align-items: baseline;
  gap: 10px;
  color: var(--muted);
}

.products-page__summary strong {
  font-family: var(--font-space-grotesk), Arial, sans-serif;
  font-size: 2rem;
  color: var(--text);
}

.catalog-controls {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(220px, 1fr) auto;
  gap: 14px;
  padding: 18px;
  border: 1px solid var(--border);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: var(--shadow);
}

.catalog-controls__field {
  display: grid;
  gap: 8px;
  color: var(--muted);
}

.catalog-controls__field input,
.catalog-controls__field select {
  min-height: 48px;
  padding: 0 14px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #fff;
}

.catalog-controls__actions {
  display: flex;
  align-items: end;
  gap: 10px;
  flex-wrap: wrap;
}

.products-empty-state {
  display: grid;
  gap: 12px;
  padding: 28px;
  border: 1px dashed var(--border);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.68);
}

.catalog-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.catalog-pagination__pages {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.catalog-pagination__page,
.catalog-pagination__nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
}

.catalog-pagination__page--current {
  background: var(--text);
  color: #fff;
  border-color: var(--text);
}

.catalog-pagination__nav--disabled {
  pointer-events: none;
  opacity: 0.4;
  cursor: default;
}

@media (max-width: 720px) {
  .catalog-controls {
    grid-template-columns: 1fr;
  }

  .catalog-controls__actions {
    align-items: stretch;
  }

  .catalog-controls__actions .button {
    width: 100%;
  }
}
```

- [ ] **Step 6: Run catalog tests plus the existing product view-model test**

Run:
```bash
npm run test -- tests/lib/product-catalog.test.js tests/lib/products.test.js
```

Expected:
- Vitest reports `5 passed`, covering `tests/lib/product-catalog.test.js` and `tests/lib/products.test.js`.

- [ ] **Step 7: Commit the catalog search/filter/pagination milestone**

Run:
```bash
git add src/lib/products.js src/app/products/page.js src/components/product-catalog-controls.js src/components/product-pagination.js src/app/globals.css tests/lib/product-catalog.test.js
git commit -m "feat: add product search and pagination"
```

---

### Task 3: Add SEO helpers plus loading/error/not-found route states

**Files:**
- Create: `src/lib/seo.js`
- Create: `tests/lib/seo.test.js`
- Create: `src/app/products/loading.js`
- Create: `src/app/products/error.js`
- Create: `src/app/not-found.js`
- Create: `src/app/sitemap.js`
- Create: `src/app/robots.js`
- Modify: `src/app/layout.js`
- Modify: `src/app/products/page.js`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Write failing tests for the SEO helper**

Create `tests/lib/seo.test.js` with this suite:

```js
import { afterEach, describe, expect, it } from "vitest";
import { buildAbsoluteUrl, getSiteUrl } from "../../src/lib/seo.js";

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  process.env.NODE_ENV = originalNodeEnv;
});

describe("seo helpers", () => {
  it("falls back to localhost in development when NEXT_PUBLIC_SITE_URL is missing", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NODE_ENV = "development";

    expect(getSiteUrl()).toBe("http://localhost:3000");
  });

  it("throws in production when NEXT_PUBLIC_SITE_URL is missing", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NODE_ENV = "production";

    expect(() => getSiteUrl()).toThrow(
      "NEXT_PUBLIC_SITE_URL must be set in production.",
    );
  });

  it("trims trailing slashes before building absolute URLs", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://minishop-demo.vercel.app/";

    expect(getSiteUrl()).toBe("https://minishop-demo.vercel.app");
    expect(buildAbsoluteUrl("/products?q=trail")).toBe(
      "https://minishop-demo.vercel.app/products?q=trail",
    );
  });

  it("preserves subpath deployments when building absolute URLs", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com/shop/";

    expect(getSiteUrl()).toBe("https://example.com/shop");
    expect(buildAbsoluteUrl("/products")).toBe(
      "https://example.com/shop/products",
    );
  });

  it("normalizes non-leading-slash inputs as relative paths", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com/shop";

    expect(buildAbsoluteUrl("products?q=trail")).toBe(
      "https://example.com/shop/products?q=trail",
    );
  });
});
```

- [ ] **Step 2: Run the SEO helper tests to confirm the module is missing**

Run:
```bash
npm run test -- tests/lib/seo.test.js
```

Expected:
- Vitest fails with a module-not-found error for `src/lib/seo.js`.

- [ ] **Step 3: Implement the SEO helper and wire metadata, sitemap, and robots**

Create `src/lib/seo.js`:

```js
const FALLBACK_SITE_URL = "http://localhost:3000";
const MISSING_SITE_URL_ERROR =
  "NEXT_PUBLIC_SITE_URL must be set in production.";

function normalizeSiteUrl(value) {
  const url = new URL(value);
  const normalizedPathname =
    url.pathname !== "/" && url.pathname.endsWith("/")
      ? url.pathname.slice(0, -1)
      : url.pathname;

  url.pathname = normalizedPathname;
  url.search = "";
  url.hash = "";

  return url.toString().replace(/\/$/, normalizedPathname === "/" ? "" : "");
}

function readSiteUrlValue() {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!value) {
    return null;
  }

  return normalizeSiteUrl(value);
}

export function getOptionalSiteUrl() {
  const siteUrl = readSiteUrlValue();

  if (!siteUrl) {
    if (process.env.NODE_ENV === "production") {
      return null;
    }

    return FALLBACK_SITE_URL;
  }

  return siteUrl;
}

export function getSiteUrl() {
  const siteUrl = readSiteUrlValue();

  if (!siteUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(MISSING_SITE_URL_ERROR);
    }

    return FALLBACK_SITE_URL;
  }

  return siteUrl;
}

export function buildAbsoluteUrl(pathname = "/") {
  const baseUrl = new URL(getSiteUrl());
  const basePathname = baseUrl.pathname.endsWith("/")
    ? baseUrl.pathname
    : `${baseUrl.pathname}/`;
  const normalizedPath = pathname === "/" ? "" : pathname.replace(/^\/+/, "");

  baseUrl.pathname = basePathname;
  baseUrl.search = "";
  baseUrl.hash = "";

  return new URL(normalizedPath, baseUrl).toString();
}
```

Update `src/app/layout.js`:

```js
import "./globals.css";
import { Inter, Space_Grotesk } from "next/font/google";
import { CartProvider } from "@/components/cart-provider";
import { SiteHeader } from "@/components/site-header";
import { getOptionalSiteUrl } from "@/lib/seo";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const optionalSiteUrl = getOptionalSiteUrl();

export const metadata = {
  ...(optionalSiteUrl ? { metadataBase: new URL(optionalSiteUrl) } : {}),
  title: {
    default: "MiniShop | Sneaker Store",
    template: "%s | MiniShop",
  },
  description:
    "MiniShop course project: storefront, cart, checkout, admin, auth, và catalog filter bằng Next.js App Router.",
  openGraph: {
    title: "MiniShop",
    description:
      "Project học React + Next.js theo flow bán hàng hoàn chỉnh từ landing tới admin.",
    siteName: "MiniShop",
    locale: "vi_VN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MiniShop",
    description:
      "Project học React + Next.js theo flow bán hàng hoàn chỉnh từ landing tới admin.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body>
        <CartProvider>
          <SiteHeader />
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
```

Update `src/app/products/page.js` by replacing the static `metadata` export with:

```js
import { buildAbsoluteUrl } from "@/lib/seo";
import { buildCatalogHref, normalizeProductCatalogParams } from "@/lib/product-search";

export async function generateMetadata({ searchParams }) {
  const filters = normalizeProductCatalogParams(await searchParams);
  const title = filters.q
    ? `Kết quả cho "${filters.q}"`
    : filters.category
      ? `Danh mục ${filters.category}`
      : "Tất cả sản phẩm";
  const description =
    filters.q || filters.category
      ? "Danh sách sản phẩm đã lọc bằng search params của MiniShop."
      : "Danh sách toàn bộ sneaker demo của MiniShop.";
  const canonicalPath = buildCatalogHref(filters);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: `${title} | MiniShop`,
      description,
      url: buildAbsoluteUrl(canonicalPath),
    },
  };
}
```

Create `src/app/sitemap.js`:

```js
import { getProductSlugs } from "@/lib/products";
import { buildAbsoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap() {
  const products = await getProductSlugs();

  return [
    {
      url: buildAbsoluteUrl("/"),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: buildAbsoluteUrl("/products"),
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...products.map(({ slug }) => ({
      url: buildAbsoluteUrl(`/products/${slug}`),
      changeFrequency: "weekly",
      priority: 0.8,
    })),
  ];
}
```

Create `src/app/robots.js`:

```js
import { getSiteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
```

- [ ] **Step 4: Add product-list loading/error UI and a global not-found page**

Create `src/app/products/loading.js`:

```js
export default function ProductsLoading() {
  return (
    <main className="products-page" aria-busy="true">
      <section className="products-page__hero">
        <div className="site-shell">
          <p className="products-page__eyebrow">Loading state</p>
          <h1>Đang tải catalog...</h1>
        </div>
      </section>

      <section className="products-page__list">
        <div
          className="site-shell products-page__grid"
          role="status"
          aria-live="polite"
        >
          <span className="sr-only">Đang tải danh sách sản phẩm.</span>
          {Array.from({ length: 6 }).map((_, index) => (
            <article
              key={index}
              className="product-card product-card--loading"
              aria-hidden="true"
            >
              <div className="product-card__image" />
              <div className="product-card__body">
                <div className="product-skeleton product-skeleton--short" />
                <div className="product-skeleton product-skeleton--title" />
                <div className="product-skeleton" />
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
```

Create `src/app/products/error.js`:

```js
"use client";

export default function ProductsError({ error, reset }) {
  console.error(error);

  return (
    <main className="status-page">
      <section className="site-shell status-page__card">
        <p className="products-page__eyebrow">Error state</p>
        <h1>Không tải được catalog</h1>
        <p>
          Đã có lỗi xảy ra khi đọc dữ liệu sản phẩm. Vui lòng thử lại sau ít
          phút.
        </p>
        <button type="button" className="button button--primary" onClick={reset}>
          Thử lại
        </button>
      </section>
    </main>
  );
}
```

Create `src/app/not-found.js`:

```js
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="status-page">
      <section className="site-shell status-page__card">
        <p className="products-page__eyebrow">404</p>
        <h1>Trang này không tồn tại</h1>
        <p>
          Kiểm tra lại URL hoặc quay về catalog để tiếp tục flow storefront của
          MiniShop.
        </p>
        <div className="hero__actions">
          <Link href="/" className="button button--primary">
            Về trang chủ
          </Link>
          <Link href="/products" className="button button--secondary">
            Xem sản phẩm
          </Link>
        </div>
      </section>
    </main>
  );
}
```

Append these styles to `src/app/globals.css`:

```css
.status-page {
  padding: 72px 0;
}

.status-page__card {
  display: grid;
  gap: 14px;
  max-width: 720px;
  padding: 28px;
  border: 1px solid var(--border);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: var(--shadow);
}

.product-card--loading {
  pointer-events: none;
}

.product-skeleton {
  height: 12px;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    rgba(31, 26, 23, 0.08),
    rgba(31, 26, 23, 0.16),
    rgba(31, 26, 23, 0.08)
  );
}

.product-skeleton--short {
  width: 36%;
}

.product-skeleton--title {
  width: 74%;
  height: 18px;
  margin: 12px 0;
}
```

- [ ] **Step 5: Run SEO tests, then lint and production build**

Run:
```bash
npm run test -- tests/lib/seo.test.js
npm run lint
npm run build
```

Expected:
- Vitest reports `5 passed` for `tests/lib/seo.test.js`.
- ESLint exits with code `0`.
- `next build` completes successfully and emits dynamic `/sitemap.xml` plus `/robots.txt` route output.

- [ ] **Step 6: Commit the SEO and route-state layer**

Run:
```bash
git add src/lib/seo.js tests/lib/seo.test.js src/app/layout.js src/app/products/page.js src/app/products/loading.js src/app/products/error.js src/app/not-found.js src/app/sitemap.js src/app/robots.js src/app/globals.css
git commit -m "feat: add seo and route states"
```

---

### Task 4: Replace the default docs with a real deploy checklist

**Files:**
- Create: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Add an explicit environment template**

Create `.env.example` with this content:

```bash
DATABASE_URL="file:./prisma/dev.db"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

- [ ] **Step 2: Rewrite `README.md` around the real MiniShop flow**

Replace `README.md` with this content:

````md
# MiniShop

MiniShop là project khóa học React + Next.js theo flow e-commerce hoàn chỉnh:
landing, listing, detail, cart, checkout, login demo, admin products, admin orders.

## Tech stack

- Next.js 16 App Router
- React 19
- JavaScript
- Prisma ORM
- SQLite cho local development
- Vitest + ESLint

## Local setup

```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Mở `http://localhost:3000`.

## Demo roles

- `Admin`: đăng nhập từ `/login` để vào `/admin`, `/admin/products`, `/admin/orders`
- `Customer`: role demo để học sự khác nhau giữa authenticated và authorized

## Useful commands

```bash
npm run dev
npm run test
npm run lint
npm run build
npm run db:generate
npm run db:migrate
npm run db:seed
```

## Route map

- `/`
- `/products`
- `/products/[slug]`
- `/cart`
- `/checkout`
- `/order-success`
- `/login`
- `/admin`
- `/admin/products`
- `/admin/products/new`
- `/admin/products/[id]/edit`
- `/admin/orders`
- `/admin/orders/[id]`

## Production checklist

- `NEXT_PUBLIC_SITE_URL` trỏ đúng domain public
- `npm run build` pass trước khi deploy
- `/products` có loading, empty, và error state hoạt động
- `/sitemap.xml` và `/robots.txt` render được
- seed hoặc data production đã sẵn sàng
- test `/login` -> `/admin` -> `/admin/orders` sau deploy

## Vercel notes

Buổi 10 giữ SQLite cho local learning flow. Nếu deploy thật lên Vercel, dùng PostgreSQL managed service cho `DATABASE_URL` thay vì file SQLite cục bộ. Phần này là bài tập mở rộng sau khi local build đã ổn định.
````

- [ ] **Step 3: Run final verification for docs + production readiness**

Run:
```bash
npm run test
npm run lint
npm run build
npm run db:seed
```

Expected:
- Full Vitest suite passes.
- ESLint exits with code `0`.
- Production build passes after the README/env changes.
- Seed completes without Prisma errors.

- [ ] **Step 4: Smoke test the final learner flow in the browser**

Run:
```bash
npm run dev
```

Manually verify:
- `/products?q=trail` narrows the grid and keeps the query in the URL.
- `/products?category=lifestyle&page=2` changes both results and pagination state.
- `/products?q=khong-ton-tai` shows the empty state instead of a blank page.
- Refreshing a filtered URL keeps the same catalog state.
- `/no-such-route` renders the global not-found page.
- `/sitemap.xml` and `/robots.txt` return route output.
- `npm run build` still passes after all manual smoke-test edits are complete.

- [ ] **Step 5: Commit the final docs/deploy pass**

Run:
```bash
git add .env.example README.md
git commit -m "docs: add deployment checklist"
```

---

## Self-Review

- Spec coverage:
  - Search params, filter, pagination → Task 1 + Task 2.
  - Metadata SEO → Task 3.
  - Loading / error / empty state → Task 2 + Task 3.
  - Final build and deploy checklist → Task 4.
  - Responsive polish and README → Task 2 + Task 4.
- Placeholder scan:
  - No `TODO`, `TBD`, or “handle later” markers remain.
- Type consistency:
  - Shared parameter names stay `q`, `category`, `page`.
  - Shared pagination constant stays `PRODUCTS_PER_PAGE = 9`.
  - SEO helper naming stays `getSiteUrl()` + `buildAbsoluteUrl()` across layout, sitemap, and robots.
