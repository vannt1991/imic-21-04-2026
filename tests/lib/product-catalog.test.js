import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) =>
    React.createElement("a", { href, ...props }, children),
}));

const { countMock, findManyMock, categoryFindManyMock } = vi.hoisted(() => ({
  countMock: vi.fn(),
  findManyMock: vi.fn(),
  categoryFindManyMock: vi.fn(),
}));

vi.mock("../../src/lib/db.js", () => ({
  db: {
    product: {
      count: countMock,
      findMany: findManyMock,
    },
    category: {
      findMany: categoryFindManyMock,
    },
  },
}));

import { getProductCatalogPage } from "../../src/lib/products.js";
import { ProductPagination } from "../../src/components/product-pagination.js";

describe("getProductCatalogPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns paginated products with normalized filters", async () => {
    countMock.mockResolvedValue(11);
    categoryFindManyMock.mockResolvedValue([
      { slug: "outdoor", name: "Outdoor" },
      { slug: "running", name: "Running" },
    ]);
    findManyMock.mockResolvedValue([
      {
        slug: "trail-guard-mid",
        name: "Trail Guard Mid",
        description: "Bản mid-top chắc chân cho những buổi đi bộ cuối tuần.",
        price: 1590000,
        originalPrice: null,
        image: null,
        badge: "Trail",
        note: "Đế bám tốt",
        stock: 6,
        featured: false,
        isActive: true,
        category: { name: "Outdoor" },
      },
    ]);

    await expect(
      getProductCatalogPage({
        q: " trail ",
        category: "OUTDOOR",
        page: "2",
      }),
    ).resolves.toEqual({
      filters: {
        q: "trail",
        category: "outdoor",
        page: 2,
      },
      pagination: {
        page: 2,
        perPage: 9,
        totalItems: 11,
        totalPages: 2,
      },
      categories: [
        { slug: "outdoor", name: "Outdoor" },
        { slug: "running", name: "Running" },
      ],
      products: [
        {
          slug: "trail-guard-mid",
          name: "Trail Guard Mid",
          category: "Outdoor",
          badge: "Trail",
          description: "Bản mid-top chắc chân cho những buổi đi bộ cuối tuần.",
          price: 1590000,
          originalPrice: null,
          image: null,
          note: "Đế bám tốt",
          inStock: true,
          featured: false,
          isActive: true,
        },
      ],
      hasResults: true,
    });

    expect(countMock).toHaveBeenCalledWith({
      where: {
        isActive: true,
        AND: [
          {
            OR: [
              { name: { contains: "trail" } },
              {
                description: {
                  contains: "trail",
                },
              },
              {
                category: {
                  name: { contains: "trail" },
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
      },
    });
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
          AND: [
            {
              OR: [
                { name: { contains: "trail" } },
                {
                  description: {
                    contains: "trail",
                  },
                },
                {
                  category: {
                    name: { contains: "trail" },
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
        },
        skip: 9,
        take: 9,
      }),
    );
  });

  it("clamps page to 1 for empty result sets", async () => {
    countMock.mockResolvedValue(0);
    categoryFindManyMock.mockResolvedValue([]);
    findManyMock.mockResolvedValue([]);

    await expect(
      getProductCatalogPage({
        q: "missing",
        category: "",
        page: "99",
      }),
    ).resolves.toEqual({
      filters: {
        q: "missing",
        category: "",
        page: 1,
      },
      pagination: {
        page: 1,
        perPage: 9,
        totalItems: 0,
        totalPages: 1,
      },
      categories: [],
      products: [],
      hasResults: false,
    });

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
          AND: [
            {
              OR: [
                { name: { contains: "missing" } },
                {
                  description: {
                    contains: "missing",
                  },
                },
                {
                  category: { name: { contains: "missing" } },
                },
              ],
            },
          ],
        },
        skip: 0,
        take: 9,
      }),
    );
  });

  it("clamps page to the last page when results exist", async () => {
    countMock.mockResolvedValue(10);
    categoryFindManyMock.mockResolvedValue([{ slug: "running", name: "Running" }]);
    findManyMock.mockResolvedValue([]);

    await expect(
      getProductCatalogPage({
        q: "",
        category: "RUNNING",
        page: "99",
      }),
    ).resolves.toEqual({
      filters: {
        q: "",
        category: "running",
        page: 2,
      },
      pagination: {
        page: 2,
        perPage: 9,
        totalItems: 10,
        totalPages: 2,
      },
      categories: [{ slug: "running", name: "Running" }],
      products: [],
      hasResults: true,
    });

    expect(countMock).toHaveBeenCalledWith({
      where: {
        isActive: true,
        AND: [
          {
            category: {
              slug: "running",
            },
          },
        ],
      },
    });
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
          AND: [
            {
              category: {
                slug: "running",
              },
            },
          ],
        },
        skip: 9,
        take: 9,
      }),
    );
  });
});

describe("ProductPagination", () => {
  it("renders boundary controls as non-interactive elements", () => {
    const firstPageMarkup = renderToStaticMarkup(
      React.createElement(ProductPagination, {
        filters: { q: "trail", category: "outdoor", page: 1 },
        pagination: { page: 1, totalPages: 3 },
      }),
    );

    expect(firstPageMarkup).toContain(
      '<span class="catalog-pagination__nav catalog-pagination__nav--disabled" aria-disabled="true">Trước</span>',
    );
    expect(firstPageMarkup).toContain('href="/products?q=trail&amp;category=outdoor&amp;page=2"');
    expect(firstPageMarkup).not.toContain(">Trước</a>");

    const lastPageMarkup = renderToStaticMarkup(
      React.createElement(ProductPagination, {
        filters: { q: "trail", category: "outdoor", page: 3 },
        pagination: { page: 3, totalPages: 3 },
      }),
    );

    expect(lastPageMarkup).toContain(
      '<span class="catalog-pagination__nav catalog-pagination__nav--disabled" aria-disabled="true">Sau</span>',
    );
    expect(lastPageMarkup).not.toContain(">Sau</a>");
  });
});
