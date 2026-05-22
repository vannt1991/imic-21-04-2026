# MiniShop Buổi 8 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first real checkout flow to MiniShop so learners can submit customer info from `/checkout`, create `Order` + `OrderItem` rows through `POST /api/orders`, decrement stock in a transaction, clear the cart, and land on `/order-success`.

**Architecture:** Keep the new order Route Handler thin. Put checkout payload validation, cart-line collapsing, stock checks, and API serialization in `src/lib/order-api.js`, then let `src/app/api/orders/route.js` only parse JSON, fetch the referenced products by slug, run the transaction, and map domain errors to JSON responses. Keep the frontend local-cart approach from buổi 4 by sending only `{ slug, quantity }` to the server, and extend `CartProvider` with `clearCart()` so the client flow can move from `/cart` to `/checkout` to `/order-success` without introducing auth or server-side carts yet.

**Tech Stack:** Next.js 16 App Router, React 19, JavaScript, Prisma ORM, SQLite, Zod, Vitest, `fetch`, `localStorage`, global CSS.

---

## Current Codebase Notes

- `prisma/schema.prisma` already has `Order` and `OrderItem`, so buổi 8 needs no migration if it stays within the existing columns.
- `prisma/seed.mjs` already wipes `orderItem` and `order` before reseeding products, which is ideal for repeatable checkout demos and smoke tests.
- `src/lib/cart.js` currently stores only `slug`, `name`, `price`, `badge`, and `quantity` in local storage. That is enough for the UI, but the server must ignore client price/name and re-resolve products from Prisma.
- `src/components/cart-provider.js` exposes add/update/remove but not `clearCart`, so success flow currently has no way to empty the cart after order creation.
- `src/components/cart-page-content.js` explicitly says checkout backend does not exist yet, which should be replaced in buổi 8.
- `src/lib/api-response.js` already handles shared Zod/Prisma JSON envelopes, so the order route should reuse `handleRouteError()` and only special-case domain conflicts like missing products or insufficient stock.
- `src/app/api/products/[id]/route.js` already maps delete conflicts for ordered products to `409`, and buổi 8 will make that conflict real once orders exist.
- No `/checkout`, `/order-success`, or `/api/orders` routes exist yet.

## File Map

- Create: `src/lib/order-api.js`
- Create: `tests/lib/order-api.test.js`
- Create: `src/app/api/orders/route.js`
- Create: `tests/app/order-route.test.js`
- Modify: `src/lib/cart.js`
- Modify: `tests/lib/cart.test.js`
- Modify: `src/components/cart-provider.js`
- Modify: `src/components/cart-page-content.js`
- Create: `src/app/checkout/page.js`
- Create: `src/components/checkout-page-content.js`
- Create: `src/app/order-success/page.js`
- Modify: `src/app/globals.css`

## Verification Strategy

- Use `npm run test -- tests/lib/order-api.test.js` for the pure checkout/order helper layer.
- Use `npm run test -- tests/lib/cart.test.js` after adding `toCheckoutItems()` so the local-cart payload stays deterministic.
- Use `npm run test -- tests/app/order-route.test.js` for `POST /api/orders` success + failure cases.
- Run `npm run lint` and `npm run build` to catch App Router route signatures, client/server boundary mistakes, and missing imports.
- Run `npm run db:seed` before manual browser testing so stock counts are predictable.
- Smoke test `/products` -> `/cart` -> `/checkout` -> `/order-success`, then verify the ordered product stock dropped in `/admin/products`.

---

### Task 1: Add reusable order helpers with pure Vitest coverage

**Files:**
- Create: `src/lib/order-api.js`
- Create: `tests/lib/order-api.test.js`

- [ ] **Step 1: Write failing tests for the order helper contract**

Create `tests/lib/order-api.test.js` with this suite:

```js
import { describe, expect, it } from "vitest";
import {
  buildOrderDraft,
  createOrderSchema,
  InsufficientStockError,
  MissingProductsError,
  toOrderApiModel,
} from "../../src/lib/order-api.js";

describe("order api helpers", () => {
  it("parses checkout payload and trims customer fields", () => {
    const payload = createOrderSchema.parse({
      customerName: "  Van Nguyen  ",
      customerEmail: "  van@example.com  ",
      customerPhone: " 0901234567 ",
      shippingAddress: "  12 Nguyen Trai, District 1  ",
      items: [{ slug: "air-runner-basic", quantity: 2 }],
    });

    expect(payload).toEqual({
      customerName: "Van Nguyen",
      customerEmail: "van@example.com",
      customerPhone: "0901234567",
      shippingAddress: "12 Nguyen Trai, District 1",
      items: [{ slug: "air-runner-basic", quantity: 2 }],
    });
  });

  it("merges duplicate cart lines and calculates total from server products", () => {
    const payload = createOrderSchema.parse({
      customerName: "Van Nguyen",
      customerEmail: "van@example.com",
      customerPhone: "0901234567",
      shippingAddress: "12 Nguyen Trai, District 1",
      items: [
        { slug: "air-runner-basic", quantity: 1 },
        { slug: "air-runner-basic", quantity: 2 },
        { slug: "street-flex-pro", quantity: 1 },
      ],
    });

    expect(
      buildOrderDraft(payload, [
        {
          id: "prod_1",
          slug: "air-runner-basic",
          name: "Air Runner Basic",
          price: 1290000,
          stock: 12,
          isActive: true,
        },
        {
          id: "prod_2",
          slug: "street-flex-pro",
          name: "Street Flex Pro",
          price: 1890000,
          stock: 9,
          isActive: true,
        },
      ]),
    ).toEqual({
      customer: {
        customerName: "Van Nguyen",
        customerEmail: "van@example.com",
        customerPhone: "0901234567",
        shippingAddress: "12 Nguyen Trai, District 1",
      },
      total: 5760000,
      stockReservations: [
        { productId: "prod_1", slug: "air-runner-basic", quantity: 3 },
        { productId: "prod_2", slug: "street-flex-pro", quantity: 1 },
      ],
      orderItems: [
        { productId: "prod_1", quantity: 3, price: 1290000 },
        { productId: "prod_2", quantity: 1, price: 1890000 },
      ],
    });
  });

  it("throws missing-product error when a cart slug is unavailable", () => {
    const payload = createOrderSchema.parse({
      customerName: "Van Nguyen",
      customerEmail: "van@example.com",
      customerPhone: "0901234567",
      shippingAddress: "12 Nguyen Trai, District 1",
      items: [{ slug: "missing-shoe", quantity: 1 }],
    });

    expect(() => buildOrderDraft(payload, [])).toThrow(MissingProductsError);
  });

  it("throws stock error when requested quantity exceeds inventory", () => {
    const payload = createOrderSchema.parse({
      customerName: "Van Nguyen",
      customerEmail: "van@example.com",
      customerPhone: "0901234567",
      shippingAddress: "12 Nguyen Trai, District 1",
      items: [{ slug: "trail-guard-mid", quantity: 1 }],
    });

    expect(() =>
      buildOrderDraft(payload, [
        {
          id: "prod_4",
          slug: "trail-guard-mid",
          name: "Trail Guard Mid",
          price: 1590000,
          stock: 0,
          isActive: true,
        },
      ]),
    ).toThrow(InsufficientStockError);
  });

  it("serializes nested order data into an API-safe JSON shape", () => {
    expect(
      toOrderApiModel({
        id: "ord_1",
        customerName: "Van Nguyen",
        customerEmail: "van@example.com",
        customerPhone: "0901234567",
        shippingAddress: "12 Nguyen Trai, District 1",
        status: "PENDING",
        total: 4470000,
        createdAt: new Date("2026-05-22T03:00:00.000Z"),
        updatedAt: new Date("2026-05-22T03:00:00.000Z"),
        items: [
          {
            id: "item_1",
            quantity: 2,
            price: 1290000,
            product: {
              id: "prod_1",
              slug: "air-runner-basic",
              name: "Air Runner Basic",
            },
          },
        ],
      }),
    ).toEqual({
      id: "ord_1",
      customerName: "Van Nguyen",
      customerEmail: "van@example.com",
      customerPhone: "0901234567",
      shippingAddress: "12 Nguyen Trai, District 1",
      status: "PENDING",
      total: 4470000,
      items: [
        {
          id: "item_1",
          quantity: 2,
          price: 1290000,
          product: {
            id: "prod_1",
            slug: "air-runner-basic",
            name: "Air Runner Basic",
          },
        },
      ],
      createdAt: "2026-05-22T03:00:00.000Z",
      updatedAt: "2026-05-22T03:00:00.000Z",
    });
  });
});
```

- [ ] **Step 2: Run the helper test file to verify the module does not exist yet**

Run:
```bash
npm run test -- tests/lib/order-api.test.js
```

Expected:
- Vitest fails with a module-not-found error for `src/lib/order-api.js`.

- [ ] **Step 3: Implement the shared order helper module**

Create `src/lib/order-api.js` with this code:

