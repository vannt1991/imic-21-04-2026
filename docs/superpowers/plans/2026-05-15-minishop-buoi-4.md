# MiniShop Buổi 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the frontend cart milestone in JavaScript: shared cart state with Context API, persistence with `localStorage`, an `AddToCartButton` on the product detail page, a global cart entry in the shared header, and a `/cart` page that supports quantity updates, item removal, empty state, and subtotal calculation.

**Architecture:** Keep product data in `src/lib/products.js` as the server-side source catalog, and add a separate `src/lib/cart.js` module for pure cart transformations that can be tested in Node with Vitest. Wrap the app in a client-side `CartProvider` from `src/components/cart-provider.js`, then expose the cart through small client leaf components: `AddToCartButton`, `CartStatusLink`, and `CartPageContent`. Move `SiteHeader` into `src/app/layout.js` so the cart link and count are visible across home, listing, detail, and cart routes.

**Tech Stack:** Next.js App Router, React 19, JavaScript, Context API, `useState`, `useEffect`, `localStorage`, Vitest, global CSS, `next/link`, `Intl.NumberFormat`.

---

## Current Codebase Notes

- `src/lib/products.js` already provides the mock catalog and product lookup helpers from buổi 3.
- `src/app/products/[slug]/page.js` is already the product detail page and is the best place to mount the first `AddToCartButton`.
- `src/components/site-header.js` currently exists only on the homepage because `src/app/page.js` renders it directly; product pages do not share the header yet.
- `tests/lib/products.test.js` and `vitest.config.mjs` already exist, so buổi 4 can add pure helper tests without introducing a new test runner.
- `src/app/globals.css` already contains the shared visual language, product listing, and detail-page styles; cart styles should extend that file instead of introducing a new CSS system.

## File Map

- Create: `src/lib/cart.js`
- Create: `tests/lib/cart.test.js`
- Create: `src/components/cart-provider.js`
- Create: `src/components/cart-status-link.js`
- Create: `src/components/add-to-cart-button.js`
- Create: `src/components/cart-page-content.js`
- Create: `src/app/cart/page.js`
- Modify: `src/app/layout.js`
- Modify: `src/app/page.js`
- Modify: `src/components/site-header.js`
- Modify: `src/app/products/[slug]/page.js`
- Modify: `src/app/globals.css`

## Verification Strategy

- Use `npm run test` for the pure cart helper logic.
- Use `npm run lint` to catch JSX/import/style issues.
- Use `npm run build` to catch App Router and client/server boundary mistakes.
- Smoke test in the browser at `/products/air-runner-basic`, `/cart`, and `/products` to verify add, persist, update, remove, and empty-state behavior.

---

### Task 1: Add pure cart helpers with Vitest coverage

**Files:**
- Create: `src/lib/cart.js`
- Create: `tests/lib/cart.test.js`

- [ ] **Step 1: Write the failing helper tests first**

Create `tests/lib/cart.test.js` with this suite:

