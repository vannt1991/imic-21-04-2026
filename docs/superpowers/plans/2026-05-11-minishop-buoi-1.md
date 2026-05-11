# MiniShop Buổi 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first MiniShop landing page in JavaScript: global shell, header, hero, featured products, and a clean responsive homepage.

**Architecture:** Keep the App Router starter structure, but replace the default scaffold with a small set of focused presentational components. `src/app/layout.js` owns document metadata and global CSS, `src/app/page.js` composes the page and provides static featured-product data, and `src/components/*` contains reusable UI blocks with one responsibility each. No DB, no client state, no routing beyond `/` yet.

**Tech Stack:** Next.js App Router, React 19, JavaScript, CSS Modules/global CSS, `next/link`, optional `next/font/google` for typography.

---

## Current Codebase Notes

- `src/app/page.js` is still the create-next-app starter page.
- `src/app/layout.js` is still the starter layout and metadata.
- `src/app/globals.css` is the starter global stylesheet.
- `src/app/page.module.css` exists from the starter template and will be unused after this milestone.

## File Map

- Create: `src/components/site-header.js`
- Create: `src/components/hero-section.js`
- Create: `src/components/product-card.js`
- Create: `src/components/featured-products.js`
- Modify: `src/app/layout.js`
- Modify: `src/app/page.js`
- Modify: `src/app/globals.css`
- Optional delete after verification: `src/app/page.module.css`

## Verification Strategy

- Use `npm run lint` to catch JSX/import/style issues.
- Use `npm run build` to catch App Router, metadata, and import problems.
- Smoke test in browser at `/` to confirm the landing page is visually complete and responsive.

---

### Task 1: Replace the starter document shell

**Files:**
- Modify: `src/app/layout.js`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Capture the baseline**

Run:
```bash
npm run lint
npm run build
```

Expected:
- Both commands pass on the starter app before changes.

- [ ] **Step 2: Replace the starter layout with a MiniShop shell**

Use this layout structure:

```js
import "./globals.css";
import { Inter, Space_Grotesk } from "next/font/google";

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
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Replace starter globals with a page-level design system**

Use this baseline:

```css
:root {
  --bg: #f5efe6;
  --surface: #fffaf3;
  --surface-strong: #ffffff;
  --text: #1f1a17;
  --muted: #675e57;
  --accent: #c2410c;
  --accent-strong: #9a3412;
  --border: rgba(31, 26, 23, 0.12);
  --shadow: 0 24px 60px rgba(31, 26, 23, 0.12);
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(194, 65, 12, 0.12), transparent 30%),
    linear-gradient(180deg, #fffaf3 0%, #f5efe6 100%);
  color: var(--text);
  font-family: var(--font-inter), Arial, sans-serif;
}

a {
  color: inherit;
  text-decoration: none;
}

button,
input,
textarea,
select {
  font: inherit;
}