```js
import { z } from "zod";

const requiredString = z.string().trim().min(1);
const positiveInt = z.number().int().positive();

const checkoutItemSchema = z
  .object({
    slug: requiredString,
    quantity: positiveInt,
  })
  .strict();

export class MissingProductsError extends Error {
  constructor(slugs) {
    super("Some products are unavailable.");
    this.name = "MissingProductsError";
    this.slugs = slugs;
  }
}

export class InsufficientStockError extends Error {
  constructor(items) {
    super("Some products are out of stock.");
    this.name = "InsufficientStockError";
    this.items = items;
  }
}

export const createOrderSchema = z
  .object({
    customerName: requiredString,
    customerEmail: z.string().trim().email(),
    customerPhone: requiredString,
    shippingAddress: requiredString,
    items: z.array(checkoutItemSchema).min(1, "Cart is empty."),
  })
  .strict();

function collapseCheckoutItems(items) {
  const quantityBySlug = new Map();

  for (const item of items) {
    quantityBySlug.set(
      item.slug,
      (quantityBySlug.get(item.slug) ?? 0) + item.quantity,
    );
  }

  return Array.from(quantityBySlug.entries()).map(([slug, quantity]) => ({
    slug,
    quantity,
  }));
}

export function buildOrderDraft(payload, products) {
  const productMap = new Map(products.map((product) => [product.slug, product]));
  const unavailableSlugs = [];
  const stockIssues = [];
  const stockReservations = [];
  const orderItems = [];

  for (const item of collapseCheckoutItems(payload.items)) {
    const product = productMap.get(item.slug);

    if (!product || !product.isActive) {
      unavailableSlugs.push(item.slug);
      continue;
    }

    if (product.stock < item.quantity) {
      stockIssues.push({
        slug: product.slug,
        requestedQuantity: item.quantity,
        availableStock: product.stock,
      });
      continue;
    }

    stockReservations.push({
      productId: product.id,
      slug: product.slug,
      quantity: item.quantity,
    });
    orderItems.push({
      productId: product.id,
      quantity: item.quantity,
      price: product.price,
    });
  }

  if (unavailableSlugs.length > 0) {
    throw new MissingProductsError(unavailableSlugs);
  }

  if (stockIssues.length > 0) {
    throw new InsufficientStockError(stockIssues);
  }

  return {
    customer: {
      customerName: payload.customerName,
      customerEmail: payload.customerEmail,
      customerPhone: payload.customerPhone,
      shippingAddress: payload.shippingAddress,
    },
    total: orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    ),
    stockReservations,
    orderItems,
  };
}

export const orderApiInclude = {
  items: {
    include: {
      product: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
    },
  },
};

export function toOrderApiModel(order) {
  return {
    id: order.id,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    shippingAddress: order.shippingAddress,
    status: order.status,
    total: order.total,
    items: order.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      price: item.price,
      product: {
        id: item.product.id,
        slug: item.product.slug,
        name: item.product.name,
      },
    })),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}
```

- [ ] **Step 4: Run the helper tests and the existing cart tests**

Run:
```bash
npm run test -- tests/lib/order-api.test.js
npm run test -- tests/lib/cart.test.js
```

Expected:
- `tests/lib/order-api.test.js` passes.
- `tests/lib/cart.test.js` still passes unchanged.

- [ ] **Step 5: Commit the helper layer**

Run:
```bash
git add src/lib/order-api.js tests/lib/order-api.test.js
git commit -m "feat: add order helper layer"
```

---

### Task 2: Add `POST /api/orders` with transaction-based stock decrement

**Files:**
- Create: `src/app/api/orders/route.js`
- Create: `tests/app/order-route.test.js`

- [ ] **Step 1: Write route tests before the handler**

Create `tests/app/order-route.test.js` with this suite:

```js
import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, tx } = vi.hoisted(() => ({
  tx: {
    product: {
      updateMany: vi.fn(),
    },
    order: {
      create: vi.fn(),
    },
  },
  db: {
    product: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  db,
}));

import { POST as createOrder } from "@/app/api/orders/route";

async function readJson(response) {
  return response.json();
}

describe("POST /api/orders", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    db.$transaction.mockImplementation((callback) => callback(tx));
  });

  it("rejects invalid bodies with the shared validation envelope", async () => {
    const response = await createOrder(
      new Request("http://localhost/api/orders", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(400);
    expect(await readJson(response)).toEqual({
      error: {
        message: "Validation failed.",
        details: expect.arrayContaining([
          {
            path: "customerName",
            message: "Invalid input: expected string, received undefined",
          },
          {
            path: "items",
            message: "Invalid input: expected array, received undefined",
          },
        ]),
      },
    });
    expect(db.product.findMany).not.toHaveBeenCalled();
  });

  it("returns 404 when one or more cart products are unavailable", async () => {
    db.product.findMany.mockResolvedValue([
      {
        id: "prod_1",
        slug: "air-runner-basic",
        name: "Air Runner Basic",
        price: 1290000,
        stock: 12,
        isActive: true,
      },
    ]);

    const response = await createOrder(
      new Request("http://localhost/api/orders", {
        method: "POST",
        body: JSON.stringify({
          customerName: "Van Nguyen",
          customerEmail: "van@example.com",
          customerPhone: "0901234567",
          shippingAddress: "12 Nguyen Trai, District 1",
          items: [
            { slug: "air-runner-basic", quantity: 1 },
            { slug: "missing-shoe", quantity: 1 },
          ],
        }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(404);
    expect(await readJson(response)).toEqual({
      error: {
        message: "Some products are unavailable.",
        details: { slugs: ["missing-shoe"] },
      },
    });
  });

  it("returns 409 when requested quantity exceeds available stock", async () => {
    db.product.findMany.mockResolvedValue([
      {
        id: "prod_4",
        slug: "trail-guard-mid",
        name: "Trail Guard Mid",
        price: 1590000,
        stock: 0,
        isActive: true,
      },
    ]);

    const response = await createOrder(
      new Request("http://localhost/api/orders", {
        method: "POST",
        body: JSON.stringify({
          customerName: "Van Nguyen",
          customerEmail: "van@example.com",
          customerPhone: "0901234567",
          shippingAddress: "12 Nguyen Trai, District 1",
          items: [{ slug: "trail-guard-mid", quantity: 1 }],
        }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(409);
    expect(await readJson(response)).toEqual({
      error: {
        message: "Some products are out of stock.",
        details: [
          {
            slug: "trail-guard-mid",
            requestedQuantity: 1,
            availableStock: 0,
          },
        ],
      },
    });
  });

  it("creates an order, nested order items, and decrements stock in a transaction", async () => {
    db.product.findMany.mockResolvedValue([
      {
        id: "prod_1",
        slug: "air-runner-basic",
        name: "Air Runner Basic",
        price: 1290000,
        stock: 12,
        isActive: true,
      },
      {
        id: "prod_2",
        slug: "street-flex-pro",
        name: "Street Flex Pro",
        price: 1890000,
        stock: 9,
        isActive: true,
      },
    ]);
    tx.product.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });
    tx.order.create.mockResolvedValue({
      id: "ord_1",
      customerName: "Van Nguyen",
      customerEmail: "van@example.com",
      customerPhone: "0901234567",
      shippingAddress: "12 Nguyen Trai, District 1",
      status: "PENDING",
      total: 4470000,
      createdAt: new Date("2026-05-22T03:00:00.000Z"),
      updatedAt: new Date("2026-05-22T03:00:00.000Z"),
      items: [
        {
          id: "item_1",
          quantity: 2,
          price: 1290000,
          product: {
            id: "prod_1",
            slug: "air-runner-basic",
            name: "Air Runner Basic",
          },
        },
        {
          id: "item_2",
          quantity: 1,
          price: 1890000,
          product: {
            id: "prod_2",
            slug: "street-flex-pro",
            name: "Street Flex Pro",
          },
        },
      ],
    });

    const response = await createOrder(
      new Request("http://localhost/api/orders", {
        method: "POST",
        body: JSON.stringify({
          customerName: "Van Nguyen",
          customerEmail: "van@example.com",
          customerPhone: "0901234567",
          shippingAddress: "12 Nguyen Trai, District 1",
          items: [
            { slug: "air-runner-basic", quantity: 2 },
            { slug: "street-flex-pro", quantity: 1 },
          ],
        }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(201);
    expect(await readJson(response)).toEqual({
      id: "ord_1",
      customerName: "Van Nguyen",
      customerEmail: "van@example.com",
      customerPhone: "0901234567",
      shippingAddress: "12 Nguyen Trai, District 1",
      status: "PENDING",
      total: 4470000,
      items: [
        {
          id: "item_1",
          quantity: 2,
          price: 1290000,
          product: {
            id: "prod_1",
            slug: "air-runner-basic",
            name: "Air Runner Basic",
          },
        },
        {
          id: "item_2",
          quantity: 1,
          price: 1890000,
          product: {
            id: "prod_2",
            slug: "street-flex-pro",
            name: "Street Flex Pro",
          },
        },
      ],
      createdAt: "2026-05-22T03:00:00.000Z",
      updatedAt: "2026-05-22T03:00:00.000Z",
    });
    expect(db.product.findMany).toHaveBeenCalledWith({
      where: {
        slug: {
          in: ["air-runner-basic", "street-flex-pro"],
        },
      },
      select: {
        id: true,
        slug: true,
        name: true,
        price: true,
        stock: true,
        isActive: true,
      },
    });
    expect(tx.product.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        id: "prod_1",
        isActive: true,
        stock: { gte: 2 },
      },
      data: {
        stock: { decrement: 2 },
      },
    });
    expect(tx.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customerName: "Van Nguyen",
          customerEmail: "van@example.com",
          customerPhone: "0901234567",
          shippingAddress: "12 Nguyen Trai, District 1",
          status: "PENDING",
          total: 4470000,
          items: {
            create: [
              { productId: "prod_1", quantity: 2, price: 1290000 },
              { productId: "prod_2", quantity: 1, price: 1890000 },
            ],
          },
        }),
      }),
    );
  });
});
```