```js
import { describe, expect, it } from "vitest";
import {
  addCartItem,
  getCartCount,
  getCartSubtotal,
  parseStoredCart,
  removeCartItem,
  serializeCart,
  updateCartItemQuantity,
} from "../../src/lib/cart.js";

const runningShoe = {
  slug: "air-runner-basic",
  name: "Air Runner Basic",
  price: 1290000,
  badge: "Bestseller",
  inStock: true,
};

const lifestyleShoe = {
  slug: "street-flex-pro",
  name: "Street Flex Pro",
  price: 1890000,
  badge: "New",
  inStock: true,
};

describe("cart helpers", () => {
  it("adds a new product with quantity 1", () => {
    expect(addCartItem([], runningShoe)).toEqual([
      {
        slug: "air-runner-basic",
        name: "Air Runner Basic",
        price: 1290000,
        badge: "Bestseller",
        quantity: 1,
      },
    ]);
  });

  it("increments quantity when adding the same product twice", () => {
    const firstPass = addCartItem([], runningShoe);

    expect(addCartItem(firstPass, runningShoe)).toEqual([
      {
        slug: "air-runner-basic",
        name: "Air Runner Basic",
        price: 1290000,
        badge: "Bestseller",
        quantity: 2,
      },
    ]);
  });

  it("updates a line quantity and removes it when the next quantity is zero", () => {
    const cart = addCartItem(addCartItem([], runningShoe), lifestyleShoe);

    expect(updateCartItemQuantity(cart, "street-flex-pro", 3)).toEqual([
      {
        slug: "air-runner-basic",
        name: "Air Runner Basic",
        price: 1290000,
        badge: "Bestseller",
        quantity: 1,
      },
      {
        slug: "street-flex-pro",
        name: "Street Flex Pro",
        price: 1890000,
        badge: "New",
        quantity: 3,
      },
    ]);

    expect(removeCartItem(cart, "air-runner-basic")).toEqual([
      {
        slug: "street-flex-pro",
        name: "Street Flex Pro",
        price: 1890000,
        badge: "New",
        quantity: 1,
      },
    ]);

    expect(updateCartItemQuantity(cart, "street-flex-pro", 0)).toEqual([
      {
        slug: "air-runner-basic",
        name: "Air Runner Basic",
        price: 1290000,
        badge: "Bestseller",
        quantity: 1,
      },
    ]);
  });

  it("calculates cart count and subtotal from mixed items", () => {
    const cart = [
      {
        slug: "air-runner-basic",
        name: "Air Runner Basic",
        price: 1290000,
        badge: "Bestseller",
        quantity: 2,
      },
      {
        slug: "street-flex-pro",
        name: "Street Flex Pro",
        price: 1890000,
        badge: "New",
        quantity: 1,
      },
    ];

    expect(getCartCount(cart)).toBe(3);
    expect(getCartSubtotal(cart)).toBe(4470000);
  });

  it("returns an empty array for broken storage payloads", () => {
    expect(parseStoredCart("")).toEqual([]);
    expect(parseStoredCart("not-json")).toEqual([]);
    expect(parseStoredCart(JSON.stringify({ slug: "air-runner-basic" }))).toEqual(
      [],
    );
  });

  it("serializes and restores a valid stored cart", () => {
    const cart = [
      {
        slug: "air-runner-basic",
        name: "Air Runner Basic",
        price: 1290000,
        badge: "Bestseller",
        quantity: 2,
      },
    ];

    expect(parseStoredCart(serializeCart(cart))).toEqual(cart);
  });
});
```

- [ ] **Step 2: Run the new test file and confirm it fails before the helper exists**

Run:
```bash
npm run test -- tests/lib/cart.test.js
```

Expected:
- Vitest fails with a module-not-found error for `src/lib/cart.js`.

- [ ] **Step 3: Implement the pure cart module with storage-safe parsing**

Create `src/lib/cart.js` with this code:

```js
export const CART_STORAGE_KEY = "minishop-cart";

function sanitizeQuantity(quantity) {
  if (!Number.isFinite(quantity) || quantity < 1) {
    return 1;
  }

  return Math.floor(quantity);
}

function toCartItem(product) {
  return {
    slug: product.slug,
    name: product.name,
    price: product.price,
    badge: product.badge,
    quantity: 1,
  };
}

export function addCartItem(items, product) {
  if (!product?.slug || !product?.inStock) {
    return items;
  }

  const existingItem = items.find((item) => item.slug === product.slug);

  if (!existingItem) {
    return [...items, toCartItem(product)];
  }

  return items.map((item) =>
    item.slug === product.slug
      ? { ...item, quantity: item.quantity + 1 }
      : item,
  );
}

export function updateCartItemQuantity(items, slug, quantity) {
  if (!slug) {
    return items;
  }

  const nextQuantity = Math.floor(quantity);

  if (nextQuantity <= 0) {
    return removeCartItem(items, slug);
  }

  return items.map((item) =>
    item.slug === slug ? { ...item, quantity: nextQuantity } : item,
  );
}

export function removeCartItem(items, slug) {
  return items.filter((item) => item.slug !== slug);
}

export function getCartCount(items) {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function getCartSubtotal(items) {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
}

export function parseStoredCart(value) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (item) =>
          item &&
          typeof item.slug === "string" &&
          typeof item.name === "string" &&
          typeof item.price === "number",
      )
      .map((item) => ({
        slug: item.slug,
        name: item.name,
        price: item.price,
        badge: typeof item.badge === "string" ? item.badge : "",
        quantity: sanitizeQuantity(item.quantity),
      }));
  } catch {
    return [];
  }
}

export function serializeCart(items) {
  return JSON.stringify(items);
}
```

