# MiniShop Product Reviews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add verified-purchase product reviews to MiniShop so only logged-in customers who bought a product can create exactly one public review for it and later edit that review.

**Architecture:** Keep the change small and enforce the rule at the source of truth. First, require authentication for checkout and persist `Order.userId` on every new order. Then add a `ProductReview` Prisma model plus a shared `src/lib/product-reviews.js` helper layer for validation, purchase eligibility, and read models. Finally, add a review route and product-detail UI that renders summary, public reviews, and the correct viewer-specific form state.

**Tech Stack:** `next@16`, App Router, `react@19`, `@prisma/client`, `zod`, `vitest`, `esbuild`, `react-dom/server`

---

## File structure

- Create: `prisma/migrations/20260625093000_add_product_reviews/migration.sql` — SQL migration for the new review table and indexes
- Create: `src/lib/product-reviews.js` — review validation, purchase eligibility, review read models, and serializer helpers
- Create: `src/app/api/products/[id]/reviews/route.js` — authenticated create/update review API
- Create: `src/components/product-review-section.js` — server-friendly review section renderer for product detail
- Create: `src/components/product-review-form.js` — client review submit/edit form
- Create: `tests/app/checkout-page-auth.test.js` — server page redirect coverage for `/checkout`
- Create: `tests/lib/product-reviews.test.js` — unit tests for validation, permission query, and summary/read-model helpers
- Create: `tests/app/product-review-route.test.js` — route tests for create/update review behavior
- Create: `tests/app/product-detail-page.test.js` — product detail rendering coverage for review states
- Modify: `prisma/schema.prisma` — add `ProductReview` model plus relations on `User` and `Product`
- Modify: `src/lib/auth.js` — add generic authenticated user helpers for page and API flows
- Modify: `src/app/checkout/page.js` — require login and pass current user to checkout client component
- Modify: `src/components/checkout-page-content.js` — prefill checkout form from the authenticated user
- Modify: `src/app/api/orders/route.js` — require auth and persist `userId` on new orders
- Modify: `tests/lib/auth.test.js` — auth helper coverage for authenticated page/API guards
- Modify: `tests/app/order-route.test.js` — order route auth + persisted `userId` assertions
- Modify: `src/lib/products.js` — include product `id` and keep product detail compatible with review loading
- Modify: `tests/lib/products.test.js` — update view-model expectations for product `id`
- Modify: `src/app/products/[slug]/page.js` — load viewer review state and mount the review section
- Modify: `src/app/globals.css` — add review section/form/list styles matching existing MiniShop UI

### Task 1: Generic authenticated user guards

**Files:**
- Modify: `tests/lib/auth.test.js`
- Modify: `src/lib/auth.js`

- [ ] **Step 1: Write the failing auth helper tests**

Append these tests to `tests/lib/auth.test.js`:

```js
import {
  ROLE_ADMIN,
  ROLE_CUSTOMER,
  getCurrentUser,
  hashSessionToken,
  requireAdminUser,
  requireAuthenticatedApiUser,
  requireAuthenticatedUser,
  sanitizeNextPath,
} from "../../src/lib/auth.js";

it("redirects anonymous users to login for authenticated storefront pages", async () => {
  await expect(
    requireAuthenticatedUser({
      cookieStore: createCookieStore(),
      nextPath: "/checkout",
    }),
  ).rejects.toThrow("REDIRECT:/login?next=%2Fcheckout");
});

it("returns the logged-in customer for generic authenticated pages", async () => {
  process.env.AUTH_SECRET = "test-auth-secret";
  db.session.findUnique.mockResolvedValue({
    id: "sess_2",
    expiresAt: new Date("2099-01-01T00:00:00.000Z"),
    user: {
      id: "user_customer",
      name: "MiniShop Customer",
      email: "customer@minishop.local",
      role: ROLE_CUSTOMER,
    },
  });

  await expect(
    requireAuthenticatedUser({
      cookieStore: createCookieStore("customer-token"),
      nextPath: "/checkout",
    }),
  ).resolves.toEqual({
    id: "user_customer",
    name: "MiniShop Customer",
    email: "customer@minishop.local",
    role: ROLE_CUSTOMER,
  });
});

it("returns 401 json for anonymous authenticated API requests", async () => {
  const response = await requireAuthenticatedApiUser({
    cookieStore: createCookieStore(),
  });

  expect(response.status).toBe(401);
  await expect(response.json()).resolves.toEqual({
    error: { message: "Authentication required." },
  });
});

it("returns the current user for authenticated API requests", async () => {
  process.env.AUTH_SECRET = "test-auth-secret";
  db.session.findUnique.mockResolvedValue({
    id: "sess_3",
    expiresAt: new Date("2099-01-01T00:00:00.000Z"),
    user: {
      id: "user_customer",
      name: "MiniShop Customer",
      email: "customer@minishop.local",
      role: ROLE_CUSTOMER,
    },
  });

  await expect(
    requireAuthenticatedApiUser({
      cookieStore: createCookieStore("customer-token"),
    }),
  ).resolves.toEqual({
    id: "user_customer",
    name: "MiniShop Customer",
    email: "customer@minishop.local",
    role: ROLE_CUSTOMER,
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/lib/auth.test.js`
Expected: FAIL because `requireAuthenticatedUser` and `requireAuthenticatedApiUser` are not exported yet.

- [ ] **Step 3: Write the minimal auth helpers**

Update `src/lib/auth.js`:

