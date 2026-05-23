import { describe, expect, it } from "vitest";
import {
  PRODUCTS_PER_PAGE,
  buildCatalogHref,
  buildProductWhere,
  normalizeProductCatalogParams,
} from "../../src/lib/product-search.js";

describe("product search helpers", () => {
  it("normalizes q/category/page from URL-like input", () => {
    expect(
      normalizeProductCatalogParams({
        q: "  trail  ",
        category: " Outdoor ",
        page: "0",
      }),
    ).toEqual({
      q: "trail",
      category: "outdoor",
      page: 1,
    });
  });

  it("drops unsafe category slugs and caps long queries", () => {
    expect(
      normalizeProductCatalogParams({
        q: "x".repeat(80),
        category: "../admin",
        page: "abc",
      }),
    ).toEqual({
      q: "x".repeat(60),
      category: "",
      page: 1,
    });
  });

  it("rejects malformed page strings", () => {
    expect(
      normalizeProductCatalogParams({
        q: "",
        category: "",
        page: "2abc",
      }),
    ).toEqual({
      q: "",
      category: "",
      page: 1,
    });

    expect(
      normalizeProductCatalogParams({
        q: "",
        category: "",
        page: "1.9",
      }),
    ).toEqual({
      q: "",
      category: "",
      page: 1,
    });
  });

  it("builds a Prisma where clause for keyword and category filters", () => {
    expect(
      buildProductWhere({
        q: "trail",
        category: "outdoor",
        page: 2,
      }),
    ).toEqual({
      isActive: true,
      AND: [
        {
          OR: [
            { name: { contains: "trail", mode: "insensitive" } },
            { description: { contains: "trail", mode: "insensitive" } },
            {
              category: {
                name: { contains: "trail", mode: "insensitive" },
              },
            },
          ],
        },
        {
          category: {
            slug: "outdoor",
          },
        },
      ],
    });
  });

  it("builds shareable hrefs and resets page when filters change", () => {
    expect(
      buildCatalogHref(
        { q: "trail", category: "outdoor", page: 3 },
        { q: "runner" },
      ),
    ).toBe("/products?q=runner&category=outdoor");

    expect(
      buildCatalogHref({ q: "", category: "", page: 1 }, { page: 2 }),
    ).toBe(`/products?page=2`);

    expect(
      buildCatalogHref(
        { q: "trail", category: "outdoor", page: 3 },
        { q: " trail " },
      ),
    ).toBe("/products?q=trail&category=outdoor&page=3");

    expect(PRODUCTS_PER_PAGE).toBe(9);
  });
});
