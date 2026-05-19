# MiniShop Buổi 7 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first MiniShop admin dashboard so instructors and learners can create, edit, and delete products from `/admin/products` with Next.js Server Components and Server Actions, while keeping the storefront synced after each mutation.

**Architecture:** Keep admin routes under `src/app/admin/*` as server-rendered pages. Add `src/lib/admin-products.js` for admin read queries and `src/lib/admin-product-form.js` for `FormData` normalization so Server Actions can reuse the existing buổi 6 Zod schemas in `src/lib/product-api.js`. Put all writes in `src/app/admin/products/actions.js`, then call `revalidatePath()` for admin/storefront routes and `redirect()` back to the product list after create/update/delete.

**Tech Stack:** Next.js 16 App Router, React 19, JavaScript, Prisma ORM, SQLite, Zod, Vitest, Server Actions, `revalidatePath`, `redirect`, global CSS.

---

## Current Codebase Notes

- Buổi 6 already shipped Prisma-backed product/category APIs plus reusable `productCreateSchema`, `productUpdateSchema`, `toProductCreateData`, and `toProductUpdateData` in `src/lib/product-api.js`.
- Storefront routes (`/`, `/products`, `/products/[slug]`) still read through `src/lib/products.js`, so admin mutations must preserve that read shape instead of replacing it.
- `src/app/products/[slug]/page.js` uses `generateStaticParams()`, so edit/delete actions should revalidate affected detail paths when a slug changes or a product is removed.
- The app already has a shared header in `src/components/site-header.js`; adding one admin entry point there is enough for discovery until buổi 9 introduces auth/protected routes.
- No `/admin` routes, admin components, or admin styles exist yet.
- `src/app/globals.css` already defines shell, buttons, cards, and page-level spacing; extend it instead of introducing a second styling system.

## File Map

- Create: `src/lib/admin-product-form.js`
- Create: `tests/lib/admin-product-form.test.js`
- Create: `src/lib/admin-products.js`
- Create: `src/app/admin/layout.js`
- Create: `src/app/admin/page.js`
- Create: `src/app/admin/products/actions.js`
- Create: `src/app/admin/products/page.js`
- Create: `src/app/admin/products/new/page.js`
- Create: `src/app/admin/products/[id]/edit/page.js`
- Create: `src/components/admin-product-form.js`
- Create: `src/components/delete-product-button.js`
- Modify: `src/components/site-header.js`
- Modify: `src/app/globals.css`

## Verification Strategy

- Use `npm run test -- tests/lib/admin-product-form.test.js` for the pure `FormData` normalization helper.
- Use `npm run test -- tests/app/api-routes.test.js` after admin work to ensure buổi 6 APIs still behave the same.
- Use `npm run lint` to catch App Router, imports, and client/server boundary mistakes.
- Use `npm run build` to catch route segment errors, action wiring mistakes, and dynamic `[id]` page issues.
- Use `npm run db:seed` before manual browser testing so `/admin/products` has predictable products/categories.
- Smoke test `/admin`, `/admin/products`, `/admin/products/new`, `/admin/products/<id>/edit`, `/products`, and `/products/<slug>` while `npm run dev` is running.

---

### Task 1: Add pure admin form helpers with Vitest coverage

**Files:**
- Create: `src/lib/admin-product-form.js`
- Create: `tests/lib/admin-product-form.test.js`

- [ ] **Step 1: Write the helper tests first**

Create `tests/lib/admin-product-form.test.js` with this suite:

