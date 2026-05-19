import { describe, expect, it } from "vitest";
import {
  productCreateSchema,
  productUpdateSchema,
  toProductApiModel,
  toProductCreateData,
  toProductUpdateData,
} from "../../src/lib/product-api.js";

describe("product api helpers", () => {
  it("parses create payloads and applies defaults", () => {
    expect(
      productCreateSchema.parse({
        name: "  API Runner  ",
        slug: "api-runner",
        description: "  Temporary product for route testing.  ",
        price: 990000,
        stock: 4,
        categorySlug: "running",
      }),
    ).toEqual({
      name: "API Runner",
      slug: "api-runner",
      description: "Temporary product for route testing.",
      price: 990000,
      originalPrice: null,
      image: null,
      badge: null,
      note: null,
      stock: 4,
      featured: false,
      isActive: true,
      categorySlug: "running",
    });
  });

  it("rejects unknown fields in create payloads", () => {
    expect(() =>
      productCreateSchema.parse({
        name: "API Runner",
        slug: "api-runner",
        description: "Temporary product for route testing.",
        price: 990000,
        stock: 4,
        categorySlug: "running",
        extra: true,
      }),
    ).toThrow(/unrecognized key/i);
  });

  it("rejects create payloads when originalPrice is not greater than price", () => {
    expect(() =>
      productCreateSchema.parse({
        name: "API Runner",
        slug: "api-runner",
        description: "Temporary product for route testing.",
        price: 990000,
        originalPrice: 990000,
        stock: 4,
        categorySlug: "running",
      }),
    ).toThrow("Original price must be greater than price.");
  });

  it("keeps null originalPrice valid in create payloads", () => {
    expect(
      productCreateSchema.parse({
        name: "API Runner",
        slug: "api-runner",
        description: "Temporary product for route testing.",
        price: 990000,
        originalPrice: null,
        stock: 4,
        categorySlug: "running",
      }),
    ).toMatchObject({
      price: 990000,
      originalPrice: null,
    });
  });

  it("normalizes create payloads for Prisma writes", () => {
    const payload = productCreateSchema.parse({
      name: "  API Runner  ",
      slug: "api-runner",
      description: "  Temporary product for route testing.  ",
      price: 990000,
      originalPrice: null,
      image: "   ",
      badge: "  API  ",
      note: null,
      stock: 4,
      featured: true,
      isActive: false,
      categorySlug: "running",
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
      featured: true,
      isActive: false,
      categoryId: "cat_running",
    });
  });

  it("fails fast when create data is missing categoryId", () => {
    const payload = productCreateSchema.parse({
      name: "API Runner",
      slug: "api-runner",
      description: "Temporary product for route testing.",
      price: 990000,
      stock: 4,
      categorySlug: "running",
    });

    expect(() => toProductCreateData(payload)).toThrow(
      "Category resolution is required.",
    );
  });

  it("parses partial update payloads", () => {
    expect(
      productUpdateSchema.parse({
        badge: "  Sale  ",
        image: "   ",
        featured: true,
      }),
    ).toEqual({
      badge: "Sale",
      image: null,
      featured: true,
    });
  });

  it("rejects unknown fields in update payloads", () => {
    expect(() =>
      productUpdateSchema.parse({
        featured: true,
        extra: true,
      }),
    ).toThrow(/unrecognized key/i);
  });

  it("rejects update payloads when originalPrice is not greater than provided price", () => {
    expect(() =>
      productUpdateSchema.parse({
        price: 990000,
        originalPrice: 990000,
      }),
    ).toThrow("Original price must be greater than price.");
  });

  it("normalizes update payloads and adds categoryId when provided", () => {
    const payload = productUpdateSchema.parse({
      name: "  Updated Runner  ",
      categorySlug: "lifestyle",
    });

    expect(toProductUpdateData(payload, "cat_lifestyle")).toEqual({
      name: "Updated Runner",
      categoryId: "cat_lifestyle",
    });
  });

  it("does not inject categoryId for updates without categorySlug", () => {
    const payload = productUpdateSchema.parse({
      name: "  Updated Runner  ",
    });

    expect(toProductUpdateData(payload, "cat_lifestyle")).toEqual({
      name: "Updated Runner",
    });
  });

  it("fails fast when update data includes categorySlug without categoryId", () => {
    const payload = productUpdateSchema.parse({
      categorySlug: "lifestyle",
    });

    expect(() => toProductUpdateData(payload)).toThrow(
      "Category resolution is required.",
    );
  });

  it("rejects an empty patch payload", () => {
    expect(() => productUpdateSchema.parse({})).toThrow(
      "At least one field is required.",
    );
  });

  it("rejects patch payloads that only provide explicit undefined fields", () => {
    expect(() => productUpdateSchema.parse({ image: undefined })).toThrow(
      "At least one field is required.",
    );
  });

  it("serializes product rows with nested category and ISO timestamps", () => {
    expect(
      toProductApiModel({
        id: "prod_1",
        slug: "air-runner-basic",
        name: "Air Runner Basic",
        description: "Mau sneaker gon nhe, phu hop cho buoi hoc dau tien.",
        price: 1290000,
        originalPrice: 1490000,
        image: null,
        badge: "Bestseller",
        note: "De phoi do",
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
      description: "Mau sneaker gon nhe, phu hop cho buoi hoc dau tien.",
      price: 1290000,
      originalPrice: 1490000,
      image: null,
      badge: "Bestseller",
      note: "De phoi do",
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

  it("fails fast when product api model is missing category", () => {
    expect(() =>
      toProductApiModel({
        id: "prod_1",
        slug: "air-runner-basic",
        name: "Air Runner Basic",
        description: "Mau sneaker gon nhe, phu hop cho buoi hoc dau tien.",
        price: 1290000,
        originalPrice: 1490000,
        image: null,
        badge: "Bestseller",
        note: "De phoi do",
        stock: 12,
        featured: true,
        isActive: true,
        createdAt: new Date("2026-05-16T09:00:00.000Z"),
        updatedAt: new Date("2026-05-16T10:00:00.000Z"),
      }),
    ).toThrow("Product category is required.");
  });
});
