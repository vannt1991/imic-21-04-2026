# MiniShop Buổi 6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first backend API layer for MiniShop with Next.js Route Handlers: product CRUD by ID, product collection GET/POST, and category listing, all backed by Prisma with validation and consistent JSON error responses.

**Architecture:** Keep Route Handlers in `src/app/api/*` thin. Move payload validation, Prisma row serialization, and write-shape normalization into `src/lib/product-api.js`, and centralize JSON error formatting in `src/lib/api-response.js`. Product routes will accept `categorySlug` in request bodies for teaching clarity, resolve it to `categoryId` on the server, then read/write the existing Prisma schema without changing storefront components or `src/lib/products.js`.

**Tech Stack:** Next.js 16 App Router Route Handlers, React 19, JavaScript, Prisma ORM, SQLite, Zod, Vitest, `curl`, Node.js.

---

## Current Codebase Notes

- `prisma/schema.prisma` already defines `Category`, `Product`, `Order`, and `User`, so buổi 6 does not need a migration unless the plan drifts from the current schema.
- `prisma/seed.mjs` already creates 3 categories and 10 products; that data is enough to smoke-test `GET /api/products` and `GET /api/categories`.
- `src/lib/products.js` is the storefront read adapter and currently filters out inactive products. The new API should not replace or break that read path.
- `package.json` already has Prisma scripts and Vitest, but there is no `zod` dependency yet.
- There is no `src/app/api` directory yet.
- `OrderItem.product` does not cascade on delete, so hard-delete of a product is only safe before later milestones create real orders. That is acceptable for buổi 6 because checkout is not implemented yet.
- Next.js 16 Route Handlers receive `context.params` as a promise, so dynamic API routes in this repo should use `const { id } = await params;`.

## File Map

- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/lib/api-response.js`
- Create: `src/lib/product-api.js`
- Create: `tests/lib/product-api.test.js`
- Create: `src/app/api/products/route.js`
- Create: `src/app/api/products/[id]/route.js`
- Create: `src/app/api/categories/route.js`

## Verification Strategy

- Use `npm run test -- tests/lib/product-api.test.js` for the pure validation/serializer helpers.
- Use `npm run lint` to catch import and Route Handler issues.
- Use `npm run build` to catch App Router and dynamic route signature mistakes.
- Use `npm run db:seed` before manual API smoke tests so the category slugs are predictable.
- Smoke test `GET`, `POST`, `PATCH`, and `DELETE` with `curl` while `npm run dev` is running.

---

### Task 1: Add the shared API error layer and Zod dependency

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/lib/api-response.js`

- [ ] **Step 1: Capture the baseline before adding the API layer**

Run:
```bash
npm run test
npm run lint
npm run build
```

Expected:
- All three commands pass before buổi 6 work starts.

- [ ] **Step 2: Install Zod for request validation**

Run:
```bash
npm install zod
```

Expected:
- `package.json` gains `zod` in dependencies.
- `package-lock.json` updates.

- [ ] **Step 3: Add a shared JSON error helper for Route Handlers**

Create `src/lib/api-response.js` with this code:

```js
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export function jsonError(message, status, details) {
  return Response.json(
    details ? { error: { message, details } } : { error: { message } },
    { status },
  );
}

function formatZodIssues(error) {
  return error.issues.map((issue) => ({
    path: issue.path.length ? issue.path.join(".") : "root",
    message: issue.message,
  }));
}

export function handleRouteError(error) {
  if (error instanceof SyntaxError) {
    return jsonError("Request body must be valid JSON.", 400);
  }

  if (error instanceof ZodError) {
    return jsonError("Validation failed.", 400, formatZodIssues(error));
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return jsonError("Product slug must be unique.", 409);
    }

    if (error.code === "P2025") {
      return jsonError("Product not found.", 404);
    }
  }

  console.error(error);
  return jsonError("Internal server error.", 500);
}
```

- [ ] **Step 4: Re-run compile checks after introducing the shared helper**

Run:
```bash
npm run lint
npm run build
```