```js
export async function requireAuthenticatedUser(options = {}) {
  const { nextPath = "/" } = options;
  const user = await getCurrentUser(options);

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(sanitizeNextPath(nextPath))}`);
  }

  return user;
}

export async function requireAuthenticatedApiUser(options = {}) {
  const user = await getCurrentUser(options);

  if (!user) {
    return jsonError("Authentication required.", 401);
  }

  return user;
}
```

Leave `requireAdminUser` and `requireAdminApiUser` unchanged, but keep them layered on the same `getCurrentUser()` source.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/lib/auth.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/lib/auth.test.js src/lib/auth.js
git commit -m "feat: add generic authenticated user guards"
```

### Task 2: Checkout ownership and authenticated order creation

**Files:**
- Create: `tests/app/checkout-page-auth.test.js`
- Modify: `tests/app/order-route.test.js`
- Modify: `src/app/checkout/page.js`
- Modify: `src/components/checkout-page-content.js`
- Modify: `src/app/api/orders/route.js`

- [ ] **Step 1: Write the failing page + route tests**

Create `tests/app/checkout-page-auth.test.js`:

```js
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { transformSync } from "esbuild";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAuthenticatedUser } = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
}));

function loadPageModule(relativePath, mockMap) {
  const filePath = path.resolve(process.cwd(), relativePath);
  const source = readFileSync(filePath, "utf8");
  const { code } = transformSync(source, {
    loader: "jsx",
    format: "cjs",
    jsx: "automatic",
    target: "es2020",
    sourcefile: filePath,
  });
  const compiledModule = { exports: {} };
  const localRequire = (specifier) => {
    if (specifier in mockMap) {
      return mockMap[specifier];
    }

    return require(specifier);
  };
  const script = new vm.Script(`(function(require,module,exports){${code}\n})`, {
    filename: filePath,
  });

  script.runInThisContext()(localRequire, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}

describe("checkout page auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires an authenticated user before rendering checkout", async () => {
    requireAuthenticatedUser.mockResolvedValue({
      id: "user_customer",
      name: "MiniShop Customer",
      email: "customer@minishop.local",
      role: "CUSTOMER",
    });

    const { default: CheckoutPage } = loadPageModule("src/app/checkout/page.js", {
      "@/lib/auth": { requireAuthenticatedUser },
      "@/components/checkout-page-content": { CheckoutPageContent: "checkout-page-content" },
    });

    await CheckoutPage();

    expect(requireAuthenticatedUser).toHaveBeenCalledWith({
      nextPath: "/checkout",
    });
  });
});
```

Update `tests/app/order-route.test.js`:

```js
const { db, requireAuthenticatedApiUser } = vi.hoisted(() => ({
  db: {
    $transaction: vi.fn(),
    product: {
      findMany: vi.fn(),
    },
  },
  requireAuthenticatedApiUser: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAuthenticatedApiUser,
}));
```

Add these tests:

```js
it("returns 401 for anonymous order requests", async () => {
  requireAuthenticatedApiUser.mockResolvedValue(
    Response.json({ error: { message: "Authentication required." } }, { status: 401 }),
  );

  const response = await POST(
    new Request("http://localhost/api/orders", {
      method: "POST",
      body: JSON.stringify({
        customerName: "Van Nguyen",
        customerEmail: "van@example.com",
        customerPhone: "0901234567",
        shippingAddress: "12 Nguyen Trai, District 1",
        items: [{ slug: "air-runner-basic", quantity: 1 }],
      }),
      headers: { "content-type": "application/json" },
    }),
  );

  expect(response.status).toBe(401);
  expect(db.product.findMany).not.toHaveBeenCalled();
  expect(db.$transaction).not.toHaveBeenCalled();
});

it("persists the authenticated user id on created orders", async () => {
  requireAuthenticatedApiUser.mockResolvedValue({
    id: "user_customer",
    role: "CUSTOMER",
    email: "customer@minishop.local",
    name: "MiniShop Customer",
  });

  db.product.findMany.mockResolvedValue([
    {
      id: "prod_1",
      slug: "air-runner-basic",
      name: "Air Runner Basic",
      price: 1290000,
      stock: 8,
      isActive: true,
    },
  ]);

  const updateMany = vi.fn().mockResolvedValue({ count: 1 });
  const orderCreate = vi.fn().mockResolvedValue(createOrderRecord());

  db.$transaction.mockImplementation(async (callback) =>
    callback({
      product: { updateMany },
      order: { create: orderCreate },
    }),
  );

  await POST(
    new Request("http://localhost/api/orders", {
      method: "POST",
      body: JSON.stringify({
        customerName: "Van Nguyen",
        customerEmail: "van@example.com",
        customerPhone: "0901234567",
        shippingAddress: "12 Nguyen Trai, District 1",
        items: [{ slug: "air-runner-basic", quantity: 1 }],
      }),
      headers: { "content-type": "application/json" },
    }),
  );

  expect(orderCreate).toHaveBeenCalledWith({
    data: {
      userId: "user_customer",
      customerName: "Van Nguyen",
      customerEmail: "van@example.com",
      customerPhone: "0901234567",
      shippingAddress: "12 Nguyen Trai, District 1",
      status: "PENDING",
      total: 1290000,
      items: {
        create: [{ productId: "prod_1", quantity: 1, price: 1290000 }],
      },
    },
    include: orderApiInclude,
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/app/checkout-page-auth.test.js tests/app/order-route.test.js`
Expected:
- checkout page test fails because `src/app/checkout/page.js` does not call `requireAuthenticatedUser`
- order route tests fail because the route still allows anonymous requests and does not store `userId`

