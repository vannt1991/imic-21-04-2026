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
      customerPhone: "0901234567 ",
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

    try {
      buildOrderDraft(payload, []);
      throw new Error("Expected MissingProductsError");
    } catch (error) {
      expect(error).toBeInstanceOf(MissingProductsError);
      expect(error.slugs).toEqual(["missing-shoe"]);
    }
  });

  it("treats inactive products as missing", () => {
    const payload = createOrderSchema.parse({
      customerName: "Van Nguyen",
      customerEmail: "van@example.com",
      customerPhone: "0901234567",
      shippingAddress: "12 Nguyen Trai, District 1",
      items: [{ slug: "air-runner-basic", quantity: 1 }],
    });

    try {
      buildOrderDraft(payload, [
        {
          id: "prod_1",
          slug: "air-runner-basic",
          name: "Air Runner Basic",
          price: 1290000,
          stock: 12,
          isActive: false,
        },
      ]);
      throw new Error("Expected MissingProductsError");
    } catch (error) {
      expect(error).toBeInstanceOf(MissingProductsError);
      expect(error.slugs).toEqual(["air-runner-basic"]);
    }
  });

  it("throws stock error when requested quantity exceeds inventory", () => {
    const payload = createOrderSchema.parse({
      customerName: "Van Nguyen",
      customerEmail: "van@example.com",
      customerPhone: "0901234567",
      shippingAddress: "12 Nguyen Trai, District 1",
      items: [{ slug: "trail-guard-mid", quantity: 1 }],
    });

    try {
      buildOrderDraft(payload, [
        {
          id: "prod_4",
          slug: "trail-guard-mid",
          name: "Trail Guard Mid",
          price: 1590000,
          stock: 0,
          isActive: true,
        },
      ]);
      throw new Error("Expected InsufficientStockError");
    } catch (error) {
      expect(error).toBeInstanceOf(InsufficientStockError);
      expect(error.items).toEqual([
        {
          slug: "trail-guard-mid",
          requestedQuantity: 1,
          availableStock: 0,
        },
      ]);
    }
  });

  it("collapses duplicate cart lines before stock validation", () => {
    const payload = createOrderSchema.parse({
      customerName: "Van Nguyen",
      customerEmail: "van@example.com",
      customerPhone: "0901234567",
      shippingAddress: "12 Nguyen Trai, District 1",
      items: [
        { slug: "trail-guard-mid", quantity: 1 },
        { slug: "trail-guard-mid", quantity: 2 },
      ],
    });

    try {
      buildOrderDraft(payload, [
        {
          id: "prod_4",
          slug: "trail-guard-mid",
          name: "Trail Guard Mid",
          price: 1590000,
          stock: 2,
          isActive: true,
        },
      ]);
      throw new Error("Expected InsufficientStockError");
    } catch (error) {
      expect(error).toBeInstanceOf(InsufficientStockError);
      expect(error.items).toEqual([
        {
          slug: "trail-guard-mid",
          requestedQuantity: 3,
          availableStock: 2,
        },
      ]);
    }
  });

  it("rejects empty item arrays", () => {
    expect(() =>
      createOrderSchema.parse({
        customerName: "Van Nguyen",
        customerEmail: "van@example.com",
        customerPhone: "0901234567",
        shippingAddress: "12 Nguyen Trai, District 1",
        items: [],
      }),
    ).toThrow();
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

  it("fails fast when order serialization input is missing required nested shape", () => {
    expect(() =>
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
          },
        ],
      }),
    ).toThrow("Order item product is required.");
  });

  it("fails fast when order serialization input is missing items array", () => {
    expect(() =>
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
      }),
    ).toThrow("Order items are required.");

    expect(() =>
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
        items: {},
      }),
    ).toThrow("Order items are required.");
  });

  it("fails fast when order serialization input is missing timestamps", () => {
    expect(() =>
      toOrderApiModel({
        id: "ord_1",
        customerName: "Van Nguyen",
        customerEmail: "van@example.com",
        customerPhone: "0901234567",
        shippingAddress: "12 Nguyen Trai, District 1",
        status: "PENDING",
        total: 4470000,
        items: [],
        updatedAt: new Date("2026-05-22T03:00:00.000Z"),
      }),
    ).toThrow("Order createdAt is required.");

    expect(() =>
      toOrderApiModel({
        id: "ord_1",
        customerName: "Van Nguyen",
        customerEmail: "van@example.com",
        customerPhone: "0901234567",
        shippingAddress: "12 Nguyen Trai, District 1",
        status: "PENDING",
        total: 4470000,
        items: [],
        createdAt: new Date("2026-05-22T03:00:00.000Z"),
      }),
    ).toThrow("Order updatedAt is required.");

    expect(() =>
      toOrderApiModel({
        id: "ord_1",
        customerName: "Van Nguyen",
        customerEmail: "van@example.com",
        customerPhone: "0901234567",
        shippingAddress: "12 Nguyen Trai, District 1",
        status: "PENDING",
        total: 4470000,
        items: [],
        createdAt: new Date("bad"),
        updatedAt: new Date("2026-05-22T03:00:00.000Z"),
      }),
    ).toThrow("Order createdAt is required.");
  });
});
