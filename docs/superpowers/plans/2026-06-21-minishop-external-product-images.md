# MiniShop External Product Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add external HTTPS product image rendering with shared fallback behavior across storefront and admin, plus live preview in the admin product form.

**Architecture:** Keep DB and API contracts unchanged. Add one shared `product-image` component that owns URL validation, `next/image` rendering, and fallback state, then wire that component into storefront cards, detail/related products, admin list, and admin form preview.

**Tech Stack:** `next@16`, `react@19`, `vitest`, `react-dom/server`, `next/image`, App Router

---

## File structure

- Create: `src/lib/product-image-url.js` — renderability guard for external HTTPS image URLs
- Create: `src/components/product-image.js` — shared image/fallback component
- Create: `src/components/admin-product-image-preview.js` — small client wrapper for live form preview
- Create: `tests/lib/product-image-url.test.js` — unit tests for URL validation policy
- Create: `tests/lib/product-image.test.js` — component tests for image/fallback rendering
- Modify: `next.config.mjs` — allow remote HTTPS images
- Modify: `src/components/product-card.js` — replace placeholder block with shared image
- Modify: `src/app/products/[slug]/page.js` — render detail image + related product images
- Modify: `src/app/admin/products/page.js` — render admin thumbnails
- Modify: `src/components/admin-product-form.js` — mount preview block next to image input
- Modify: `src/app/globals.css` — add shared image, thumbnail, and preview styles

### Task 1: URL policy helper

**Files:**
- Create: `tests/lib/product-image-url.test.js`
- Create: `src/lib/product-image-url.js`

- [ ] **Step 1: Write the failing test**

```js
import { describe, expect, it } from "vitest";
import { isRenderableProductImageUrl } from "../../src/lib/product-image-url.js";

describe("isRenderableProductImageUrl", () => {
  it("accepts https URLs", () => {
    expect(
      isRenderableProductImageUrl("https://images.example.com/shoe.jpg"),
    ).toBe(true);
  });

  it("rejects http URLs, blank strings, and malformed values", () => {
    expect(isRenderableProductImageUrl("http://images.example.com/shoe.jpg")).toBe(false);
    expect(isRenderableProductImageUrl("   ")).toBe(false);
    expect(isRenderableProductImageUrl("not-a-url")).toBe(false);
    expect(isRenderableProductImageUrl(null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/product-image-url.test.js`
Expected: FAIL with module-not-found for `src/lib/product-image-url.js` or missing export.

- [ ] **Step 3: Write minimal implementation**

```js
export function isRenderableProductImageUrl(value) {
  if (typeof value !== "string") {
    return false;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return false;
  }

  try {
    return new URL(trimmed).protocol === "https:";
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/product-image-url.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/lib/product-image-url.test.js src/lib/product-image-url.js
git commit -m "test: define external product image URL policy"
```

### Task 2: Shared image component + framework config

**Files:**
- Create: `tests/lib/product-image.test.js`
- Create: `src/components/product-image.js`
- Modify: `next.config.mjs`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Write the failing component tests**

```js
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({ alt, src, ...props }) =>
    React.createElement("img", { alt, src, ...props }),
}));

import { ProductImage } from "../../src/components/product-image.js";

describe("ProductImage", () => {
  it("renders an image for valid https URLs", () => {
    const html = renderToStaticMarkup(
      <ProductImage
        src="https://images.example.com/shoe.jpg"
        alt="Air Runner"
        variant="card"
      />,
    );

    expect(html).toContain('src="https://images.example.com/shoe.jpg"');
    expect(html).not.toContain("product-image__fallback");
  });

  it("renders fallback markup for missing URLs", () => {
    const html = renderToStaticMarkup(
      <ProductImage src={null} alt="Air Runner" variant="card" />,
    );

    expect(html).toContain("product-image__fallback");
  });

  it("renders fallback markup for invalid URLs", () => {
    const html = renderToStaticMarkup(
      <ProductImage src="http://images.example.com/shoe.jpg" alt="Air Runner" variant="card" />,
    );

    expect(html).toContain("product-image__fallback");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/lib/product-image.test.js`