- [ ] **Step 3: Implement authenticated checkout + order ownership**

Update `src/app/checkout/page.js`:

```js
import { CheckoutPageContent } from "@/components/checkout-page-content";
import { requireAuthenticatedUser } from "@/lib/auth";

export const metadata = {
  title: "MiniShop | Checkout",
  description: "Nhập thông tin khách hàng và gửi đơn hàng từ giỏ hàng hiện tại.",
};

export default async function CheckoutPage() {
  const currentUser = await requireAuthenticatedUser({
    nextPath: "/checkout",
  });

  return <CheckoutPageContent currentUser={currentUser} />;
}
```

Update the top of `src/components/checkout-page-content.js`:

```js
const defaultFormValues = {
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  shippingAddress: "",
};

function buildInitialFormValues(currentUser) {
  return {
    ...defaultFormValues,
    customerName: currentUser?.name ?? "",
    customerEmail: currentUser?.email ?? "",
  };
}

export function CheckoutPageContent({ currentUser = null }) {
  const router = useRouter();
  const { items, cartCount, subtotal, isHydrated, clearCart } = useCart();
  const [formValues, setFormValues] = useState(() =>
    buildInitialFormValues(currentUser),
  );
```

Update `src/app/api/orders/route.js`:

```js
import { requireAuthenticatedApiUser } from "@/lib/auth";

export async function POST(request) {
  try {
    const user = await requireAuthenticatedApiUser();

    if (user instanceof Response) {
      return user;
    }

    const payload = createOrderSchema.parse(await request.json());
    const slugs = getUniqueSlugs(payload.items);
    const products = await db.product.findMany({
      where: {
        slug: {
          in: slugs,
        },
      },
      select: productLookupSelect,
    });
    const draft = buildOrderDraft(payload, products);

    const order = await db.$transaction(async (tx) => {
      for (const reservation of draft.stockReservations) {
        await assertReservation(tx, reservation);
      }

      return tx.order.create({
        data: {
          userId: user.id,
          ...draft.customer,
          status: "PENDING",
          total: draft.total,
          items: {
            create: draft.orderItems,
          },
        },
        include: orderApiInclude,
      });
    });

    return Response.json(toOrderApiModel(order), { status: 201 });
  } catch (error) {
    // existing error handling unchanged
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/app/checkout-page-auth.test.js tests/app/order-route.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/app/checkout-page-auth.test.js tests/app/order-route.test.js src/app/checkout/page.js src/components/checkout-page-content.js src/app/api/orders/route.js
git commit -m "feat: require auth for checkout orders"
```

### Task 3: Review schema, migration, and shared helper layer

**Files:**
- Create: `prisma/migrations/20260625093000_add_product_reviews/migration.sql`
- Create: `tests/lib/product-reviews.test.js`
- Create: `src/lib/product-reviews.js`
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Write the failing review helper tests**

Create `tests/lib/product-reviews.test.js`:

```js
import { describe, expect, it, vi } from "vitest";
import {
  buildReviewSummary,
  canUserReviewProduct,
  productReviewSchema,
  toReviewApiModel,
} from "../../src/lib/product-reviews.js";

describe("product reviews helpers", () => {
  it("validates and trims review input", () => {
    expect(
      productReviewSchema.parse({
        rating: 5,
        comment: "  Rat em va di hoc hang ngay rat on  ",
      }),
    ).toEqual({
      rating: 5,
      comment: "Rat em va di hoc hang ngay rat on",
    });
  });

  it("rejects ratings outside 1..5 and short comments", () => {
    expect(() =>
      productReviewSchema.parse({ rating: 0, comment: "ngan" }),
    ).toThrow();
    expect(() =>
      productReviewSchema.parse({ rating: 6, comment: "binh luan hop le" }),
    ).toThrow();
  });

  it("builds average rating and count from review rows", () => {
    expect(
      buildReviewSummary([
        { rating: 5 },
        { rating: 4 },
        { rating: 3 },
      ]),
    ).toEqual({
      averageRating: 4,
      reviewCount: 3,
    });
  });

  it("normalizes a review record for API output", () => {
    expect(
      toReviewApiModel({
        id: "rev_1",
        rating: 4,
        comment: "Rat de di hoc.",
        createdAt: new Date("2026-06-25T09:00:00.000Z"),
        updatedAt: new Date("2026-06-25T10:00:00.000Z"),
        user: {
          name: null,
          email: "customer@minishop.local",
        },
      }),
    ).toEqual({
      id: "rev_1",
      rating: 4,
      comment: "Rat de di hoc.",
      reviewerName: "Khach hang MiniShop",
      createdAt: "2026-06-25T09:00:00.000Z",
      updatedAt: "2026-06-25T10:00:00.000Z",
    });
  });

  it("treats non-cancelled matching orders as review-eligible", async () => {
    const client = {
      order: {
        count: vi.fn().mockResolvedValue(1),
      },
    };

    await expect(
      canUserReviewProduct({
        userId: "user_customer",
        productId: "prod_1",
        client,
      }),
    ).resolves.toBe(true);

    expect(client.order.count).toHaveBeenCalledWith({
      where: {
        userId: "user_customer",
        status: { not: "CANCELLED" },
        items: {
          some: {
            productId: "prod_1",
          },
        },
      },
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/lib/product-reviews.test.js`
Expected: FAIL because `src/lib/product-reviews.js` does not exist yet.