```js
import { describe, expect, it } from "vitest";
import {
  readProductFormPayload,
  toProductFormValues,
} from "../../src/lib/admin-product-form.js";

function createFormData(fields) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    if (value === true) {
      formData.set(key, "on");
      continue;
    }

    if (value === false || value === undefined || value === null) {
      continue;
    }

    formData.set(key, String(value));
  }

  return formData;
}

describe("admin product form helpers", () => {
  it("normalizes form fields into the payload expected by product schemas", () => {
    const payload = readProductFormPayload(
      createFormData({
        name: "  Air Runner Pro  ",
        slug: " air-runner-pro ",
        description: "  Daily trainer for admin CRUD.  ",
        price: "1490000",
        originalPrice: "1790000",
        image: "   ",
        badge: "  Bestseller  ",
        note: "  Màu mới  ",
        stock: "5",
        featured: true,
        isActive: true,
        categorySlug: " running ",
      }),
    );

    expect(payload).toEqual({
      name: "Air Runner Pro",
      slug: "air-runner-pro",
      description: "Daily trainer for admin CRUD.",
      price: 1490000,
      originalPrice: 1790000,
      image: null,
      badge: "Bestseller",
      note: "Màu mới",
      stock: 5,
      featured: true,
      isActive: true,
      categorySlug: "running",
    });
  });

  it("treats blank optional fields as null and unchecked boxes as false", () => {
    const payload = readProductFormPayload(
      createFormData({
        name: "Court Classic",
        slug: "court-classic",
        description: "Retro court silhouette.",
        price: "990000",
        originalPrice: "",
        image: "",
        badge: "",
        note: "",
        stock: "0",
        categorySlug: "lifestyle",
      }),
    );

    expect(payload).toEqual({
      name: "Court Classic",
      slug: "court-classic",
      description: "Retro court silhouette.",
      price: 990000,
      originalPrice: null,
      image: null,
      badge: null,
      note: null,
      stock: 0,
      featured: false,
      isActive: false,
      categorySlug: "lifestyle",
    });
  });

  it("maps a product record into string defaults for the shared form", () => {
    expect(
      toProductFormValues({
        name: "Air Runner Basic",
        slug: "air-runner-basic",
        description: "Mẫu sneaker gọn nhẹ.",
        price: 1290000,
        originalPrice: null,
        image: null,
        badge: "New",
        note: null,
        stock: 12,
        featured: true,
        isActive: true,
        categorySlug: "running",
      }),
    ).toEqual({
      name: "Air Runner Basic",
      slug: "air-runner-basic",
      description: "Mẫu sneaker gọn nhẹ.",
      price: "1290000",
      originalPrice: "",
      image: "",
      badge: "New",
      note: "",
      stock: "12",
      featured: true,
      isActive: true,
      categorySlug: "running",
    });
  });
});
```

- [ ] **Step 2: Run the new test file to verify the helper does not exist yet**

Run:
```bash
npm run test -- tests/lib/admin-product-form.test.js
```

Expected:
- Vitest fails with a module-not-found error for `src/lib/admin-product-form.js`.

- [ ] **Step 3: Implement the `FormData` normalization helper**

Create `src/lib/admin-product-form.js` with this code:

```js
function getTrimmedString(formData, fieldName) {
  const value = formData.get(fieldName);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function getNullableString(formData, fieldName) {
  const value = getTrimmedString(formData, fieldName);

  return value.length > 0 ? value : null;
}

function getInteger(formData, fieldName) {
  const value = getTrimmedString(formData, fieldName);

  return Number.parseInt(value, 10);
}

function getNullableInteger(formData, fieldName) {
  const value = getNullableString(formData, fieldName);

  return value === null ? null : Number.parseInt(value, 10);
}

function getCheckboxValue(formData, fieldName) {
  return formData.get(fieldName) === "on";
}

export function readProductFormPayload(formData) {
  return {
    name: getTrimmedString(formData, "name"),
    slug: getTrimmedString(formData, "slug"),
    description: getTrimmedString(formData, "description"),
    price: getInteger(formData, "price"),
    originalPrice: getNullableInteger(formData, "originalPrice"),
    image: getNullableString(formData, "image"),
    badge: getNullableString(formData, "badge"),
    note: getNullableString(formData, "note"),
    stock: getInteger(formData, "stock"),
    featured: getCheckboxValue(formData, "featured"),
    isActive: getCheckboxValue(formData, "isActive"),
    categorySlug: getTrimmedString(formData, "categorySlug"),
  };
}

export function toProductFormValues(product) {
  return {
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    description: product?.description ?? "",
    price: product?.price?.toString() ?? "",
    originalPrice: product?.originalPrice?.toString() ?? "",
    image: product?.image ?? "",
    badge: product?.badge ?? "",
    note: product?.note ?? "",
    stock: product?.stock?.toString() ?? "0",
    featured: product?.featured ?? false,
    isActive: product?.isActive ?? true,
    categorySlug: product?.categorySlug ?? "",
  };
}
```