- [ ] **Step 4: Re-run the test suite and baseline checks**

Run:
```bash
npm run test -- tests/lib/cart.test.js
npm run lint
```

Expected:
- The new cart helper suite passes.
- ESLint stays green after adding the new module and test file.

- [ ] **Step 5: Commit the cart helper layer**

Run:
```bash
git add src/lib/cart.js tests/lib/cart.test.js
git commit -m "feat: add cart helper module"
```

---

### Task 2: Add a shared cart provider and move the header into the global layout

**Files:**
- Create: `src/components/cart-provider.js`
- Create: `src/components/cart-status-link.js`
- Modify: `src/app/layout.js`
- Modify: `src/app/page.js`
- Modify: `src/components/site-header.js`

- [ ] **Step 1: Create the client-side provider that hydrates from `localStorage`**

Create `src/components/cart-provider.js` with this code:

```js
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  CART_STORAGE_KEY,
  addCartItem,
  getCartCount,
  getCartSubtotal,
  parseStoredCart,
  removeCartItem,
  serializeCart,
  updateCartItemQuantity,
} from "@/lib/cart";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const storedCart = window.localStorage.getItem(CART_STORAGE_KEY);
    setItems(parseStoredCart(storedCart));
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(CART_STORAGE_KEY, serializeCart(items));
  }, [isHydrated, items]);

  function addToCart(product) {
    setItems((currentItems) => addCartItem(currentItems, product));
  }

  function updateQuantity(slug, quantity) {
    setItems((currentItems) =>
      updateCartItemQuantity(currentItems, slug, quantity),
    );
  }

  function removeFromCart(slug) {
    setItems((currentItems) => removeCartItem(currentItems, slug));
  }

  return (
    <CartContext.Provider
      value={{
        items,
        isHydrated,
        cartCount: getCartCount(items),
        subtotal: getCartSubtotal(items),
        addToCart,
        updateQuantity,
        removeFromCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
}
```

- [ ] **Step 2: Add a small cart count link and promote the header to the layout**

Create `src/components/cart-status-link.js`:

```js
"use client";

import Link from "next/link";
import { useCart } from "@/components/cart-provider";

export function CartStatusLink() {
  const { cartCount } = useCart();

  return (
    <Link href="/cart" className="cart-status-link" aria-label="Mở giỏ hàng">
      <span>Giỏ hàng</span>
      <strong>{cartCount}</strong>
    </Link>
  );
}
```

Update `src/components/site-header.js`:

```js
import Link from "next/link";
import { CartStatusLink } from "@/components/cart-status-link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-shell site-header__inner">
        <Link href="/" className="site-brand">
          MiniShop
        </Link>

        <nav className="site-nav" aria-label="Primary">
          <Link href="/products">Tất cả sản phẩm</Link>
          <CartStatusLink />
          <a href="/#featured">Sản phẩm nổi bật</a>
          <a href="/#story">Câu chuyện</a>
          <a href="/#contact">Liên hệ</a>
        </nav>
      </div>
    </header>
  );
}
```

Update `src/app/layout.js`:

```js
import "./globals.css";
import { Inter, Space_Grotesk } from "next/font/google";
import { CartProvider } from "@/components/cart-provider";
import { SiteHeader } from "@/components/site-header";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata = {
  title: "MiniShop | Sneaker Store",
  description: "Landing page course project cho MiniShop.",
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

Update `src/app/page.js` so it no longer renders a second header:

```js
import { HeroSection } from "@/components/hero-section";
import { FeaturedProducts } from "@/components/featured-products";
import { featuredProducts } from "@/lib/products";