- [ ] **Step 2: Run the route tests to confirm the handler is missing**

Run:
```bash
npm run test -- tests/app/order-route.test.js
```

Expected:
- Vitest fails with a module-not-found error for `src/app/api/orders/route.js`.

- [ ] **Step 3: Implement the order creation Route Handler**

Create `src/app/api/orders/route.js` with this code:

```js
import { handleRouteError, jsonError } from "@/lib/api-response";
import { db } from "@/lib/db";
import {
  buildOrderDraft,
  createOrderSchema,
  InsufficientStockError,
  MissingProductsError,
  orderApiInclude,
  toOrderApiModel,
} from "@/lib/order-api";

function getUniqueSlugs(items) {
  return [...new Set(items.map((item) => item.slug))];
}

export async function POST(request) {
  try {
    const payload = createOrderSchema.parse(await request.json());
    const products = await db.product.findMany({
      where: {
        slug: {
          in: getUniqueSlugs(payload.items),
        },
      },
      select: {
        id: true,
        slug: true,
        name: true,
        price: true,
        stock: true,
        isActive: true,
      },
    });
    const draft = buildOrderDraft(payload, products);

    const order = await db.$transaction(async (tx) => {
      for (const reservation of draft.stockReservations) {
        const updateResult = await tx.product.updateMany({
          where: {
            id: reservation.productId,
            isActive: true,
            stock: { gte: reservation.quantity },
          },
          data: {
            stock: { decrement: reservation.quantity },
          },
        });

        if (updateResult.count !== 1) {
          throw new InsufficientStockError([
            {
              slug: reservation.slug,
              requestedQuantity: reservation.quantity,
              availableStock: 0,
            },
          ]);
        }
      }

      return tx.order.create({
        data: {
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
    if (error instanceof MissingProductsError) {
      return jsonError(error.message, 404, { slugs: error.slugs });
    }

    if (error instanceof InsufficientStockError) {
      return jsonError(error.message, 409, error.items);
    }

    return handleRouteError(error, {
      treatJsonSyntaxErrorAsBadRequest: true,
    });
  }
}
```

- [ ] **Step 4: Run route-level tests plus existing API regression coverage**

Run:
```bash
npm run test -- tests/app/order-route.test.js
npm run test -- tests/app/api-routes.test.js
```

Expected:
- `tests/app/order-route.test.js` passes.
- `tests/app/api-routes.test.js` still passes, confirming buổi 6 product/category APIs still behave the same.

- [ ] **Step 5: Commit the order route**

Run:
```bash
git add src/app/api/orders/route.js tests/app/order-route.test.js
git commit -m "feat: add order creation api"
```

---

### Task 3: Extend cart helpers and add the checkout page flow

**Files:**
- Modify: `src/lib/cart.js`
- Modify: `tests/lib/cart.test.js`
- Modify: `src/components/cart-provider.js`
- Modify: `src/components/cart-page-content.js`
- Create: `src/app/checkout/page.js`
- Create: `src/components/checkout-page-content.js`

- [ ] **Step 1: Add a cart helper test for the checkout payload shape**

Append this test to `tests/lib/cart.test.js`:

```js
it("maps cart state into the minimal checkout payload sent to the server", () => {
  expect(
    toCheckoutItems([
      {
        slug: "air-runner-basic",
        name: "Air Runner Basic",
        price: 1290000,
        badge: "Bestseller",
        quantity: 2,
      },
      {
        slug: " street-flex-pro ",
        name: "Street Flex Pro",
        price: 1890000,
        badge: "New",
        quantity: 1,
      },
      {
        slug: "",
        name: "Broken Item",
        price: 0,
        badge: "",
        quantity: 2,
      },
    ]),
  ).toEqual([
    { slug: "air-runner-basic", quantity: 2 },
    { slug: "street-flex-pro", quantity: 1 },
  ]);
});
```

Also update the import list at the top of `tests/lib/cart.test.js`:

```js
import {
  addCartItem,
  getCartCount,
  getCartSubtotal,
  parseStoredCart,
  removeCartItem,
  serializeCart,
  toCheckoutItems,
  updateCartItemQuantity,
} from "../../src/lib/cart.js";
```

- [ ] **Step 2: Run the cart tests to confirm the new helper is missing**

Run:
```bash
npm run test -- tests/lib/cart.test.js
```

Expected:
- Vitest fails because `toCheckoutItems` is not exported yet.