Expected:
- Both commands pass.
- No import errors for `zod` or `@prisma/client`.

- [ ] **Step 5: Commit the API bootstrap**

Run:
```bash
git add package.json package-lock.json src/lib/api-response.js
git commit -m "feat: add api response helpers"
```

---

### Task 2: Add product API schemas, serializers, and pure tests

**Files:**
- Create: `src/lib/product-api.js`
- Create: `tests/lib/product-api.test.js`

- [ ] **Step 1: Write the helper tests before the implementation**

Create `tests/lib/product-api.test.js` with this suite:

```js
import { describe, expect, it } from "vitest";
import {
  productCreateSchema,
  productUpdateSchema,
  toProductApiModel,
  toProductCreateData,
  toProductUpdateData,
} from "../../src/lib/product-api.js";

describe("product api helpers", () => {
  it("parses a create payload and applies defaults", () => {
    const payload = productCreateSchema.parse({
      name: "  API Runner  ",
      slug: "api-runner",
      description: "  Temporary product for route testing.  ",
      price: 990000,
      stock: 4,
      categorySlug: "running",
      image: "   ",
      badge: "  API  ",
      note: null,
    });

    expect(toProductCreateData(payload, "cat_running")).toEqual({
      name: "API Runner",
      slug: "api-runner",
      description: "Temporary product for route testing.",
      price: 990000,
      originalPrice: null,
      image: null,
      badge: "API",
      note: null,
      stock: 4,
      featured: false,
      isActive: true,
      categoryId: "cat_running",
    });
  });

  it("builds a partial update shape without injecting untouched fields", () => {
    const payload = productUpdateSchema.parse({
      badge: "  Sale  ",
      image: "   ",
      featured: true,
    });

    expect(toProductUpdateData(payload)).toEqual({
      badge: "Sale",
      image: null,
      featured: true,
    });
  });

  it("adds categoryId to an update only when the slug was re-resolved", () => {
    const payload = productUpdateSchema.parse({
      name: "  Updated Runner  ",
      categorySlug: "lifestyle",
    });

    const { categorySlug, ...rest } = payload;

    expect(categorySlug).toBe("lifestyle");
    expect(toProductUpdateData(rest, "cat_lifestyle")).toEqual({
      name: "Updated Runner",
      categoryId: "cat_lifestyle",
    });
  });

  it("rejects an empty patch payload", () => {
    expect(() => productUpdateSchema.parse({})).toThrow(
      "At least one field is required.",
    );
  });

  it("serializes a Prisma product row into an API-safe JSON shape", () => {
    expect(
      toProductApiModel({
        id: "prod_1",
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
        createdAt: new Date("2026-05-16T09:00:00.000Z"),
        updatedAt: new Date("2026-05-16T10:00:00.000Z"),
        category: {
          id: "cat_running",
          slug: "running",
          name: "Running",
        },
      }),
    ).toEqual({
      id: "prod_1",
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
      category: {
        id: "cat_running",
        slug: "running",
        name: "Running",
      },
      createdAt: "2026-05-16T09:00:00.000Z",
      updatedAt: "2026-05-16T10:00:00.000Z",
    });
  });
});
```

- [ ] **Step 2: Run the new test file and confirm it fails before the helper exists**

Run:
```bash
npm run test -- tests/lib/product-api.test.js
```

Expected:
- Vitest fails with a module-not-found error for `src/lib/product-api.js`.

- [ ] **Step 3: Implement the product API helper module**

Create `src/lib/product-api.js` with this code:

```js
import { z } from "zod";

const requiredString = z.string().trim().min(1);
const optionalNullableString = z.string().nullable().optional();
const nonNegativeInt = z.number().int().nonnegative();

function normalizeNullableString(value) {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export const productCreateSchema = z.object({
  name: requiredString,
  slug: requiredString,
  description: requiredString,
  price: nonNegativeInt,
  originalPrice: nonNegativeInt.nullable().optional(),
  image: optionalNullableString,
  badge: optionalNullableString,
  note: optionalNullableString,
  stock: nonNegativeInt,
  featured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  categorySlug: requiredString,
});

export const productUpdateSchema = productCreateSchema
  .partial()
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required.",
  });

export function toProductCreateData(payload, categoryId) {
  return {
    name: payload.name.trim(),
    slug: payload.slug.trim(),
    description: payload.description.trim(),
    price: payload.price,
    originalPrice: payload.originalPrice ?? null,
    image: normalizeNullableString(payload.image),
    badge: normalizeNullableString(payload.badge),
    note: normalizeNullableString(payload.note),
    stock: payload.stock,
    featured: payload.featured,
    isActive: payload.isActive,
    categoryId,
  };
}

export function toProductUpdateData(payload, categoryId) {
  const data = {};

  if (payload.name !== undefined) {
    data.name = payload.name.trim();
  }

  if (payload.slug !== undefined) {
    data.slug = payload.slug.trim();
  }

  if (payload.description !== undefined) {
    data.description = payload.description.trim();
  }

  if (payload.price !== undefined) {
    data.price = payload.price;
  }

  if (payload.originalPrice !== undefined) {
    data.originalPrice = payload.originalPrice;
  }

  if (payload.image !== undefined) {
    data.image = normalizeNullableString(payload.image);
  }

  if (payload.badge !== undefined) {
    data.badge = normalizeNullableString(payload.badge);
  }

  if (payload.note !== undefined) {
    data.note = normalizeNullableString(payload.note);
  }

  if (payload.stock !== undefined) {
    data.stock = payload.stock;
  }

  if (payload.featured !== undefined) {
    data.featured = payload.featured;
  }

  if (payload.isActive !== undefined) {
    data.isActive = payload.isActive;
  }

  if (categoryId !== undefined) {
    data.categoryId = categoryId;
  }

  return data;
}

export function toProductApiModel(product) {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    price: product.price,
    originalPrice: product.originalPrice,
    image: product.image,
    badge: product.badge,
    note: product.note,
    stock: product.stock,
    featured: product.featured,
    isActive: product.isActive,
    category: product.category
      ? {
          id: product.category.id,
          slug: product.category.slug,
          name: product.category.name,
        }
      : null,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}
```

- [ ] **Step 4: Run the helper tests and confirm the pure API logic now passes**

Run:
```bash
npm run test -- tests/lib/product-api.test.js
```

Expected:
- All tests in `tests/lib/product-api.test.js` pass.

- [ ] **Step 5: Commit the validated product API helper layer**

Run:
```bash
git add src/lib/product-api.js tests/lib/product-api.test.js
git commit -m "feat: add product api validation helpers"
```

---

### Task 3: Implement collection routes for products and categories

**Files:**
- Create: `src/app/api/products/route.js`
- Create: `src/app/api/categories/route.js`

- [ ] **Step 1: Add the collection route for `GET /api/products` and `POST /api/products`**

Create `src/app/api/products/route.js` with this code:

```js
import { db } from "@/lib/db";
import { handleRouteError, jsonError } from "@/lib/api-response";
import {
  productCreateSchema,
  toProductApiModel,
  toProductCreateData,
} from "@/lib/product-api";

export async function GET() {
  try {
    const products = await db.product.findMany({
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });

    return Response.json({
      products: products.map(toProductApiModel),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request) {
  try {
    const payload = productCreateSchema.parse(await request.json());

    const category = await db.category.findUnique({
      where: { slug: payload.categorySlug },
      select: { id: true },
    });

    if (!category) {
      return jsonError("Category not found.", 404);
    }

    const product = await db.product.create({
      data: toProductCreateData(payload, category.id),
      include: { category: true },
    });

    return Response.json(
      {
        product: toProductApiModel(product),
      },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
```

- [ ] **Step 2: Add the category listing route used by product forms and API demos**

Create `src/app/api/categories/route.js` with this code:

```js
import { db } from "@/lib/db";
import { handleRouteError } from "@/lib/api-response";

export async function GET() {
  try {
    const categories = await db.category.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    });

    return Response.json({ categories });
  } catch (error) {
    return handleRouteError(error);
  }
}
```