- [ ] **Step 3: Implement the schema, migration, and helper module**

Update `prisma/schema.prisma`:

```prisma
model User {
  id           String          @id @default(cuid())
  name         String?
  email        String          @unique
  passwordHash String?
  role         String          @default("CUSTOMER")
  orders       Order[]
  reviews      ProductReview[]
  sessions     Session[]
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt
}

model Product {
  id            String          @id @default(cuid())
  name          String
  slug          String          @unique
  description   String
  price         Int
  originalPrice Int?
  image         String?
  badge         String?
  note          String?
  stock         Int             @default(0)
  featured      Boolean         @default(false)
  isActive      Boolean         @default(true)
  categoryId    String
  category      Category        @relation(fields: [categoryId], references: [id])
  orderItems    OrderItem[]
  reviews       ProductReview[]
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  @@index([categoryId])
  @@index([featured])
}

model ProductReview {
  id        String   @id @default(cuid())
  productId String
  userId    String
  rating    Int
  comment   String
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, productId])
  @@index([productId])
}
```

Create `prisma/migrations/20260625093000_add_product_reviews/migration.sql`:

```sql
-- CreateTable
CREATE TABLE "ProductReview" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductReview_userId_productId_key" ON "ProductReview"("userId", "productId");

-- CreateIndex
CREATE INDEX "ProductReview_productId_idx" ON "ProductReview"("productId");

-- AddForeignKey
ALTER TABLE "ProductReview"
ADD CONSTRAINT "ProductReview_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview"
ADD CONSTRAINT "ProductReview_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
```

Create `src/lib/product-reviews.js`:

```js
import { z } from "zod";
import { db } from "@/lib/db";

const reviewerNameFallback = "Khach hang MiniShop";

export const productReviewSchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().min(10),
  })
  .strict();

export function buildReviewSummary(reviews) {
  if (!reviews.length) {
    return {
      averageRating: 0,
      reviewCount: 0,
    };
  }

  const total = reviews.reduce((sum, review) => sum + review.rating, 0);

  return {
    averageRating: Number((total / reviews.length).toFixed(1)),
    reviewCount: reviews.length,
  };
}

export function toReviewApiModel(review) {
  return {
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    reviewerName: review.user?.name?.trim() || reviewerNameFallback,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  };
}

export async function canUserReviewProduct({ userId, productId, client = db }) {
  if (!userId || !productId) {
    return false;
  }

  const count = await client.order.count({
    where: {
      userId,
      status: { not: "CANCELLED" },
      items: {
        some: {
          productId,
        },
      },
    },
  });

  return count > 0;
}

export async function getProductReviewsForViewer({
  productId,
  userId = null,
  client = db,
}) {
  const reviews = await client.productReview.findMany({
    where: { productId },
    orderBy: { updatedAt: "desc" },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  const existingReview = userId
    ? reviews.find((review) => review.userId === userId) ?? null
    : null;
  const hasPurchased = userId
    ? await canUserReviewProduct({ userId, productId, client })
    : false;

  return {
    reviewSummary: buildReviewSummary(reviews),
    reviews: reviews.map(toReviewApiModel),
    viewerReviewState: {
      isLoggedIn: Boolean(userId),
      hasPurchased,
      canReview: Boolean(userId) && hasPurchased,
      existingReview: existingReview
        ? {
            id: existingReview.id,
            rating: existingReview.rating,
            comment: existingReview.comment,
          }
        : null,
    },
  };
}
```