- [ ] **Step 3: Add checkout payload mapping, cart clearing, and the `/checkout` UI**

Update `src/lib/cart.js` by adding this export near the other reducers/helpers:

```js
export function toCheckoutItems(items) {
  return items
    .map((item) => ({
      slug: typeof item?.slug === "string" ? item.slug.trim() : "",
      quantity: item?.quantity,
    }))
    .filter(
      (item) =>
        item.slug.length > 0 &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0,
    );
}
```

Update `src/components/cart-provider.js` so the context exposes `clearCart()`:

```js
  function clearCart() {
    setItems([]);
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
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
```

Update the summary CTA in `src/components/cart-page-content.js`:

```jsx
            <div className="cart-summary__actions">
              <Link href="/checkout" className="button button--primary">
                Tiến hành checkout
              </Link>

              <Link href="/products" className="button button--secondary">
                Tiếp tục mua hàng
              </Link>
            </div>

            <p className="cart-summary__note">
              Buổi 8 sẽ gửi cart lên server, tự tính total từ Prisma rồi trừ tồn kho trong transaction.
            </p>
```

Create `src/app/checkout/page.js`:

```js
import { CheckoutPageContent } from "@/components/checkout-page-content";

export const metadata = {
  title: "MiniShop | Checkout",
  description: "Nhập thông tin khách hàng và tạo đơn hàng từ cart hiện tại.",
};

export default function CheckoutPage() {
  return <CheckoutPageContent />;
}
```

Create `src/components/checkout-page-content.js`:

```jsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/components/cart-provider";
import { toCheckoutItems } from "@/lib/cart";
import { formatVnd } from "@/lib/format-vnd";

const initialFormValues = {
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  shippingAddress: "",
};

function getErrorMessage(body) {
  if (body?.error?.details?.[0]?.message) {
    return body.error.details[0].message;
  }

  return body?.error?.message || "Không thể tạo đơn hàng lúc này. Vui lòng thử lại.";
}

export function CheckoutPageContent() {
  const router = useRouter();
  const { items, cartCount, subtotal, isHydrated, clearCart } = useCart();
  const [formValues, setFormValues] = useState(initialFormValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!items.length || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ...formValues,
          items: toCheckoutItems(items),
        }),
      });
      const body = await response.json();

      if (!response.ok) {
        setErrorMessage(getErrorMessage(body));
        return;
      }

      clearCart();
      router.push(`/order-success?orderId=${encodeURIComponent(body.id)}`);
    } catch {
      setErrorMessage("Không thể tạo đơn hàng lúc này. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isHydrated) {
    return (
      <main className="checkout-page">
        <section className="checkout-page__hero">
          <div className="site-shell">
            <p className="checkout-page__eyebrow">Checkout</p>
            <h1>Đang tải checkout...</h1>
          </div>
        </section>
      </main>
    );
  }

  if (!items.length) {
    return (
      <main className="checkout-page">
        <section className="checkout-page__hero">
          <div className="site-shell checkout-empty">
            <p className="checkout-page__eyebrow">Checkout</p>
            <h1>Chưa có sản phẩm để thanh toán</h1>
            <p>Hãy thêm ít nhất một sản phẩm vào giỏ hàng trước khi tạo order.</p>
            <Link href="/products" className="button button--primary">
              Quay lại danh sách sản phẩm
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="checkout-page">
      <section className="checkout-page__hero">
        <div className="site-shell">
          <p className="checkout-page__eyebrow">Checkout</p>
          <h1>Xác nhận thông tin và tạo đơn hàng</h1>
          <p className="checkout-page__description">
            Client chỉ gửi slug và quantity. Server sẽ tự tính total, kiểm tra stock, rồi lưu order trong transaction.
          </p>
        </div>
      </section>

      <section className="checkout-page__content">
        <div className="site-shell checkout-page__grid">
          <form className="checkout-form" onSubmit={handleSubmit}>
            <div className="checkout-form__header">
              <p className="checkout-form__eyebrow">Thông tin khách hàng</p>
              <h2>Form checkout của buổi 8</h2>
            </div>

            <label className="checkout-form__field">
              <span>Họ tên</span>
              <input
                type="text"
                name="customerName"
                value={formValues.customerName}
                onChange={handleChange}
                autoComplete="name"
              />
            </label>

            <label className="checkout-form__field">
              <span>Email</span>
              <input
                type="email"
                name="customerEmail"
                value={formValues.customerEmail}
                onChange={handleChange}
                autoComplete="email"
              />
            </label>

            <label className="checkout-form__field">
              <span>Số điện thoại</span>
              <input
                type="tel"
                name="customerPhone"
                value={formValues.customerPhone}
                onChange={handleChange}
                autoComplete="tel"
              />
            </label>

            <label className="checkout-form__field">
              <span>Địa chỉ giao hàng</span>
              <textarea
                name="shippingAddress"
                rows="4"
                value={formValues.shippingAddress}
                onChange={handleChange}
              />
            </label>

            {errorMessage ? (
              <p className="checkout-form__error" role="alert">
                {errorMessage}
              </p>
            ) : null}

            <div className="checkout-form__actions">
              <button
                type="submit"
                className="button button--primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Đang tạo đơn hàng..." : "Đặt hàng"}
              </button>

              <Link href="/cart" className="button button--secondary">
                Quay lại giỏ hàng
              </Link>
            </div>
          </form>

          <aside className="checkout-summary">
            <p className="checkout-summary__eyebrow">Tóm tắt đơn hàng</p>
            <h2>{cartCount} sản phẩm sẵn sàng gửi API</h2>

            <div className="checkout-summary__list">
              {items.map((item) => (
                <div key={item.slug} className="checkout-summary__line">
                  <div>
                    <strong>{item.name}</strong>
                    <p>{item.quantity} x {formatVnd(item.price)}</p>
                  </div>
                  <span>{formatVnd(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="checkout-summary__row">
              <span>Tổng số lượng</span>
              <strong>{cartCount}</strong>
            </div>

            <div className="checkout-summary__row checkout-summary__row--total">
              <span>Tổng dự kiến</span>
              <strong>{formatVnd(subtotal)}</strong>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Run the cart tests and build-check the new checkout route**

Run:
```bash
npm run test -- tests/lib/cart.test.js
npm run lint
npm run build
```

Expected:
- `tests/lib/cart.test.js` passes with the new checkout payload helper.
- `npm run lint` passes with no client/server boundary issues.
- `npm run build` passes and resolves `/checkout`.

- [ ] **Step 5: Commit the checkout page flow**

Run:
```bash
git add src/lib/cart.js tests/lib/cart.test.js src/components/cart-provider.js src/components/cart-page-content.js src/app/checkout/page.js src/components/checkout-page-content.js
git commit -m "feat: add checkout page flow"
```

---

### Task 4: Add the order-success screen and styling for the new checkout flow

**Files:**
- Create: `src/app/order-success/page.js`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Create the order success page**

Create `src/app/order-success/page.js` with this code:

```js
import Link from "next/link";