- [ ] **Step 4: Re-run the helper test**

Run:
```bash
npm run test -- tests/lib/admin-product-form.test.js
```

Expected:
- Vitest passes all `admin product form helpers` tests.

- [ ] **Step 5: Commit the form helper foundation**

Run:
```bash
git add src/lib/admin-product-form.js tests/lib/admin-product-form.test.js
git commit -m "feat: add admin product form helpers"
```

---

### Task 2: Add admin reads, shared admin layout, and the product list page

**Files:**
- Create: `src/lib/admin-products.js`
- Create: `src/app/admin/layout.js`
- Create: `src/app/admin/page.js`
- Create: `src/app/admin/products/page.js`
- Modify: `src/components/site-header.js`

- [ ] **Step 1: Add admin read helpers on top of Prisma**

Create `src/lib/admin-products.js` with this code:

```js
import { db } from "@/lib/db";

const categorySelect = {
  id: true,
  slug: true,
  name: true,
};

export async function getAdminCategories() {
  return db.category.findMany({
    select: categorySelect,
    orderBy: { name: "asc" },
  });
}

export async function getAdminProducts() {
  return db.product.findMany({
    include: {
      category: {
        select: categorySelect,
      },
    },
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
  });
}

export async function getAdminProductById(id) {
  if (!id) {
    return null;
  }

  return db.product.findUnique({
    where: { id },
    include: {
      category: {
        select: categorySelect,
      },
    },
  });
}
```

- [ ] **Step 2: Add the admin shell and list page**

Create `src/app/admin/layout.js` with this code:

```jsx
import Link from "next/link";

const adminLinks = [
  { href: "/admin", label: "Tổng quan" },
  { href: "/admin/products", label: "Sản phẩm" },
  { href: "/admin/products/new", label: "Tạo sản phẩm" },
];

export default function AdminLayout({ children }) {
  return (
    <div className="admin-layout">
      <aside className="admin-layout__sidebar">
        <div className="admin-layout__brand">
          <p className="admin-layout__eyebrow">MiniShop Admin</p>
          <h2>Quản trị catalog</h2>
          <p>
            Buổi 7 tập trung vào CRUD sản phẩm bằng Server Component và Server
            Action.
          </p>
        </div>

        <nav className="admin-layout__nav" aria-label="Admin">
          {adminLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="admin-layout__content">{children}</div>
    </div>
  );
}
```

Create `src/app/admin/page.js` with this code:

```jsx
import Link from "next/link";

export default function AdminHomePage() {
  return (
    <main className="admin-page">
      <section className="admin-page__hero">
        <p className="admin-page__eyebrow">Admin dashboard</p>
        <h1>Quản lý dữ liệu MiniShop từ server</h1>
        <p className="admin-page__description">
          Dùng khu vực này để tạo, sửa, và xóa sản phẩm mà không cần gọi API thủ
          công từ client.
        </p>
      </section>

      <section className="admin-shortcuts">
        <Link href="/admin/products" className="admin-shortcut-card">
          <h2>Danh sách sản phẩm</h2>
          <p>Xem toàn bộ catalog, trạng thái active, category, và tồn kho.</p>
        </Link>

        <Link href="/admin/products/new" className="admin-shortcut-card">
          <h2>Tạo sản phẩm mới</h2>
          <p>Submit form trực tiếp vào Server Action rồi quay lại trang list.</p>
        </Link>
      </section>
    </main>
  );
}
```

Create `src/app/admin/products/page.js` with this code:

```jsx
import Link from "next/link";
import { formatVnd } from "@/lib/format-vnd";
import { getAdminProducts } from "@/lib/admin-products";

export const metadata = {
  title: "MiniShop Admin | Products",
  description: "Quản trị sản phẩm cho MiniShop.",
};

export default async function AdminProductsPage() {
  const products = await getAdminProducts();

  return (
    <main className="admin-page">
      <section className="admin-page__hero admin-page__hero--split">
        <div>
          <p className="admin-page__eyebrow">Product CRUD</p>
          <h1>Quản lý sản phẩm</h1>
          <p className="admin-page__description">
            Trang này đọc trực tiếp từ Prisma bằng Server Component để admin luôn
            thấy dữ liệu mới nhất.
          </p>
        </div>

        <Link href="/admin/products/new" className="button button--primary">
          Tạo sản phẩm
        </Link>
      </section>

      <section className="admin-product-list">
        {products.map((product) => (
          <article key={product.id} className="admin-product-card">
            <div className="admin-product-card__copy">
              <p className="admin-page__eyebrow">{product.category.name}</p>
              <h2>{product.name}</h2>
              <p>/{product.slug}</p>
            </div>

            <dl className="admin-product-card__stats">
              <div>
                <dt>Giá</dt>
                <dd>{formatVnd(product.price)}</dd>
              </div>
              <div>
                <dt>Tồn kho</dt>
                <dd>{product.stock}</dd>
              </div>
              <div>
                <dt>Trạng thái</dt>
                <dd>{product.isActive ? "Đang bán" : "Ẩn"}</dd>
              </div>
            </dl>

            <div className="admin-product-card__actions">
              <Link
                href={`/admin/products/${product.id}/edit`}
                className="button button--secondary"
              >
                Sửa
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
```

Update `src/components/site-header.js` so the primary nav includes the admin entry:

```jsx
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
          <Link href="/admin/products">Admin</Link>
          <CartStatusLink />
          <Link href="/#featured">Sản phẩm nổi bật</Link>
          <Link href="/#story">Câu chuyện</Link>
          <Link href="/#contact">Liên hệ</Link>
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Verify the admin read pages compile**

Run:
```bash
npm run lint
npm run build
```

Expected:
- Both commands pass.
- `/admin` and `/admin/products` route segments compile cleanly.

- [ ] **Step 4: Smoke test the new read-only admin routes**

Run:
```bash
npm run db:seed
npm run dev
```

Then open:
- `http://localhost:3000/admin`
- `http://localhost:3000/admin/products`

Expected:
- The dashboard links render.
- The products page lists seeded products with edit links.

- [ ] **Step 5: Commit the admin read layer**

Run:
```bash
git add src/lib/admin-products.js src/app/admin/layout.js src/app/admin/page.js src/app/admin/products/page.js src/components/site-header.js
git commit -m "feat: add admin product listing"
```

---

### Task 3: Add the shared admin product form and create action

**Files:**
- Create: `src/components/admin-product-form.js`
- Create: `src/app/admin/products/actions.js`
- Create: `src/app/admin/products/new/page.js`

- [ ] **Step 1: Add the shared form component**

Create `src/components/admin-product-form.js` with this code:

```jsx
import Link from "next/link";

const emptyValues = {
  name: "",
  slug: "",
  description: "",
  price: "",
  originalPrice: "",
  image: "",
  badge: "",
  note: "",
  stock: "0",
  featured: false,
  isActive: true,
  categorySlug: "",
};

export function AdminProductForm({
  action,
  categories,
  initialValues = emptyValues,
  title,
  description,
  submitLabel,
}) {
  const values = { ...emptyValues, ...initialValues };

  return (
    <main className="admin-page">
      <section className="admin-page__hero">
        <p className="admin-page__eyebrow">Server Action Form</p>
        <h1>{title}</h1>
        <p className="admin-page__description">{description}</p>
      </section>

      <form action={action} className="admin-form">
        <label className="admin-field">
          <span>Tên sản phẩm</span>
          <input name="name" defaultValue={values.name} required />
        </label>

        <label className="admin-field">
          <span>Slug</span>
          <input name="slug" defaultValue={values.slug} required />
        </label>

        <label className="admin-field admin-field--full">
          <span>Mô tả</span>
          <textarea
            name="description"
            rows="4"
            defaultValue={values.description}
            required
          />
        </label>

        <label className="admin-field">
          <span>Giá bán</span>
          <input
            type="number"
            name="price"
            min="0"
            step="1"
            defaultValue={values.price}
            required
          />
        </label>

        <label className="admin-field">
          <span>Giá gốc</span>
          <input
            type="number"
            name="originalPrice"
            min="0"
            step="1"
            defaultValue={values.originalPrice}
          />
        </label>

        <label className="admin-field">
          <span>Tồn kho</span>
          <input
            type="number"
            name="stock"
            min="0"
            step="1"
            defaultValue={values.stock}
            required
          />
        </label>

        <label className="admin-field">
          <span>Category</span>
          <select name="categorySlug" defaultValue={values.categorySlug} required>
            <option value="">Chọn category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="admin-field">
          <span>Image</span>
          <input name="image" defaultValue={values.image} />
        </label>

        <label className="admin-field">
          <span>Badge</span>
          <input name="badge" defaultValue={values.badge} />
        </label>

        <label className="admin-field admin-field--full">
          <span>Note</span>
          <textarea name="note" rows="3" defaultValue={values.note} />
        </label>

        <div className="admin-form__checkboxes">
          <label>
            <input
              type="checkbox"
              name="featured"
              defaultChecked={values.featured}
            />
            <span>Hiển thị ở featured products</span>
          </label>

          <label>
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={values.isActive}
            />
            <span>Cho phép xuất hiện ở storefront</span>
          </label>
        </div>

        <div className="admin-form__actions">
          <button type="submit" className="button button--primary">
            {submitLabel}
          </button>
          <Link href="/admin/products" className="button button--secondary">
            Hủy
          </Link>
        </div>
      </form>
    </main>
  );
}
```

- [ ] **Step 2: Add the create action and the new-product page**

Create `src/app/admin/products/actions.js` with this code:

```js
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { readProductFormPayload } from "@/lib/admin-product-form";
import {
  productCreateSchema,
  toProductCreateData,
} from "@/lib/product-api";

async function resolveCategoryId(categorySlug) {
  const category = await db.category.findUnique({
    where: { slug: categorySlug },
    select: { id: true },
  });

  if (!category) {
    throw new Error("Category not found.");
  }

  return category.id;
}

function revalidateProductPaths(nextSlug, previousSlug = null) {
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin/products");

  if (previousSlug) {
    revalidatePath(`/products/${previousSlug}`);
  }

  if (nextSlug) {
    revalidatePath(`/products/${nextSlug}`);
  }
}

export async function createProductAction(formData) {
  const payload = productCreateSchema.parse(readProductFormPayload(formData));
  const categoryId = await resolveCategoryId(payload.categorySlug);
  const product = await db.product.create({
    data: toProductCreateData(payload, categoryId),
  });

  revalidateProductPaths(product.slug);
  redirect("/admin/products");
}
```

Create `src/app/admin/products/new/page.js` with this code:

```jsx
import { AdminProductForm } from "@/components/admin-product-form";
import { getAdminCategories } from "@/lib/admin-products";
import { createProductAction } from "../actions";

export const metadata = {
  title: "MiniShop Admin | New Product",
  description: "Tạo sản phẩm mới cho MiniShop.",
};

export default async function NewAdminProductPage() {
  const categories = await getAdminCategories();

  return (
    <AdminProductForm
      action={createProductAction}
      categories={categories}
      title="Tạo sản phẩm mới"
      description="Form này submit trực tiếp vào Server Action rồi revalidate storefront và admin list."
      submitLabel="Lưu sản phẩm"
    />
  );
}
```

- [ ] **Step 3: Verify create flow compiles**

Run:
```bash
npm run lint
npm run build
```

Expected:
- Both commands pass.
- No server-action serialization errors.