- [ ] **Step 3: Run compile checks after the first Route Handlers land**

Run:
```bash
npm run lint
npm run build
```

Expected:
- Both commands pass.
- The build does not fail on `src/app/api/products/route.js` or `src/app/api/categories/route.js`.

- [ ] **Step 4: Smoke-test list, create, and validation behavior with `curl`**

Run:
```bash
npm run db:seed
npm run dev
```

In another terminal, run:
```bash
curl -i http://localhost:3000/api/products

curl -i http://localhost:3000/api/categories

curl -i -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  --data '{"name":"","slug":"broken-product"}'

curl -i -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  --data '{
    "name": "API Test Runner",
    "slug": "api-test-runner",
    "description": "Temporary product for Route Handler smoke tests.",
    "price": 990000,
    "originalPrice": null,
    "image": null,
    "badge": "API",
    "note": "delete-me",
    "stock": 3,
    "featured": false,
    "isActive": true,
    "categorySlug": "running"
  }'
```

Expected:
- `GET /api/products` returns `200` with a `products` array.
- `GET /api/categories` returns `200` with a `categories` array sorted by name.
- The broken `POST` returns `400` with `{ "error": { "message": "Validation failed." ... } }`.
- The valid `POST` returns `201` with a `product` object that includes `id` and nested `category`.

- [ ] **Step 5: Commit the collection routes**

Run:
```bash
git add src/app/api/products/route.js src/app/api/categories/route.js
git commit -m "feat: add product and category api routes"
```

---

### Task 4: Implement `GET`, `PATCH`, and `DELETE` for `/api/products/[id]`

**Files:**
- Create: `src/app/api/products/[id]/route.js`

- [ ] **Step 1: Add the dynamic product-by-id Route Handler**

Create `src/app/api/products/[id]/route.js` with this code:

```js
import { db } from "@/lib/db";
import { handleRouteError, jsonError } from "@/lib/api-response";
import {
  productUpdateSchema,
  toProductApiModel,
  toProductUpdateData,
} from "@/lib/product-api";

export async function GET(_request, { params }) {
  try {
    const { id } = await params;

    const product = await db.product.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!product) {
      return jsonError("Product not found.", 404);
    }

    return Response.json({
      product: toProductApiModel(product),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const payload = productUpdateSchema.parse(await request.json());

    let categoryId;

    if (payload.categorySlug !== undefined) {
      const category = await db.category.findUnique({
        where: { slug: payload.categorySlug },
        select: { id: true },
      });

      if (!category) {
        return jsonError("Category not found.", 404);
      }

      categoryId = category.id;
    }

    const { categorySlug, ...productFields } = payload;

    const product = await db.product.update({
      where: { id },
      data: toProductUpdateData(productFields, categoryId),
      include: { category: true },
    });

    return Response.json({
      product: toProductApiModel(product),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;

    await db.product.delete({
      where: { id },
    });

    return Response.json({
      deleted: true,
      id,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
```

- [ ] **Step 2: Run the tests and compile checks with the full product API surface**

Run:
```bash
npm run test -- tests/lib/product-api.test.js
npm run lint
npm run build
```

Expected:
- Helper tests still pass.
- Lint passes.
- Build passes with the dynamic API route included.

- [ ] **Step 3: Smoke-test `GET`, `PATCH`, `DELETE`, and the 404 flow using a temporary product**

With `npm run dev` still running, create and capture a temp product ID:

```bash
TMP_PRODUCT_ID=$(curl -s -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  --data '{
    "name": "API Temp Delete Me",
    "slug": "api-temp-delete-me",
    "description": "Temporary product for dynamic route smoke tests.",
    "price": 1110000,
    "originalPrice": null,
    "image": null,
    "badge": "Temp",
    "note": "cleanup",
    "stock": 2,
    "featured": false,
    "isActive": true,
    "categorySlug": "running"
  }' | node -e 'let data = ""; process.stdin.on("data", (chunk) => data += chunk); process.stdin.on("end", () => process.stdout.write(JSON.parse(data).product.id));')
```