export const metadata = {
  title: "MiniShop | Order Success",
  description: "Xác nhận đơn hàng đã được tạo thành công.",
};

function readOrderId(params) {
  return typeof params?.orderId === "string" ? params.orderId.trim() : "";
}

export default async function OrderSuccessPage({ searchParams }) {
  const params = await searchParams;
  const orderId = readOrderId(params);

  return (
    <main className="order-success-page">
      <section className="order-success-page__hero">
        <div className="site-shell order-success-card">
          <p className="order-success-page__eyebrow">Order success</p>
          <h1>Đơn hàng đã được tạo thành công</h1>
          <p className="order-success-card__description">
            Server đã lưu order, tạo order items, và trừ tồn kho trong cùng transaction.
          </p>

          {orderId ? (
            <p className="order-success-card__code">
              Mã đơn hàng: <strong>{orderId}</strong>
            </p>
          ) : null}

          <div className="order-success-card__actions">
            <Link href="/products" className="button button--primary">
              Tiếp tục mua hàng
            </Link>
            <Link href="/admin/products" className="button button--secondary">
              Kiểm tra stock trong admin
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Add global styles for checkout and success states**

Append this CSS near the existing cart styles in `src/app/globals.css`:

```css
.cart-summary__actions,
.checkout-form__actions,
.order-success-card__actions {
  display: grid;
  gap: 12px;
}

.checkout-page,
.order-success-page {
  padding: 40px 0 72px;
}

.checkout-page__hero,
.order-success-page__hero {
  padding: 28px 0 24px;
}

.checkout-page__eyebrow,
.checkout-form__eyebrow,
.checkout-summary__eyebrow,
.order-success-page__eyebrow {
  margin: 0 0 12px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.78rem;
  color: var(--accent);
}

.checkout-page__hero h1,
.checkout-form h2,
.checkout-summary h2,
.checkout-empty h1,
.order-success-card h1 {
  margin: 0;
  font-family: var(--font-space-grotesk), Arial, sans-serif;
  line-height: 0.96;
  letter-spacing: -0.05em;
}

.checkout-page__hero h1,
.checkout-empty h1,
.order-success-card h1 {
  font-size: clamp(2.4rem, 5vw, 4.8rem);
}

.checkout-page__description,
.checkout-empty p,
.checkout-summary__line p,
.order-success-card__description {
  color: var(--muted);
  line-height: 1.7;
}

.checkout-page__description {
  max-width: 62ch;
  margin: 16px 0 0;
}

.checkout-page__content {
  padding-top: 12px;
}

.checkout-page__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.9fr);
  gap: 24px;
  align-items: start;
}

.checkout-form,
.checkout-summary,
.checkout-empty,
.order-success-card {
  border: 1px solid var(--border);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: var(--shadow);
}

.checkout-form,
.checkout-summary {
  padding: 24px;
}

.checkout-empty,
.order-success-card {
  max-width: 760px;
  padding: 36px 32px;
}

.checkout-form {
  display: grid;
  gap: 18px;
}

.checkout-form__field {
  display: grid;
  gap: 8px;
}

.checkout-form__field span {
  color: var(--muted);
  font-size: 0.92rem;
}

.checkout-form__field input,
.checkout-form__field textarea {
  width: 100%;
  min-height: 48px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #fff;
  font: inherit;
}

.checkout-form__field textarea {
  resize: vertical;
  min-height: 120px;
}

.checkout-form__error {
  margin: 0;
  color: #7f1d1d;
  font-weight: 600;
}

.checkout-summary__list {
  display: grid;
  gap: 14px;
  margin: 18px 0;
}

.checkout-summary__line,
.checkout-summary__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.checkout-summary__line {
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border);
}

.checkout-summary__line strong,
.checkout-summary__row strong,
.order-success-card__code strong {
  color: var(--text);
}

.checkout-summary__line p,
.order-success-card__code {
  margin: 8px 0 0;
}

.checkout-summary__row {
  padding: 14px 0 0;
}

.checkout-summary__row--total {
  font-size: 1.08rem;
}

.order-success-card__code {
  font-size: 1rem;
}

@media (max-width: 960px) {
  .checkout-page__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .checkout-empty,
  .order-success-card {
    padding: 28px 22px;
  }
}
```

- [ ] **Step 3: Run lint and build to verify the new routes and CSS**

Run:
```bash
npm run lint
npm run build
```

Expected:
- Both commands pass.
- `/order-success` resolves cleanly in the production build.

- [ ] **Step 4: Commit the success page polish**

Run:
```bash
git add src/app/order-success/page.js src/app/globals.css
git commit -m "feat: add order success page"
```

---

### Task 5: Verify the full buổi 8 flow end-to-end

**Files:**
- No new files

- [ ] **Step 1: Run the automated verification stack**

Run:
```bash
npm run test -- tests/lib/order-api.test.js
npm run test -- tests/lib/cart.test.js
npm run test -- tests/app/order-route.test.js
npm run test -- tests/app/api-routes.test.js
npm run lint
npm run build
```

Expected:
- All test commands pass.
- `npm run lint` passes.
- `npm run build` passes.

- [ ] **Step 2: Reset demo data before manual checkout**

Run:
```bash
npm run db:seed
```

Expected:
- Seed completes successfully.
- Product stock returns to the known values from `prisma/seed.mjs`.

- [ ] **Step 3: Smoke test the API directly**

Run while `npm run dev` is active:

```bash
curl -i http://localhost:3000/api/orders \
  -X POST \
  -H "content-type: application/json" \
  -d '{
    "customerName": "Van Nguyen",
    "customerEmail": "van@example.com",
    "customerPhone": "0901234567",
    "shippingAddress": "12 Nguyen Trai, District 1",
    "items": [
      { "slug": "air-runner-basic", "quantity": 2 },
      { "slug": "street-flex-pro", "quantity": 1 }
    ]
  }'
```

Expected:
- Response status is `201 Created`.
- JSON body includes an order `id`, `status: "PENDING"`, `total: 4470000`, and nested `items`.

- [ ] **Step 4: Smoke test the browser flow**

Manual path:
1. Open `/products` and add at least two products to the cart.
2. Open `/cart` and confirm the new `Tiến hành checkout` CTA is visible.
3. Open `/checkout`, fill the form, submit, and confirm redirect to `/order-success?orderId=<id>`.
4. Return to `/cart` and confirm it is empty.
5. Open `/admin/products` and confirm the ordered product stock has decreased.

Expected:
- Checkout succeeds on the happy path.
- Cart clears after success.
- Admin stock reflects the order.

- [ ] **Step 5: Commit the final verified state**

Run:
```bash
git status --short
git add src/lib/order-api.js tests/lib/order-api.test.js src/app/api/orders/route.js tests/app/order-route.test.js src/lib/cart.js tests/lib/cart.test.js src/components/cart-provider.js src/components/cart-page-content.js src/app/checkout/page.js src/components/checkout-page-content.js src/app/order-success/page.js src/app/globals.css
git commit -m "feat: complete minishop buoi 8 checkout flow"
```

Expected:
- `git status --short` only shows the buổi 8 implementation files.
- Final commit captures the verified end-to-end flow.
