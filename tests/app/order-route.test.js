import { beforeEach, describe, expect, it, vi } from "vitest";

const { db } = vi.hoisted(() => ({
  db: {
    $transaction: vi.fn(),
    product: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({
  db,
}));

import { POST } from "@/app/api/orders/route";
import { orderApiInclude } from "@/lib/order-api";

function createOrderRecord(overrides = {}) {
  return {
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
    ...overrides,
  };
}

async function readJson(response) {
  return response.json();
}

describe("POST /api/orders", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 400 validation envelope for invalid body", async () => {
    const response = await POST(
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
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("returns 400 when request body is malformed json", async () => {
    const response = await POST(
      new Request("http://localhost/api/orders", {
        method: "POST",
        body: "{",
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(400);
    expect(await readJson(response)).toEqual({
      error: {
        message: "Request body must be valid JSON.",
      },
    });
    expect(db.product.findMany).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("returns 404 with unavailable slugs", async () => {
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

    const response = await POST(
      new Request("http://localhost/api/orders", {
        method: "POST",
        body: JSON.stringify({
          customerName: "Van Nguyen",
          customerEmail: "van@example.com",
          customerPhone: "0901234567",
          shippingAddress: "12 Nguyen Trai, District 1",
          items: [
            { slug: "air-runner-basic", quantity: 1 },
            { slug: "missing-shoe", quantity: 2 },
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
    expect(db.product.findMany).toHaveBeenCalledWith({
      where: {
        slug: {
          in: ["air-runner-basic", "missing-shoe"],
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
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("returns 409 with stock conflict details", async () => {
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
    db.$transaction.mockImplementation(async (callback) => {
      const tx = {
        product: {
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          findUnique: vi.fn().mockResolvedValue({
            id: "prod_1",
            slug: "air-runner-basic",
            stock: 1,
            isActive: true,
          }),
        },
        order: {
          create: vi.fn(),
        },
      };

      return callback(tx);
    });

    const response = await POST(
      new Request("http://localhost/api/orders", {
        method: "POST",
        body: JSON.stringify({
          customerName: "Van Nguyen",
          customerEmail: "van@example.com",
          customerPhone: "0901234567",
          shippingAddress: "12 Nguyen Trai, District 1",
          items: [{ slug: "air-runner-basic", quantity: 2 }],
        }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(409);
    expect(await readJson(response)).toEqual({
      error: {
        message: "Some products do not have enough stock.",
        details: [
          {
            slug: "air-runner-basic",
            requestedQuantity: 2,
            availableStock: 1,
          },
        ],
      },
    });
  });

  it("returns 404 when product becomes unavailable during transaction", async () => {
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
    const orderCreate = vi.fn();

    db.$transaction.mockImplementation(async (callback) => {
      const tx = {
        product: {
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          findUnique: vi.fn().mockResolvedValue(null),
        },
        order: {
          create: orderCreate,
        },
      };

      return callback(tx);
    });

    const response = await POST(
      new Request("http://localhost/api/orders", {
        method: "POST",
        body: JSON.stringify({
          customerName: "Van Nguyen",
          customerEmail: "van@example.com",
          customerPhone: "0901234567",
          shippingAddress: "12 Nguyen Trai, District 1",
          items: [{ slug: "air-runner-basic", quantity: 2 }],
        }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(404);
    expect(await readJson(response)).toEqual({
      error: {
        message: "Some products are unavailable.",
        details: { slugs: ["air-runner-basic"] },
      },
    });
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it("creates pending order, decrements stock, returns 201 order json", async () => {
    db.product.findMany.mockResolvedValue([
      {
        id: "prod_1",
        slug: "air-runner-basic",
        name: "Air Runner Basic",
        price: 1290000,
        stock: 8,
        isActive: true,
      },
      {
        id: "prod_2",
        slug: "street-flex-pro",
        name: "Street Flex Pro",
        price: 1890000,
        stock: 5,
        isActive: true,
      },
    ]);

    const updateMany = vi
      .fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });
    const orderCreate = vi.fn().mockResolvedValue(createOrderRecord());

    db.$transaction.mockImplementation(async (callback) =>
      callback({
        product: { updateMany },
        order: { create: orderCreate },
      }),
    );

    const response = await POST(
      new Request("http://localhost/api/orders", {
        method: "POST",
        body: JSON.stringify({
          customerName: "Van Nguyen",
          customerEmail: "van@example.com",
          customerPhone: "0901234567",
          shippingAddress: "12 Nguyen Trai, District 1",
          items: [
            { slug: "air-runner-basic", quantity: 1 },
            { slug: "air-runner-basic", quantity: 1 },
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
    expect(updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        id: "prod_1",
        stock: { gte: 2 },
        isActive: true,
      },
      data: {
        stock: { decrement: 2 },
      },
    });
    expect(updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        id: "prod_2",
        stock: { gte: 1 },
        isActive: true,
      },
      data: {
        stock: { decrement: 1 },
      },
    });
    expect(orderCreate).toHaveBeenCalledWith({
      data: {
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
      },
      include: orderApiInclude,
    });
  });
});