export default function HomePage() {
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

- [ ] **Step 3: Re-run the app-level checks after introducing the provider boundary**

Run:
```bash
npm run test -- tests/lib/cart.test.js
npm run lint
npm run build
```

Expected:
- The provider compiles as a client component.
- The layout renders `SiteHeader` across all routes without duplicate header output on `/`.
- Build succeeds with the new server-to-client boundary in `layout.js`.

- [ ] **Step 4: Commit the provider and shared shell work**

Run:
```bash
git add src/components/cart-provider.js src/components/cart-status-link.js src/components/site-header.js src/app/layout.js src/app/page.js
git commit -m "feat: add shared cart provider"
```

---

### Task 3: Add an `AddToCartButton` on the product detail page

**Files:**
- Create: `src/components/add-to-cart-button.js`
- Modify: `src/app/products/[slug]/page.js`

- [ ] **Step 1: Create a dedicated client button component for cart writes**

Create `src/components/add-to-cart-button.js` with this code:

```js
"use client";

import { useCart } from "@/components/cart-provider";

export function AddToCartButton({ product }) {
  const { addToCart } = useCart();
  const isDisabled = !product.inStock;

  return (
    <button
      type="button"
      className="button button--primary"
      disabled={isDisabled}
      onClick={() => addToCart(product)}
    >
      {isDisabled ? "Hết hàng" : "Thêm vào giỏ"}
    </button>
  );
}
```

- [ ] **Step 2: Mount the button on the detail page next to cart navigation**

Update `src/app/products/[slug]/page.js` to this shape:

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

export function generateStaticParams() {
  return getProductSlugs();
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

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
  const product = getProductBySlug(slug);

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

- [ ] **Step 3: Verify the add-to-cart entry point compiles**

Run:
```bash
npm run lint
npm run build
```

Expected:
- The server detail page can import the client button without a boundary error.
- The product detail route still builds for all product slugs.

- [ ] **Step 4: Commit the detail-page cart CTA**

Run:
```bash
git add src/components/add-to-cart-button.js src/app/products/[slug]/page.js
git commit -m "feat: add cart button to detail page"
```

---

### Task 4: Build the `/cart` page and add cart-specific styles

**Files:**
- Create: `src/components/cart-page-content.js`
- Create: `src/app/cart/page.js`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Create the cart route shell and the client cart UI**

Create `src/app/cart/page.js`:

```js
import { CartPageContent } from "@/components/cart-page-content";

export const metadata = {
  title: "MiniShop | Giỏ hàng",
  description: "Giỏ hàng frontend lưu bằng state, context và localStorage.",
};

export default function CartPage() {
  return <CartPageContent />;
}
```

Create `src/components/cart-page-content.js`:

```js
"use client";

import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { formatVnd } from "@/lib/format-vnd";

export function CartPageContent() {
  const {
    items,
    cartCount,
    subtotal,
    isHydrated,
    updateQuantity,
    removeFromCart,
  } = useCart();

  if (!isHydrated) {
    return (
      <main className="cart-page">
        <section className="cart-page__hero">
          <div className="site-shell">
            <p className="cart-page__eyebrow">Cart</p>
            <h1>Đang tải giỏ hàng...</h1>
          </div>
        </section>
      </main>
    );
  }

  if (!items.length) {
    return (
      <main className="cart-page">
        <section className="cart-page__hero">
          <div className="site-shell cart-empty">
            <p className="cart-page__eyebrow">Cart</p>
            <h1>Giỏ hàng đang trống</h1>
            <p>
              Hãy quay lại trang sản phẩm, chọn một đôi giày và thêm vào cart để
              học tiếp flow frontend của buổi 4.
            </p>
            <Link href="/products" className="button button--primary">
              Đi đến danh sách sản phẩm
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="cart-page">
      <section className="cart-page__hero">
        <div className="site-shell">
          <p className="cart-page__eyebrow">Cart</p>
          <h1>{cartCount} sản phẩm trong giỏ hàng</h1>
          <p className="cart-page__description">
            Trang này minh họa state dùng chung qua Context API và dữ liệu tạm
            thời được lưu ở `localStorage`.
          </p>
        </div>
      </section>

      <section className="cart-page__content">
        <div className="site-shell cart-page__grid">
          <div className="cart-page__list">
            {items.map((item) => (
              <article key={item.slug} className="cart-line">
                <div className="cart-line__copy">
                  <p className="cart-line__eyebrow">
                    {item.badge || "Cart item"}
                  </p>
                  <h2>{item.name}</h2>
                  <p>{formatVnd(item.price)} / sản phẩm</p>
                </div>

                <label className="cart-line__quantity">
                  <span>Số lượng</span>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(event) =>
                      updateQuantity(item.slug, Number(event.target.value))
                    }
                  />
                </label>

                <div className="cart-line__meta">
                  <strong>{formatVnd(item.price * item.quantity)}</strong>
                  <button
                    type="button"
                    className="cart-line__remove"
                    onClick={() => removeFromCart(item.slug)}
                  >
                    Xóa
                  </button>
                </div>
              </article>
            ))}
          </div>

          <aside className="cart-summary">
            <p className="cart-summary__eyebrow">Tóm tắt đơn hàng</p>
            <h2>Tổng frontend của buổi 4</h2>

            <div className="cart-summary__row">
              <span>Số lượng</span>
              <strong>{cartCount}</strong>
            </div>

            <div className="cart-summary__row">
              <span>Tạm tính</span>
              <strong>{formatVnd(subtotal)}</strong>
            </div>

            <div className="cart-summary__row cart-summary__row--total">
              <span>Tổng cộng</span>
              <strong>{formatVnd(subtotal)}</strong>
            </div>

            <p className="cart-summary__note">
              Chưa có shipping fee hay checkout backend ở milestone này.
            </p>

            <Link href="/products" className="button button--secondary">
              Tiếp tục mua hàng
            </Link>
          </aside>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Add cart header, cart layout, and disabled-button styles to `globals.css`**

Append these CSS blocks to `src/app/globals.css`:

```css
.site-nav {
  align-items: center;
}

.cart-status-link {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--text);
  font-weight: 600;
}

.cart-status-link strong {
  display: inline-grid;
  place-items: center;
  min-width: 28px;
  min-height: 28px;
  padding: 0 8px;
  border-radius: 999px;
  background: var(--text);
  color: #fff;
  font-size: 0.85rem;
}

.button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
  transform: none;
}