- [ ] **Step 4: Manually create one product through the new admin form**

Run:
```bash
npm run dev
```

Then submit `/admin/products/new` with:
- `name`: `Admin Flow Runner`
- `slug`: `admin-flow-runner`
- `description`: `Sản phẩm tạo từ server action ở buổi 7.`
- `price`: `1190000`
- `stock`: `6`
- `category`: `running`
- `isActive`: checked

Expected:
- Browser redirects to `/admin/products`.
- The new product appears in the admin list.
- `/products` also shows the new item after refresh/navigation.

- [ ] **Step 5: Commit the create flow**

Run:
```bash
git add src/components/admin-product-form.js src/app/admin/products/actions.js src/app/admin/products/new/page.js
git commit -m "feat: add admin create product flow"
```

---

### Task 4: Add edit and delete actions, then wire them into the admin list

**Files:**
- Modify: `src/app/admin/products/actions.js`
- Create: `src/app/admin/products/[id]/edit/page.js`
- Create: `src/components/delete-product-button.js`
- Modify: `src/app/admin/products/page.js`

- [ ] **Step 1: Extend the Server Actions with update and delete**

Update `src/app/admin/products/actions.js` to this shape:

```js
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { readProductFormPayload } from "@/lib/admin-product-form";
import {
  productCreateSchema,
  productUpdateSchema,
  toProductCreateData,
  toProductUpdateData,
} from "@/lib/product-api";

async function resolveCategoryId(categorySlug) {
  const category = await db.category.findUnique({
    where: { slug: categorySlug },
    select: { id: true },
  });

  if (!category) {
    throw new Error("Category not found.");
  }

  return category.id;
}

function revalidateProductPaths(nextSlug, previousSlug = null) {
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin/products");

  if (previousSlug) {
    revalidatePath(`/products/${previousSlug}`);
  }

  if (nextSlug) {
    revalidatePath(`/products/${nextSlug}`);
  }
}

export async function createProductAction(formData) {
  const payload = productCreateSchema.parse(readProductFormPayload(formData));
  const categoryId = await resolveCategoryId(payload.categorySlug);
  const product = await db.product.create({
    data: toProductCreateData(payload, categoryId),
  });

  revalidateProductPaths(product.slug);
  redirect("/admin/products");
}

export async function updateProductAction(productId, formData) {
  const existingProduct = await db.product.findUnique({
    where: { id: productId },
    select: { id: true, slug: true },
  });

  if (!existingProduct) {
    throw new Error("Product not found.");
  }

  const payload = productUpdateSchema.parse(readProductFormPayload(formData));
  const categoryId = await resolveCategoryId(payload.categorySlug);
  const product = await db.product.update({
    where: { id: productId },
    data: toProductUpdateData(payload, categoryId),
  });

  revalidateProductPaths(product.slug, existingProduct.slug);
  redirect("/admin/products");
}

export async function deleteProductAction(productId, productSlug) {
  await db.product.delete({
    where: { id: productId },
  });

  revalidateProductPaths(null, productSlug);
  redirect("/admin/products");
}
```

- [ ] **Step 2: Add the edit page and delete-confirm client component**

Create `src/app/admin/products/[id]/edit/page.js` with this code:

```jsx
import { notFound } from "next/navigation";
import { AdminProductForm } from "@/components/admin-product-form";
import { toProductFormValues } from "@/lib/admin-product-form";
import {
  getAdminCategories,
  getAdminProductById,
} from "@/lib/admin-products";
import { updateProductAction } from "../../actions";

export const metadata = {
  title: "MiniShop Admin | Edit Product",
  description: "Chỉnh sửa sản phẩm trong MiniShop admin.",
};

export default async function EditAdminProductPage({ params }) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    getAdminProductById(id),
    getAdminCategories(),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <AdminProductForm
      action={updateProductAction.bind(null, product.id)}
      categories={categories}
      initialValues={toProductFormValues({
        ...product,
        categorySlug: product.category.slug,
      })}
      title={`Sửa: ${product.name}`}
      description="Sau khi lưu, admin list và storefront sẽ được revalidate."
      submitLabel="Cập nhật sản phẩm"
    />
  );
}
```