.site-shell {
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto;
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
- Build succeeds with the new metadata and global CSS.

- [ ] **Step 5: Commit the shell change**

Run:
```bash
git add src/app/layout.js src/app/globals.css
git commit -m "feat: replace starter shell with minishop foundation"
```

---

### Task 2: Build the header and hero sections

**Files:**
- Create: `src/components/site-header.js`
- Create: `src/components/hero-section.js`
- Modify: `src/app/page.js`

- [ ] **Step 1: Write the basic component contract**

`SiteHeader` renders the top navigation.

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
          <a href="#story">Câu chuyện</a>
          <a href="#contact">Liên hệ</a>
        </nav>
      </div>
    </header>
  );
}
```

`HeroSection` introduces the store and drives the first CTA.

```js
export function HeroSection() {
  return (
    <section className="hero">
      <div className="hero__content">
        <p className="hero__eyebrow">New Collection 2026</p>
        <h1>Giày sneaker hiện đại cho nhịp sống mỗi ngày</h1>
        <p className="hero__description">
          Khám phá các mẫu sneaker dễ phối đồ, bền, êm và đủ nổi bật để học
          viên thấy ngay cấu trúc của một landing page bán hàng.
        </p>

        <div className="hero__actions">
          <a className="button button--primary" href="#featured">
            Xem sản phẩm nổi bật
          </a>
          <a className="button button--secondary" href="#story">
            Vì sao chọn MiniShop
          </a>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Replace the starter homepage with composition**

Use this page skeleton:

```js
import { SiteHeader } from "@/components/site-header";
import { HeroSection } from "@/components/hero-section";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <HeroSection />
      </main>
    </>
  );
}
```

- [ ] **Step 3: Make sure the page still builds**

Run:
```bash
npm run lint
npm run build
```

Expected:
- Imports resolve.
- Header and hero render on `/`.

- [ ] **Step 4: Commit the header/hero work**

Run:
```bash
git add src/app/page.js src/components/site-header.js src/components/hero-section.js
git commit -m "feat: add minishop header and hero"
```

---

### Task 3: Add featured products and reusable product cards

**Files:**
- Create: `src/components/product-card.js`
- Create: `src/components/featured-products.js`
- Modify: `src/app/page.js`

- [ ] **Step 1: Define the reusable product card**

`ProductCard` renders one static card for the first milestone.

```js
export function ProductCard({ product }) {
  return (
    <article className="product-card">
      <div className="product-card__image" aria-hidden="true">
        <span>{product.badge}</span>
      </div>

      <div className="product-card__body">
        <p className="product-card__category">{product.category}</p>
        <h2 className="product-card__name">{product.name}</h2>
        <p className="product-card__description">{product.description}</p>

        <div className="product-card__footer">
          <strong>{product.priceLabel}</strong>
          <span>{product.note}</span>
        </div>
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Define the featured section as a data-driven wrapper**

`FeaturedProducts` owns the section layout and maps the cards.

```js
import { ProductCard } from "@/components/product-card";

export function FeaturedProducts({ products }) {
  return (
    <section className="featured" id="featured">
      <div className="site-shell">
        <div className="section-heading">
          <p className="section-heading__eyebrow">Sản phẩm nổi bật</p>
          <h2>3 mẫu cơ bản để học cách render list bằng component</h2>
        </div>

        <div className="featured__grid">
          {products.map((product) => (
            <ProductCard key={product.name} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Feed static featured data from the homepage**

Use this local array in `src/app/page.js`:

```js
const featuredProducts = [
  {
    name: "Air Runner Basic",
    category: "Running",
    badge: "Bestseller",
    description: "Mẫu sneaker gọn nhẹ, phù hợp cho buổi học đầu tiên.",
    priceLabel: "1.290.000đ",
    note: "Dễ phối đồ",
  },
  {
    name: "Street Flex Pro",
    category: "Lifestyle",
    badge: "New",
    description: "Thiết kế nổi bật hơn, hợp với phong cách streetwear.",
    priceLabel: "1.890.000đ",
    note: "Phối outfit nhanh",
  },
  {
    name: "Court Classic White",
    category: "Classic",
    badge: "Sale",
    description: "Một đôi basic sạch, đơn giản, dễ dùng hằng ngày.",
    priceLabel: "990.000đ",
    note: "Giá dễ tiếp cận",
  },
];
```

Then compose:

```js
import { SiteHeader } from "@/components/site-header";
import { HeroSection } from "@/components/hero-section";
import { FeaturedProducts } from "@/components/featured-products";

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

- [ ] **Step 4: Add homepage section anchors and visual spacing**

Extend the homepage with simple anchor sections so the nav links work:

```js
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
```

- [ ] **Step 5: Re-run compile checks**

Run:
```bash
npm run lint
npm run build
```

Expected:
- Homepage composes cleanly.
- Featured cards render 3 items.

- [ ] **Step 6: Commit the homepage composition**

Run:
```bash
git add src/app/page.js src/components/product-card.js src/components/featured-products.js
git commit -m "feat: add minishop featured products"
```

---

### Task 4: Polish, smoke test, and cleanup

**Files:**
- Modify: `src/app/globals.css` if spacing or section styles need final tuning
- Optional delete: `src/app/page.module.css`

- [ ] **Step 1: Tune spacing and responsive behavior**

Add the section and card styles needed by the components above. Keep the CSS co-located in `globals.css` for this milestone so the page is easy to inspect.

```css
.site-header {
  position: sticky;
  top: 0;
  z-index: 20;
  backdrop-filter: blur(14px);
  background: rgba(245, 239, 230, 0.78);
  border-bottom: 1px solid var(--border);
}

.site-header__inner {
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.site-brand {
  font-family: var(--font-space-grotesk), Arial, sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
}

.site-nav {
  display: flex;
  gap: 18px;
  color: var(--muted);
}

.site-nav a:hover,
.site-brand:hover {
  color: var(--accent);
}

.hero {
  padding: 80px 0 56px;
}

.hero__content {
  width: min(720px, 100%);
}

.hero__eyebrow,
.section-heading__eyebrow,
.product-card__category {
  margin: 0 0 12px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.78rem;
  color: var(--accent);
}

.hero h1,
.section-heading h2 {
  margin: 0;
  font-family: var(--font-space-grotesk), Arial, sans-serif;
  line-height: 0.96;
}

.hero h1 {
  max-width: 12ch;
  font-size: clamp(3rem, 7vw, 6.5rem);
}

.hero__description {
  max-width: 56ch;
  margin: 20px 0 0;
  color: var(--muted);
  font-size: 1.05rem;
  line-height: 1.7;
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 18px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-weight: 600;
  transition: transform 120ms ease, border-color 120ms ease, background 120ms ease;
}

.button:hover {
  transform: translateY(-1px);
}

.button--primary {
  background: var(--text);
  color: #fff;
}

.button--secondary {
  border-color: var(--border);
  background: rgba(255, 255, 255, 0.5);
}

.featured {
  padding: 24px 0 72px;
}

.section-heading {
  display: grid;
  gap: 8px;
  margin-bottom: 24px;
}

.section-heading h2 {
  font-size: clamp(1.8rem, 3vw, 2.6rem);
}

.featured__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

.product-card {
  border: 1px solid var(--border);
  border-radius: 24px;
  overflow: hidden;
  background: var(--surface-strong);
  box-shadow: var(--shadow);
}

.product-card__image {
  min-height: 180px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, rgba(194, 65, 12, 0.18), rgba(255, 255, 255, 0.8));
}

.product-card__image span {
  display: inline-flex;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.8);
  font-size: 0.82rem;
  font-weight: 700;
}

.product-card__body {
  padding: 18px;
}

.product-card__name {
  margin: 0;
  font-size: 1.2rem;
}

.product-card__description {
  margin: 10px 0 0;
  color: var(--muted);
  line-height: 1.6;
}

.product-card__footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-top: 16px;
  font-size: 0.92rem;
}

.story,
.contact {
  padding: 20px 0 64px;
}

@media (max-width: 900px) {
  .featured__grid {
    grid-template-columns: 1fr;
  }

  .site-header__inner {
    flex-direction: column;
    align-items: flex-start;
  }

  .hero {
    padding-top: 56px;
  }
}
```

- [ ] **Step 2: Run a browser smoke test**

Run the app:
```bash
npm run dev
```

Expected:
- `/` shows a branded landing page.
- Header nav anchors scroll to page sections.
- Hero CTA jumps to featured products.
- Three static cards are visible and responsive.

- [ ] **Step 3: Remove unused starter CSS module if it is no longer referenced**

Delete:
```bash
src/app/page.module.css
```

Only do this after confirming `src/app/page.js` no longer imports it.

- [ ] **Step 4: Final verification**

Run:
```bash
npm run lint
npm run build
```

Expected:
- Lint passes.
- Production build passes.
- No unused import / missing file issues remain.

- [ ] **Step 5: Commit the polished buổi 1 state**

Run:
```bash
git add src/app/layout.js src/app/page.js src/app/globals.css src/components/site-header.js src/components/hero-section.js src/components/product-card.js src/components/featured-products.js
git commit -m "chore: finish minishop session one"
```

---

## Acceptance Criteria

- `/` renders a branded MiniShop landing page instead of the default Next.js starter.
- The page has a header, hero, featured products section, and at least one extra anchor section.
- The three featured product cards are rendered from data, not copied manually in JSX.
- The page passes `npm run lint` and `npm run build`.
- The page is visually readable on desktop and mobile.

## Gaps Left For Buổi 2+

- No `/products` listing route yet.
- No dynamic product detail route yet.
- No cart, DB, API, admin, or checkout logic yet.
- No data fetching, state management, or auth yet.