.product-detail__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
}

.cart-page {
  padding: 40px 0 72px;
}

.cart-page__hero {
  padding: 28px 0 24px;
}

.cart-page__eyebrow,
.cart-summary__eyebrow,
.cart-line__eyebrow {
  margin: 0 0 12px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.78rem;
  color: var(--accent);
}

.cart-page__hero h1,
.cart-summary h2,
.cart-empty h1 {
  margin: 0;
  font-family: var(--font-space-grotesk), Arial, sans-serif;
  line-height: 0.96;
  letter-spacing: -0.05em;
}

.cart-page__hero h1,
.cart-empty h1 {
  font-size: clamp(2.4rem, 5vw, 4.8rem);
}

.cart-page__description,
.cart-empty p,
.cart-line__copy p,
.cart-summary__note {
  color: var(--muted);
  line-height: 1.7;
}

.cart-page__description {
  max-width: 62ch;
  margin: 16px 0 0;
}

.cart-page__content {
  padding-top: 12px;
}

.cart-page__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.65fr);
  gap: 24px;
  align-items: start;
}

.cart-page__list,
.cart-summary,
.cart-empty {
  border: 1px solid var(--border);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: var(--shadow);
}

.cart-page__list,
.cart-summary {
  padding: 24px;
}

.cart-empty {
  max-width: 680px;
  padding: 36px 32px;
}