Expected: FAIL because `ProductImage` does not exist.

- [ ] **Step 3: Write minimal component + config + styles**

```js
"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { isRenderableProductImageUrl } from "@/lib/product-image-url";

export function ProductImage({ src, alt, variant = "card", fill = true, sizes = "100vw", priority = false, badge = "" }) {
  const normalizedSrc = useMemo(() => (typeof src === "string" ? src.trim() : ""), [src]);
  const [hasLoadError, setHasLoadError] = useState(false);
  const canRender = isRenderableProductImageUrl(normalizedSrc) && !hasLoadError;

  return (
    <div className={`product-image product-image--${variant}`}>
      {canRender ? (
        <Image
          src={normalizedSrc}
          alt={alt}
          fill={fill}
          sizes={sizes}
          priority={priority}
          className="product-image__img"
          onError={() => setHasLoadError(true)}
        />
      ) : (
        <div className="product-image__fallback" aria-label={`${alt} placeholder`}>
          {badge ? <span>{badge}</span> : <span>MiniShop</span>}
        </div>
      )}
    </div>
  );
}
```

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
```

```css
.product-image {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.product-image__img {
  object-fit: cover;
}

.product-image__fallback {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(194, 65, 12, 0.18), rgba(255, 255, 255, 0.82));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/lib/product-image-url.test.js tests/lib/product-image.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/lib/product-image.test.js src/components/product-image.js next.config.mjs src/app/globals.css
git commit -m "feat: add shared external product image component"
```

### Task 3: Storefront + admin list integration

**Files:**
- Modify: `src/components/product-card.js`
- Modify: `src/app/products/[slug]/page.js`
- Modify: `src/app/admin/products/page.js`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Write the failing integration-oriented tests**

```js
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) =>
    React.createElement("a", { href, ...props }, children),
}));

vi.mock("@/components/product-image", () => ({
  ProductImage: ({ src, alt, variant }) =>
    React.createElement("div", {
      "data-product-image": `${variant}:${src}:${alt}`,
    }),
}));

import { ProductCard } from "../../src/components/product-card.js";