Create `src/components/delete-product-button.js` with this code:

```jsx
"use client";

export function DeleteProductButton({ action, productName }) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          `Xóa sản phẩm "${productName}" khỏi catalog?`,
        );

        if (!confirmed) {
          event.preventDefault();
        }
      }}
    >
      <button type="submit" className="button button--danger">
        Xóa
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Wire delete into the admin list**

Update `src/app/admin/products/page.js` to this shape:

```jsx
import Link from "next/link";
import { DeleteProductButton } from "@/components/delete-product-button";
import { formatVnd } from "@/lib/format-vnd";
import { getAdminProducts } from "@/lib/admin-products";
import { deleteProductAction } from "./actions";

export const metadata = {
  title: "MiniShop Admin | Products",
  description: "Quản trị sản phẩm cho MiniShop.",
};

export default async function AdminProductsPage() {
  const products = await getAdminProducts();

  return (
    <main className="admin-page">
      <section className="admin-page__hero admin-page__hero--split">
        <div>
          <p className="admin-page__eyebrow">Product CRUD</p>
          <h1>Quản lý sản phẩm</h1>
          <p className="admin-page__description">
            Tạo, sửa, xóa sản phẩm bằng Server Action rồi đồng bộ lại storefront.
          </p>
        </div>

        <Link href="/admin/products/new" className="button button--primary">
          Tạo sản phẩm
        </Link>
      </section>

      <section className="admin-product-list">
        {products.map((product) => (
          <article key={product.id} className="admin-product-card">
            <div className="admin-product-card__copy">
              <p className="admin-page__eyebrow">{product.category.name}</p>
              <h2>{product.name}</h2>
              <p>/{product.slug}</p>
            </div>

            <dl className="admin-product-card__stats">
              <div>
                <dt>Giá</dt>
                <dd>{formatVnd(product.price)}</dd>
              </div>
              <div>
                <dt>Tồn kho</dt>
                <dd>{product.stock}</dd>
              </div>
              <div>
                <dt>Trạng thái</dt>
                <dd>{product.isActive ? "Đang bán" : "Ẩn"}</dd>
              </div>
            </dl>

            <div className="admin-product-card__actions">
              <Link
                href={`/admin/products/${product.id}/edit`}
                className="button button--secondary"
              >
                Sửa
              </Link>

              <DeleteProductButton
                action={deleteProductAction.bind(null, product.id, product.slug)}
                productName={product.name}
              />
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Verify edit and delete flows manually**

Run:
```bash
npm run dev
```

Manual checks:
1. Open `/admin/products/<id>/edit`, change `name` and `slug`, submit, and confirm the browser returns to `/admin/products`.
2. Visit `/products` and `/products/<new-slug>` to confirm the updated data appears there too.
3. Click `Xóa` on a disposable product, cancel once to verify the confirm dialog blocks deletion, then confirm once to verify the row disappears.

Expected:
- Edit redirects to `/admin/products` with fresh data.
- Storefront pages reflect the edited slug/name/active state.
- Delete only happens after confirmation and the list refreshes afterward.

- [ ] **Step 5: Commit the edit/delete flow**

Run:
```bash
git add src/app/admin/products/actions.js src/app/admin/products/[id]/edit/page.js src/components/delete-product-button.js src/app/admin/products/page.js
git commit -m "feat: add admin edit and delete actions"
```

---

### Task 5: Add admin styling and run full milestone verification

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add admin layout, card, form, and danger-button styles**

Append this block to `src/app/globals.css`:

```css
.button--danger {
  border-color: rgba(127, 29, 29, 0.16);
  background: rgba(254, 242, 242, 0.92);
  color: #7f1d1d;
}

.admin-layout {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 24px;
  width: min(1240px, calc(100% - 32px));
  margin: 32px auto 72px;
}

.admin-layout__sidebar {
  position: sticky;
  top: 96px;
  align-self: start;
  padding: 22px;
  border: 1px solid var(--border);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: var(--shadow);
}

.admin-layout__eyebrow,
.admin-page__eyebrow,
.admin-product-card__stats dt {
  margin: 0 0 12px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.78rem;
  color: var(--accent);
}

.admin-layout__brand h2,
.admin-page__hero h1,
.admin-shortcut-card h2,
.admin-product-card h2 {
  margin: 0;
  font-family: var(--font-space-grotesk), Arial, sans-serif;
  line-height: 0.96;
  letter-spacing: -0.05em;
}

.admin-layout__brand p,
.admin-page__description,
.admin-shortcut-card p,
.admin-product-card__copy p,
.admin-field span {
  color: var(--muted);
  line-height: 1.7;
}

.admin-layout__nav {
  display: grid;
  gap: 10px;
  margin-top: 20px;
}

.admin-layout__nav a {
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.72);
  font-weight: 600;
}

.admin-page__hero {
  display: grid;
  gap: 16px;
}

.admin-page__hero--split {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
}

.admin-page__hero h1 {
  font-size: clamp(2.4rem, 5vw, 4.6rem);
}

.admin-shortcuts,
.admin-product-list {
  display: grid;
  gap: 20px;
  margin-top: 28px;
}

.admin-shortcuts {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.admin-shortcut-card,
.admin-product-card,
.admin-form {
  border: 1px solid var(--border);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: var(--shadow);
}

.admin-shortcut-card,
.admin-product-card {
  padding: 22px;
}

.admin-product-card {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(220px, 0.8fr) auto;
  gap: 18px;
  align-items: center;
}

.admin-product-card__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}

.admin-product-card__stats dd {
  margin: 0;
  font-weight: 700;
}

.admin-product-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: end;
}

.admin-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  margin-top: 28px;
  padding: 24px;
}

.admin-field {
  display: grid;
  gap: 8px;
}

.admin-field--full {
  grid-column: 1 / -1;
}

.admin-field input,
.admin-field textarea,
.admin-field select {
  width: 100%;
  min-height: 48px;
  padding: 0 14px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: #fff;
}

.admin-field textarea {
  min-height: 132px;
  padding: 14px;
  resize: vertical;
}

.admin-form__checkboxes {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
}

.admin-form__checkboxes label {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--muted);
}

.admin-form__actions {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

@media (max-width: 960px) {
  .admin-layout {
    grid-template-columns: 1fr;
  }

  .admin-layout__sidebar {
    position: static;
  }

  .admin-shortcuts,
  .admin-form,
  .admin-product-card,
  .admin-product-card__stats {
    grid-template-columns: 1fr;
  }

  .admin-page__hero--split {
    grid-template-columns: 1fr;
  }

  .admin-product-card__actions {
    justify-content: start;
  }
}
```

- [ ] **Step 2: Run the full automated verification set**

Run:
```bash
npm run test
npm run lint
npm run build
```

Expected:
- All existing Vitest suites pass, including buổi 4, buổi 5, buổi 6, and the new buổi 7 helper test.
- Lint passes.
- Production build passes.

- [ ] **Step 3: Re-seed and run the end-to-end browser smoke test**

Run:
```bash
npm run db:seed
npm run dev
```

Browser smoke test checklist:
1. `/admin` shows the dashboard links.
2. `/admin/products` shows catalog cards and `Sửa`/`Xóa` actions.
3. `/admin/products/new` creates a visible storefront product.
4. `/admin/products/<id>/edit` updates that product and keeps the list in sync.
5. `/products` and `/products/<slug>` reflect active/featured/slug changes after admin mutations.

- [ ] **Step 4: Commit the admin styling and verification pass**

Run:
```bash
git add src/app/globals.css
git commit -m "style: add admin dashboard styles"
```

- [ ] **Step 5: Record completion evidence**

Run:
```bash
git status --short
git log --oneline -5
```

Expected:
- `git status --short` is clean.
- The latest commits cover helper foundation, admin list, create flow, edit/delete flow, and styling.