Then run:
```bash
curl -i http://localhost:3000/api/products/$TMP_PRODUCT_ID

curl -i -X PATCH http://localhost:3000/api/products/$TMP_PRODUCT_ID \
  -H "Content-Type: application/json" \
  --data '{
    "price": 1230000,
    "stock": 7,
    "badge": "Updated",
    "categorySlug": "lifestyle"
  }'

curl -i -X DELETE http://localhost:3000/api/products/$TMP_PRODUCT_ID

curl -i http://localhost:3000/api/products/$TMP_PRODUCT_ID
```

Expected:
- The first `GET` returns `200` and the temp product payload.
- The `PATCH` returns `200` and shows the new `price`, `stock`, `badge`, and `category.slug`.
- The `DELETE` returns `200` with `{ "deleted": true, "id": "..." }`.
- The final `GET` returns `404` with `{ "error": { "message": "Product not found." } }`.

- [ ] **Step 4: Commit the product-by-id route**

Run:
```bash
git add src/app/api/products/[id]/route.js
git commit -m "feat: add product detail api routes"
```

---

### Task 5: Final verification and teaching handoff

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/lib/api-response.js`
- Create: `src/lib/product-api.js`
- Create: `tests/lib/product-api.test.js`
- Create: `src/app/api/products/route.js`
- Create: `src/app/api/products/[id]/route.js`
- Create: `src/app/api/categories/route.js`

- [ ] **Step 1: Run the final verification sweep exactly as the learner would**

Run:
```bash
npm run db:seed
npm run test -- tests/lib/product-api.test.js
npm run lint
npm run build
```

Expected:
- All four commands pass.

- [ ] **Step 2: Capture the teaching demo commands in one place for class delivery**

Use this command sequence during the live demo:

```bash
curl -i http://localhost:3000/api/products

curl -i http://localhost:3000/api/categories

curl -i -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  --data '{
    "name": "Speaker Demo Product",
    "slug": "speaker-demo-product",
    "description": "Created during the REST API lesson.",
    "price": 1500000,
    "originalPrice": null,
    "image": null,
    "badge": "Demo",
    "note": "class example",
    "stock": 5,
    "featured": true,
    "isActive": true,
    "categorySlug": "running"
  }'
```

Expected:
- The teacher can show one read request, one lookup request, and one write request without touching the UI.

- [ ] **Step 3: Commit the finished milestone if any last-minute verification edits were needed**

Run:
```bash
git add \
  package.json \
  package-lock.json \
  src/lib/api-response.js \
  src/lib/product-api.js \
  tests/lib/product-api.test.js \
  src/app/api/products/route.js \
  src/app/api/products/[id]/route.js \
  src/app/api/categories/route.js
git commit -m "chore: verify minishop buoi 6 api milestone"
```

Expected:
- Skip this commit if Task 1-4 commits already reflect the final verified state with no extra edits.

---

## Spec Coverage Check

- `GET /api/products` is covered in Task 3.
- `POST /api/products` is covered in Task 3.
- `GET /api/products/[id]` is covered in Task 4.
- `PATCH /api/products/[id]` is covered in Task 4.
- `DELETE /api/products/[id]` is covered in Task 4.
- `GET /api/categories` is covered in Task 3.
- Validation before DB writes is covered by Task 1 + Task 2 + write flows in Task 3/4.
- Consistent JSON error responses are covered by `src/lib/api-response.js` and the smoke tests in Task 3/4.

## Self-Review Notes

- No placeholder markers (`TODO`, `TBD`, "appropriate", "similar to Task N") remain.
- All code paths use the same JSON error envelope: `{ error: { message, details? } }`.
- The dynamic route examples use `await params`, matching Next.js 16 Route Handler behavior.
- The plan does not change Prisma schema shape, so it stays compatible with buổi 5 output.

Plan complete and saved to `docs/superpowers/plans/2026-05-19-minishop-buoi-6.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