.cart-empty .button {
  margin-top: 20px;
}

.cart-line {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 140px 120px;
  gap: 18px;
  align-items: center;
  padding: 18px 0;
  border-top: 1px solid var(--border);
}

.cart-line:first-child {
  padding-top: 0;
  border-top: 0;
}

.cart-line:last-child {
  padding-bottom: 0;
}

.cart-line__copy h2 {
  margin: 0;
  font-size: 1.15rem;
}

.cart-line__copy p {
  margin: 10px 0 0;
}

.cart-line__quantity {
  display: grid;
  gap: 8px;
  color: var(--muted);
  font-size: 0.92rem;
}

.cart-line__quantity input {
  width: 100%;
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #fff;
}

.cart-line__meta {
  display: grid;
  justify-items: end;
  gap: 10px;
}

.cart-line__remove {
  border: 0;
  padding: 0;
  background: transparent;
  color: #7f1d1d;
  font-weight: 600;
  cursor: pointer;
}

.cart-summary h2 {
  font-size: clamp(1.6rem, 3vw, 2.2rem);
}

.cart-summary__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 0;
  border-top: 1px solid var(--border);
}

.cart-summary__row--total {
  font-size: 1.08rem;
}

.cart-summary__note {
  margin: 14px 0 22px;
}

@media (max-width: 960px) {
  .cart-page__grid {
    grid-template-columns: 1fr;
  }

  .cart-line {
    grid-template-columns: 1fr;
    justify-items: start;
  }

  .cart-line__meta {
    justify-items: start;
  }
}