describe("ProductCard", () => {
  it("routes card visuals through ProductImage", () => {
    const html = renderToStaticMarkup(
      <ProductCard
        product={{
          slug: "air-runner",
          name: "Air Runner",
          category: "Running",
          badge: "New",
          description: "Demo",
          price: 1,
          originalPrice: null,
          image: "https://images.example.com/shoe.jpg",
          note: "",
          inStock: true,
        }}
      />,
    );

    expect(html).toContain("data-product-image=\"card:https://images.example.com/shoe.jpg:Air Runner\"");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/lib/product-image.test.js tests/lib/products.test.js`
Expected: FAIL because `ProductCard` still renders the old placeholder block.

- [ ] **Step 3: Wire the shared component into surfaces**

```js
import { ProductImage } from "@/components/product-image";

<div className="product-card__image" aria-hidden="true">
  <ProductImage
    src={product.image}
    alt={product.name}
    variant="card"
    sizes="(max-width: 768px) 100vw, 33vw"
    badge={badgeLabel}
  />
</div>
```

```js
<div className="product-detail__visual">
  <ProductImage
    src={product.image}
    alt={product.name}
    variant="detail"
    sizes="(max-width: 768px) 100vw, 50vw"
    priority
    badge={product.badge}
  />
  <p className="product-detail__visual-label">{product.category}</p>
</div>
```

```js
<article key={relatedProduct.slug} className="related-products__item">
  <ProductImage
    src={relatedProduct.image}
    alt={relatedProduct.name}
    variant="related"
    sizes="(max-width: 768px) 100vw, 20vw"
    badge={relatedProduct.badge}
  />
  <h3>{relatedProduct.name}</h3>
  <p>{relatedProduct.category}</p>
  <Link href={`/products/${relatedProduct.slug}`}>Xem chi tiết</Link>
</article>
```

```js
<article key={product.id} className="admin-product-card">
  <div className="admin-product-card__media">
    <ProductImage
      src={product.image}
      alt={product.name}
      variant="admin-thumb"
      sizes="96px"
      badge={product.badge ?? ""}
    />
  </div>
  <div className="admin-product-card__copy">
    ...
  </div>
</article>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/lib/product-image.test.js tests/lib/products.test.js tests/lib/product-catalog.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/product-card.js src/app/products/[slug]/page.js src/app/admin/products/page.js src/app/globals.css
git commit -m "feat: render external product images across storefront and admin list"
```

### Task 4: Admin form live preview + final verification

**Files:**
- Create: `src/components/admin-product-image-preview.js`
- Modify: `src/components/admin-product-form.js`
- Modify: `tests/lib/product-image.test.js`

- [ ] **Step 1: Write the failing preview test**

```js
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/admin-product-image-preview", () => ({
  AdminProductImagePreview: ({ image, name }) =>
    React.createElement("div", {
      "data-admin-preview": `${name}:${image}`,
    }),
}));

import { AdminProductForm } from "../../src/components/admin-product-form.js";

describe("AdminProductForm", () => {
  it("renders the admin image preview with current initial values", () => {
    const html = renderToStaticMarkup(
      <AdminProductForm
        action={() => {}}
        categories={[{ id: "1", slug: "running", name: "Running" }]}
        title="Create"
        description="Create"
        submitLabel="Save"
        initialValues={{ image: "https://images.example.com/shoe.jpg", name: "Air Runner" }}
      />,
    );

    expect(html).toContain(
      "data-admin-preview=\"Air Runner:https://images.example.com/shoe.jpg\"",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/admin-product-form.test.js tests/lib/product-image.test.js`
Expected: FAIL because `AdminProductForm` does not render a preview component.

- [ ] **Step 3: Add minimal live preview implementation**

```js
"use client";

import { useMemo, useState } from "react";
import { ProductImage } from "@/components/product-image";

export function AdminProductImagePreview({ initialImage = "", productName = "Product image" }) {
  const [image, setImage] = useState(initialImage);
  const label = useMemo(() => (productName?.trim() ? productName : "Product image"), [productName]);

  return (
    <div className="admin-product-preview">
      <ProductImage src={image} alt={label} variant="admin-preview" sizes="320px" badge="Preview" />
      <input type="hidden" value={image} readOnly />
    </div>
  );
}
```

```js
import { AdminProductImagePreview } from "@/components/admin-product-image-preview";

<label className="admin-field">
  <span>Image</span>
  <input name="image" defaultValue={values.image} />
</label>

<div className="admin-field admin-field--full">
  <span>Preview</span>
  <AdminProductImagePreview
    initialImage={values.image}
    productName={values.name}
  />
</div>
```

If live syncing from typing is required, replace the raw input + preview pair with a tiny client wrapper that owns both `value` and preview state.

- [ ] **Step 4: Run focused tests, then full verification**

Run:

```bash
npm test -- tests/lib/product-image-url.test.js tests/lib/product-image.test.js tests/lib/admin-product-form.test.js tests/lib/products.test.js tests/lib/product-catalog.test.js
npm run lint
npm run build
```

Expected: all commands PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin-product-image-preview.js src/components/admin-product-form.js tests/lib/admin-product-form.test.js tests/lib/product-image.test.js
git commit -m "feat: add admin product image preview"
```

## Self-review

- Spec coverage: all requested surfaces are covered by Tasks 2-4; HTTPS-only URL policy covered by Task 1; fallback behavior covered by Tasks 2-4.
- Placeholder scan: no `TODO`, `TBD`, or implied test steps remain.
- Type consistency: helper name `isRenderableProductImageUrl` and component name `ProductImage` stay consistent across all tasks.