Run: `npm run db:generate`

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/lib/product-reviews.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260625093000_add_product_reviews/migration.sql src/lib/product-reviews.js tests/lib/product-reviews.test.js
git commit -m "feat: add product review data model and helpers"
```

### Task 4: Review mutation route

**Files:**
- Create: `tests/app/product-review-route.test.js`
- Create: `src/app/api/products/[id]/reviews/route.js`

- [ ] **Step 1: Write the failing route tests**

Create `tests/app/product-review-route.test.js`:

```js
import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, requireAuthenticatedApiUser, canUserReviewProduct } = vi.hoisted(() => ({
  db: {
    product: {
      findUnique: vi.fn(),
    },
    productReview: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
  },
  requireAuthenticatedApiUser: vi.fn(),
  canUserReviewProduct: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/auth", () => ({ requireAuthenticatedApiUser }));
vi.mock("@/lib/product-reviews", async () => {
  const actual = await vi.importActual("@/lib/product-reviews");

  return {
    ...actual,
    canUserReviewProduct,
  };
});

import { POST } from "@/app/api/products/[id]/reviews/route";

async function readJson(response) {
  return response.json();
}

function createReviewRecord(overrides = {}) {
  return {
    id: "rev_1",
    userId: "user_customer",
    productId: "prod_1",
    rating: 5,
    comment: "Rat em va di hoc hang ngay rat on.",
    createdAt: new Date("2026-06-25T09:00:00.000Z"),
    updatedAt: new Date("2026-06-25T10:00:00.000Z"),
    user: {
      name: "MiniShop Customer",
      email: "customer@minishop.local",
    },
    ...overrides,
  };
}

describe("POST /api/products/[id]/reviews", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 for anonymous requests", async () => {
    requireAuthenticatedApiUser.mockResolvedValue(
      Response.json({ error: { message: "Authentication required." } }, { status: 401 }),
    );

    const response = await POST(
      new Request("http://localhost/api/products/prod_1/reviews", {
        method: "POST",
        body: JSON.stringify({ rating: 5, comment: "Rat em va di hoc hang ngay rat on." }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "prod_1" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 403 when the user has not purchased the product", async () => {
    requireAuthenticatedApiUser.mockResolvedValue({
      id: "user_customer",
      role: "CUSTOMER",
    });
    db.product.findUnique.mockResolvedValue({
      id: "prod_1",
      isActive: true,
      slug: "air-runner-basic",
    });
    canUserReviewProduct.mockResolvedValue(false);

    const response = await POST(
      new Request("http://localhost/api/products/prod_1/reviews", {
        method: "POST",
        body: JSON.stringify({ rating: 5, comment: "Rat em va di hoc hang ngay rat on." }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "prod_1" }) },
    );

    expect(response.status).toBe(403);
    expect(await readJson(response)).toEqual({
      error: { message: "You must purchase this product before reviewing it." },
    });
  });

  it("creates a review for an eligible purchaser", async () => {
    requireAuthenticatedApiUser.mockResolvedValue({
      id: "user_customer",
      role: "CUSTOMER",
    });
    db.product.findUnique.mockResolvedValue({
      id: "prod_1",
      isActive: true,
      slug: "air-runner-basic",
    });
    canUserReviewProduct.mockResolvedValue(true);
    db.productReview.findUnique.mockResolvedValue(null);
    db.productReview.create.mockResolvedValue(createReviewRecord());
    db.productReview.findMany.mockResolvedValue([createReviewRecord()]);

    const response = await POST(
      new Request("http://localhost/api/products/prod_1/reviews", {
        method: "POST",
        body: JSON.stringify({ rating: 5, comment: "Rat em va di hoc hang ngay rat on." }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "prod_1" }) },
    );

    expect(response.status).toBe(201);
    expect(db.productReview.create).toHaveBeenCalledWith({
      data: {
        userId: "user_customer",
        productId: "prod_1",
        rating: 5,
        comment: "Rat em va di hoc hang ngay rat on.",
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });
  });

  it("updates the existing review on second submit", async () => {
    requireAuthenticatedApiUser.mockResolvedValue({
      id: "user_customer",
      role: "CUSTOMER",
    });
    db.product.findUnique.mockResolvedValue({
      id: "prod_1",
      isActive: true,
      slug: "air-runner-basic",
    });
    canUserReviewProduct.mockResolvedValue(true);
    db.productReview.findUnique.mockResolvedValue(createReviewRecord());
    db.productReview.update.mockResolvedValue(
      createReviewRecord({
        rating: 4,
        comment: "Da sua lai sau khi di hoc them mot tuan.",
      }),
    );
    db.productReview.findMany.mockResolvedValue([
      createReviewRecord({
        rating: 4,
        comment: "Da sua lai sau khi di hoc them mot tuan.",
      }),
    ]);

    const response = await POST(
      new Request("http://localhost/api/products/prod_1/reviews", {
        method: "POST",
        body: JSON.stringify({
          rating: 4,
          comment: "Da sua lai sau khi di hoc them mot tuan.",
        }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "prod_1" }) },
    );

    expect(response.status).toBe(200);
    expect(db.productReview.create).not.toHaveBeenCalled();
    expect(db.productReview.update).toHaveBeenCalledWith({
      where: { id: "rev_1" },
      data: {
        rating: 4,
        comment: "Da sua lai sau khi di hoc them mot tuan.",
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/app/product-review-route.test.js`
Expected: FAIL because `src/app/api/products/[id]/reviews/route.js` does not exist.

- [ ] **Step 3: Implement the review route**

Create `src/app/api/products/[id]/reviews/route.js`:

```js
import { revalidatePath } from "next/cache";
import { handleRouteError, jsonError } from "@/lib/api-response";
import { requireAuthenticatedApiUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  canUserReviewProduct,
  getProductReviewsForViewer,
  productReviewSchema,
  toReviewApiModel,
} from "@/lib/product-reviews";

const reviewInclude = Object.freeze({
  user: {
    select: {
      name: true,
      email: true,
    },
  },
});

export async function POST(request, { params }) {
  try {
    const user = await requireAuthenticatedApiUser();

    if (user instanceof Response) {
      return user;
    }

    const { id } = await params;
    const payload = productReviewSchema.parse(await request.json());
    const product = await db.product.findUnique({
      where: { id },
      select: {
        id: true,
        isActive: true,
        slug: true,
      },
    });

    if (!product || !product.isActive) {
      return jsonError("Product not found.", 404);
    }

    const eligible = await canUserReviewProduct({
      userId: user.id,
      productId: product.id,
    });

    if (!eligible) {
      return jsonError(
        "You must purchase this product before reviewing it.",
        403,
      );
    }

    const existingReview = await db.productReview.findUnique({
      where: {
        userId_productId: {
          userId: user.id,
          productId: product.id,
        },
      },
      include: reviewInclude,
    });

    const review = existingReview
      ? await db.productReview.update({
          where: { id: existingReview.id },
          data: {
            rating: payload.rating,
            comment: payload.comment,
          },
          include: reviewInclude,
        })
      : await db.productReview.create({
          data: {
            userId: user.id,
            productId: product.id,
            rating: payload.rating,
            comment: payload.comment,
          },
          include: reviewInclude,
        });

    const reviewData = await getProductReviewsForViewer({
      productId: product.id,
      userId: user.id,
    });

    revalidatePath(`/products/${product.slug}`);

    return Response.json(
      {
        review: toReviewApiModel(review),
        reviewSummary: reviewData.reviewSummary,
      },
      { status: existingReview ? 200 : 201 },
    );
  } catch (error) {
    return handleRouteError(error, {
      treatJsonSyntaxErrorAsBadRequest: true,
    });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/app/product-review-route.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/app/product-review-route.test.js src/app/api/products/[id]/reviews/route.js
git commit -m "feat: add verified-purchase review route"
```

### Task 5: Product detail review UI and read models

**Files:**
- Create: `src/components/product-review-section.js`
- Create: `src/components/product-review-form.js`
- Create: `tests/app/product-detail-page.test.js`
- Modify: `tests/lib/products.test.js`
- Modify: `src/lib/products.js`
- Modify: `src/app/products/[slug]/page.js`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Write the failing rendering tests**

Create `tests/app/product-detail-page.test.js`:

```js
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { transformSync } from "esbuild";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getCurrentUser,
  getProductBySlug,
  getProductSlugs,
  getRelatedProducts,
  getProductReviewsForViewer,
  formatVnd,
} = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getProductBySlug: vi.fn(),
  getProductSlugs: vi.fn(),
  getRelatedProducts: vi.fn(),
  getProductReviewsForViewer: vi.fn(),
  formatVnd: vi.fn(() => "1.290.000 đ"),
}));

function loadPageModule(relativePath, mockMap) {
  const filePath = path.resolve(process.cwd(), relativePath);
  const source = readFileSync(filePath, "utf8");
  const { code } = transformSync(source, {
    loader: "jsx",
    format: "cjs",
    jsx: "automatic",
    target: "es2020",
    sourcefile: filePath,
  });
  const compiledModule = { exports: {} };
  const localRequire = (specifier) => {
    if (specifier in mockMap) {
      return mockMap[specifier];
    }

    return require(specifier);
  };
  const script = new vm.Script(`(function(require,module,exports){${code}\n})`, {
    filename: filePath,
  });

  script.runInThisContext()(localRequire, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}

function createProduct() {
  return {
    id: "prod_1",
    slug: "air-runner-basic",
    name: "Air Runner Basic",
    category: "Running",
    badge: "Bestseller",
    description: "Demo product detail.",
    price: 1290000,
    originalPrice: null,
    image: null,
    note: "Dễ phối đồ",
    inStock: true,
    featured: true,
    isActive: true,
  };
}

describe("product detail review section", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProductSlugs.mockResolvedValue([]);
    getProductBySlug.mockResolvedValue(createProduct());
    getRelatedProducts.mockResolvedValue([]);
    getCurrentUser.mockResolvedValue(null);
    getProductReviewsForViewer.mockResolvedValue({
      reviewSummary: {
        averageRating: 0,
        reviewCount: 0,
      },
      reviews: [],
      viewerReviewState: {
        isLoggedIn: false,
        hasPurchased: false,
        canReview: false,
        existingReview: null,
      },
    });
  });

  it("shows the login CTA for anonymous viewers", async () => {
    const { default: ProductDetailPage } = loadPageModule("src/app/products/[slug]/page.js", {
      "next/link": { __esModule: true, default: "a" },
      "next/navigation": { notFound: vi.fn() },
      "@/components/add-to-cart-button": { AddToCartButton: "add-to-cart-button" },
      "@/components/product-image": { ProductImage: "product-image" },
      "@/components/product-review-section": { ProductReviewSection: "product-review-section" },
      "@/lib/auth": { getCurrentUser },
      "@/lib/products": { getProductBySlug, getProductSlugs, getRelatedProducts },
      "@/lib/product-reviews": { getProductReviewsForViewer },
      "@/lib/format-vnd": { formatVnd },
    });

    const page = await ProductDetailPage({
      params: Promise.resolve({ slug: "air-runner-basic" }),
    });

    expect(JSON.stringify(page)).toContain("product-review-section");
    expect(getProductReviewsForViewer).toHaveBeenCalledWith({
      productId: "prod_1",
      userId: null,
    });
  });

  it("passes purchaser review state into the review section", async () => {
    getCurrentUser.mockResolvedValue({
      id: "user_customer",
      role: "CUSTOMER",
      email: "customer@minishop.local",
      name: "MiniShop Customer",
    });
    getProductReviewsForViewer.mockResolvedValue({
      reviewSummary: {
        averageRating: 4.5,
        reviewCount: 2,
      },
      reviews: [
        {
          id: "rev_1",
          rating: 5,
          comment: "Rat em va di hoc hang ngay rat on.",
          reviewerName: "MiniShop Customer",
          createdAt: "2026-06-25T09:00:00.000Z",
          updatedAt: "2026-06-25T10:00:00.000Z",
        },
      ],
      viewerReviewState: {
        isLoggedIn: true,
        hasPurchased: true,
        canReview: true,
        existingReview: {
          id: "rev_1",
          rating: 5,
          comment: "Rat em va di hoc hang ngay rat on.",
        },
      },
    });

    const { default: ProductDetailPage } = loadPageModule("src/app/products/[slug]/page.js", {
      "next/link": { __esModule: true, default: "a" },
      "next/navigation": { notFound: vi.fn() },
      "@/components/add-to-cart-button": { AddToCartButton: "add-to-cart-button" },
      "@/components/product-image": { ProductImage: "product-image" },
      "@/components/product-review-section": ({ reviewSummary, viewerReviewState }) => ({
        type: "product-review-section",
        props: { reviewSummary, viewerReviewState },
      }),
      "@/lib/auth": { getCurrentUser },
      "@/lib/products": { getProductBySlug, getProductSlugs, getRelatedProducts },
      "@/lib/product-reviews": { getProductReviewsForViewer },
      "@/lib/format-vnd": { formatVnd },
    });

    const page = await ProductDetailPage({
      params: Promise.resolve({ slug: "air-runner-basic" }),
    });

    expect(JSON.stringify(page)).toContain('"averageRating":4.5');
    expect(JSON.stringify(page)).toContain('"hasPurchased":true');
    expect(JSON.stringify(page)).toContain('"existingReview"');
  });
});
```

Update `tests/lib/products.test.js`:

```js
expect(
  toProductViewModel({
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
    category: { name: "Running" },
  }),
).toEqual({
  id: "prod_1",
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/lib/products.test.js tests/app/product-detail-page.test.js`
Expected:
- `tests/lib/products.test.js` fails because `id` is missing from the product view model
- `tests/app/product-detail-page.test.js` fails because the page does not load review state or render `ProductReviewSection`

- [ ] **Step 3: Implement review reads and UI**

Update `src/lib/products.js`:

```js
export function toProductViewModel(product) {
  return {
    id: product.id,
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
```

Create `src/components/product-review-form.js`:

```js
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const defaultState = {
  errorMessage: "",
  successMessage: "",
  isSubmitting: false,
};

export function ProductReviewForm({ productId, existingReview = null }) {
  const router = useRouter();
  const [rating, setRating] = useState(existingReview?.rating ?? 5);
  const [comment, setComment] = useState(existingReview?.comment ?? "");
  const [state, setState] = useState(defaultState);

  async function handleSubmit(event) {
    event.preventDefault();
    setState({ errorMessage: "", successMessage: "", isSubmitting: true });

    try {
      const response = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          rating: Number(rating),
          comment,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setState({
          errorMessage: payload?.error?.message ?? "Khong the gui danh gia luc nay.",
          successMessage: "",
          isSubmitting: false,
        });
        return;
      }

      setState({
        errorMessage: "",
        successMessage: existingReview
          ? "Da cap nhat danh gia cua ban."
          : "Da gui danh gia cua ban.",
        isSubmitting: false,
      });

      router.refresh();
    } catch {
      setState({
        errorMessage: "Khong the gui danh gia luc nay.",
        successMessage: "",
        isSubmitting: false,
      });
    }
  }

  return (
    <form className="product-review-form" onSubmit={handleSubmit}>
      <label className="product-review-form__field">
        <span>So sao</span>
        <select value={rating} onChange={(event) => setRating(event.target.value)}>
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={value}>
              {value} sao
            </option>
          ))}
        </select>
      </label>

      <label className="product-review-form__field product-review-form__field--full">
        <span>Binh luan</span>
        <textarea
          rows="5"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          minLength={10}
          required
        />
      </label>

      {state.errorMessage ? (
        <p className="product-review-form__message" role="alert">
          {state.errorMessage}
        </p>
      ) : null}

      {state.successMessage ? (
        <p className="product-review-form__message" role="status">
          {state.successMessage}
        </p>
      ) : null}

      <button
        type="submit"
        className="button button--primary"
        disabled={state.isSubmitting}
      >
        {state.isSubmitting
          ? "Dang gui..."
          : existingReview
            ? "Cap nhat danh gia"
            : "Gui danh gia"}
      </button>
    </form>
  );
}
```

Create `src/components/product-review-section.js`:

```js
import Link from "next/link";
import { ProductReviewForm } from "@/components/product-review-form";

export function ProductReviewSection({
  productId,
  productSlug,
  reviewSummary,
  reviews,
  viewerReviewState,
}) {
  return (
    <section className="product-detail__reviews">
      <div className="site-shell">
        <div className="section-heading">
          <p className="section-heading__eyebrow">Danh gia san pham</p>
          <h2>
            {reviewSummary.reviewCount > 0
              ? `${reviewSummary.averageRating}/5 tu ${reviewSummary.reviewCount} danh gia`
              : "Chua co danh gia nao"}
          </h2>
        </div>

        <div className="product-review-layout">
          <div className="product-review-panel">
            {!viewerReviewState.isLoggedIn ? (
              <div className="product-review-empty">
                <p>Dang nhap de gui danh gia cho san pham nay.</p>
                <Link
                  href={`/login?next=${encodeURIComponent(`/products/${productSlug}`)}`}
                  className="button button--secondary"
                >
                  Dang nhap
                </Link>
              </div>
            ) : !viewerReviewState.hasPurchased ? (
              <div className="product-review-empty">
                <p>Ban can mua san pham nay truoc khi danh gia.</p>
              </div>
            ) : (
              <ProductReviewForm
                productId={productId}
                existingReview={viewerReviewState.existingReview}
              />
            )}
          </div>

          <div className="product-review-list">
            {reviews.length === 0 ? (
              <p className="product-review-empty">
                Chua co binh luan nao cho san pham nay.
              </p>
            ) : (
              reviews.map((review) => (
                <article key={review.id} className="product-review-item">
                  <div className="product-review-item__meta">
                    <strong>{review.reviewerName}</strong>
                    <span>{review.rating}/5</span>
                  </div>
                  <p>{review.comment}</p>
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
```

Update `src/app/products/[slug]/page.js`:

```js
import { ProductReviewSection } from "@/components/product-review-section";
import { getCurrentUser } from "@/lib/auth";
import { getProductReviewsForViewer } from "@/lib/product-reviews";

export default async function ProductDetailPage({ params }) {
  const { slug } = await params;
  const currentUser = await getCurrentUser();
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const [relatedProducts, reviewData] = await Promise.all([
    getRelatedProducts(product.slug),
    getProductReviewsForViewer({
      productId: product.id,
      userId: currentUser?.id ?? null,
    }),
  ]);
  const isSale = Boolean(product.originalPrice);

  return (
    <main className="product-detail">
      {/* existing hero section unchanged */}

      <ProductReviewSection
        productId={product.id}
        productSlug={product.slug}
        reviewSummary={reviewData.reviewSummary}
        reviews={reviewData.reviews}
        viewerReviewState={reviewData.viewerReviewState}
      />

      <section className="product-detail__related">
        {/* existing related products section unchanged */}
      </section>
    </main>
  );
}
```

Append to `src/app/globals.css`:

```css
.product-detail__reviews {
  padding: 0 0 4rem;
}

.product-review-layout {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: minmax(0, 420px) minmax(0, 1fr);
  align-items: start;
}

.product-review-panel,
.product-review-item,
.product-review-empty {
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 1.5rem;
  background: #fff;
  padding: 1.5rem;
}

.product-review-form {
  display: grid;
  gap: 1rem;
}

.product-review-form__field {
  display: grid;
  gap: 0.5rem;
}

.product-review-form__field--full textarea,
.product-review-form__field select {
  width: 100%;
  border: 1px solid rgba(15, 23, 42, 0.16);
  border-radius: 1rem;
  padding: 0.85rem 1rem;
  font: inherit;
}

.product-review-list {
  display: grid;
  gap: 1rem;
}

.product-review-item__meta {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

@media (max-width: 900px) {
  .product-review-layout {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/lib/products.test.js tests/app/product-detail-page.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/lib/products.test.js tests/app/product-detail-page.test.js src/lib/products.js src/app/products/[slug]/page.js src/components/product-review-section.js src/components/product-review-form.js src/app/globals.css
git commit -m "feat: render product reviews on detail pages"
```

### Task 6: Full feature verification

**Files:**
- Modify: none
- Test: `tests/lib/auth.test.js`
- Test: `tests/app/checkout-page-auth.test.js`
- Test: `tests/app/order-route.test.js`
- Test: `tests/lib/product-reviews.test.js`
- Test: `tests/app/product-review-route.test.js`
- Test: `tests/lib/products.test.js`
- Test: `tests/app/product-detail-page.test.js`

- [ ] **Step 1: Run the focused unit and route suite**

Run:

```bash
npm test -- tests/lib/auth.test.js tests/app/checkout-page-auth.test.js tests/app/order-route.test.js tests/lib/product-reviews.test.js tests/app/product-review-route.test.js tests/lib/products.test.js tests/app/product-detail-page.test.js
```

Expected: PASS for the entire focused review feature suite.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: PASS with no new lint errors.

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: PASS. Product detail, checkout, and new review route compile cleanly.

- [ ] **Step 4: Manual verification**

Run:

```bash
npm run db:generate
npm run dev
```

Then verify:

1. Open `/checkout` while logged out → redirected to `/login?next=%2Fcheckout`
2. Log in as `customer@minishop.local / customer123`
3. Add a product to cart and complete checkout
4. Open that product detail page
5. Confirm the review section now allows submit
6. Submit a 5-star review with a comment longer than 10 characters
7. Confirm the review appears publicly immediately
8. Submit again with edited text and rating
9. Confirm the same review updates instead of duplicating
10. Log out, log in as a different user without a purchase, and confirm the form is replaced with the purchase-required message

- [ ] **Step 5: Commit the verified feature**

```bash
git add prisma/schema.prisma prisma/migrations/20260625093000_add_product_reviews/migration.sql src/lib/auth.js src/app/checkout/page.js src/components/checkout-page-content.js src/app/api/orders/route.js src/lib/product-reviews.js src/app/api/products/[id]/reviews/route.js src/lib/products.js src/app/products/[slug]/page.js src/components/product-review-section.js src/components/product-review-form.js src/app/globals.css tests/lib/auth.test.js tests/app/checkout-page-auth.test.js tests/app/order-route.test.js tests/lib/product-reviews.test.js tests/app/product-review-route.test.js tests/lib/products.test.js tests/app/product-detail-page.test.js
git commit -m "feat: add verified-purchase product reviews"
```

## Self-review

### Spec coverage

- Verified-purchase rule: covered by Task 2 order ownership and Task 3/5 permission helpers + UI state
- One review per user/product: covered by Task 3 schema unique constraint and route update behavior
- Edit existing review: covered by Task 4 route update path and Task 5 prefilled form
- Public immediate display: covered by Task 4 response + Task 5 reload/render
- Product detail summary/list/viewer state: covered by Task 5
- Checkout tied to logged-in user: covered by Task 2

No spec gaps remain.

### Placeholder scan

- No `TBD`, `TODO`, “similar to Task N”, or unspecified file paths remain.
- Migration path is concrete.
- Each task has exact commands and concrete code blocks.

### Type consistency

- Auth helpers use `requireAuthenticatedUser` / `requireAuthenticatedApiUser` consistently across Task 1 and Task 2.
- Review helper names stay consistent across Task 3, Task 4, and Task 5.
- Review route path, payload shape, and response semantics match the approved spec.