@media (max-width: 640px) {
  .cart-empty {
    padding: 28px 22px;
  }
}
```

- [ ] **Step 3: Run the full verification stack and do the browser smoke test**

Run:
```bash
npm run test -- tests/lib/cart.test.js
npm run lint
npm run build
npm run dev
```

Expected:
- `npm run test`, `npm run lint`, and `npm run build` all pass.
- On `/products/air-runner-basic`, clicking `Thêm vào giỏ` increments the cart badge in the header.
- On `/cart`, editing the quantity input updates count and subtotal immediately.
- Clicking `Xóa` removes a line.
- Reloading `/cart` keeps the cart because state rehydrates from `localStorage`.
- Removing the last item reveals the empty state.

- [ ] **Step 4: Commit the cart route and UI**

Run:
```bash
git add src/components/cart-page-content.js src/app/cart/page.js src/app/globals.css
git commit -m "feat: add cart page"
```

---

### Task 5: Final verification pass and teaching handoff

**Files:**
- Modify if needed after verification: `src/lib/cart.js`
- Modify if needed after verification: `src/components/cart-provider.js`
- Modify if needed after verification: `src/components/cart-page-content.js`
- Modify if needed after verification: `src/app/products/[slug]/page.js`
- Modify if needed after verification: `src/app/globals.css`

- [ ] **Step 1: Check the milestone against the buổi 4 acceptance criteria**

Confirm these behaviors manually:
- Adding from the detail page increases the cart count in the header.
- `/cart` supports update and remove without a full page reload.
- Reloading the page preserves the cart state from `localStorage`.
- Empty cart UI appears when the last item is removed.
- Count and subtotal stay correct after multiple edits.

- [ ] **Step 2: Run the final verification commands**

Run:
```bash
npm run test
npm run lint
npm run build
```

Expected:
- The full test suite passes, including `tests/lib/products.test.js` and `tests/lib/cart.test.js`.
- Lint passes across server and client files.
- Production build succeeds with the shared provider and new `/cart` route.

- [ ] **Step 3: Commit the verification polish**

Run:
```bash
git add src/lib/cart.js tests/lib/cart.test.js src/components/cart-provider.js src/components/cart-status-link.js src/components/add-to-cart-button.js src/components/cart-page-content.js src/components/site-header.js src/app/layout.js src/app/page.js src/app/products/[slug]/page.js src/app/cart/page.js src/app/globals.css
git commit -m "chore: finish buoi 4 cart frontend"
```

---

## Teaching Notes

### Lesson outline

1. Warm-up: hỏi "giỏ hàng nên sống ở đâu: server, state hay browser?"
2. Concept 1: vì sao cart cần Client Component thay vì chỉ Server Component.
3. Concept 2: `useState` giữ cart hiện tại còn `useEffect` lo phần persist.
4. Concept 3: Context API giúp nút thêm giỏ, header badge, và cart page dùng cùng state mà không cần prop drilling.
5. Demo: tạo `cart.js`, `CartProvider`, `AddToCartButton`, rồi `/cart`.
6. Checkpoint: reload `/cart` để xác nhận state còn trong browser.
7. Practice: update số lượng, xóa item, đọc subtotal và empty state.
8. Review: phân biệt source of truth tạm thời ở browser với source of truth thật ở backend buổi sau.

### Speaker notes

- Mở đầu bằng câu hỏi UX: nếu refresh mà cart biến mất thì người dùng có tin cửa hàng không.
- Nhấn mạnh `localStorage` chỉ là nơi lưu tạm trên máy người dùng, không thay thế database.
- Khi dạy `useEffect`, giải thích đây là nơi đồng bộ side effect sau render, không phải nơi dựng UI.
- Nói rõ Context API là "trạm phát state chung", còn helper trong `src/lib/cart.js` là nơi giữ logic thuần để test.
- Chốt phạm vi milestone: frontend cart hoàn chỉnh ở mức browser, chưa có shipping thật, checkout thật, hay order persistence.

### Quick check

- Vì sao `CartProvider` phải là Client Component?
- Vì sao helper cart nên tách ra `src/lib/cart.js` thay vì nhét hết vào provider?
- Khi reload trang mà cart còn, dữ liệu đó đang nằm ở đâu?
- Khi nào nên chuyển cart từ `localStorage` sang backend thật?

### Misconception traps

- Context API không tự lưu dữ liệu sau reload; phần persist đến từ `localStorage`.
- `localStorage` không dùng được trực tiếp trong Server Component.
- Cart count trong header không nên được hard-code hoặc truyền props xuyên suốt cây component.
- `useEffect` không phải chỗ để tính subtotal; subtotal nên là giá trị suy ra từ state hiện tại.
- Reload còn cart không có nghĩa là đã có checkout hay order thật.

## Homework Extensions

### Bài tập 1: Clear cart

- Thêm helper này vào `src/lib/cart.js`:

```js
export function clearCart() {
  return [];
}
```

- Expose action này từ `src/components/cart-provider.js`:

```js
function clearAllItems() {
  setItems([]);
}

// trong value
clearCart: clearAllItems,
```

- Gắn nút vào `src/components/cart-page-content.js`:

```js
const { clearCart } = useCart();

<button
  type="button"
  className="button button--secondary"
  onClick={clearCart}
>
  Xóa toàn bộ giỏ hàng
</button>
```

### Bài tập 2: Fake shipping fee

- Thêm constant và total tính từ subtotal trong `src/components/cart-page-content.js`:

```js
const SHIPPING_FEE = 30000;
const total = subtotal + SHIPPING_FEE;
```

- Render thêm hai dòng trong phần summary:

```js
<div className="cart-summary__row">
  <span>Phí vận chuyển</span>
  <strong>{formatVnd(SHIPPING_FEE)}</strong>
</div>

<div className="cart-summary__row cart-summary__row--total">
  <span>Tổng cộng</span>
  <strong>{formatVnd(total)}</strong>
</div>
```

## Spec Coverage Check

- `state + context + localStorage`: covered by Task 1 and Task 2.
- `CartProvider`: covered by Task 2.
- `AddToCartButton`: covered by Task 3.
- `/cart`: covered by Task 4.
- Add/update/remove/total/empty state: covered by Task 4 and Task 5 verification.
- Persist after reload and correct quantity/subtotal updates: covered by Task 4 smoke test and Task 5 acceptance pass.
