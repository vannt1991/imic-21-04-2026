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
  notFound,
} = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getProductBySlug: vi.fn(),
  getProductSlugs: vi.fn(),
  getRelatedProducts: vi.fn(),
  getProductReviewsForViewer: vi.fn(),
  formatVnd: vi.fn(() => "1.290.000 đ"),
  notFound: vi.fn(),
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
    note: "De phoi do",
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

  it("shows the review section with anonymous viewer state", async () => {
    const { default: ProductDetailPage } = loadPageModule(
      "src/app/products/[slug]/page.js",
      {
        "next/link": { __esModule: true, default: "a" },
        "next/navigation": { notFound },
        "@/components/add-to-cart-button": { AddToCartButton: "add-to-cart-button" },
        "@/components/product-image": { ProductImage: "product-image" },
        "@/components/product-review-section": ({ reviewSummary, viewerReviewState }) => ({
          type: "product-review-section",
          props: { reviewSummary, viewerReviewState },
        }),
        "@/lib/auth": { getCurrentUser },
        "@/lib/products": {
          getProductBySlug,
          getProductSlugs,
          getRelatedProducts,
        },
        "@/lib/product-reviews": { getProductReviewsForViewer },
        "@/lib/format-vnd": { formatVnd },
      },
    );

    const page = await ProductDetailPage({
      params: Promise.resolve({ slug: "air-runner-basic" }),
    });

    expect(JSON.stringify(page)).toContain('"productId":"prod_1"');
    expect(JSON.stringify(page)).toContain('"reviewCount":0');
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

    const { default: ProductDetailPage } = loadPageModule(
      "src/app/products/[slug]/page.js",
      {
        "next/link": { __esModule: true, default: "a" },
        "next/navigation": { notFound },
        "@/components/add-to-cart-button": { AddToCartButton: "add-to-cart-button" },
        "@/components/product-image": { ProductImage: "product-image" },
        "@/components/product-review-section": ({ reviewSummary, viewerReviewState }) => ({
          type: "product-review-section",
          props: { reviewSummary, viewerReviewState },
        }),
        "@/lib/auth": { getCurrentUser },
        "@/lib/products": {
          getProductBySlug,
          getProductSlugs,
          getRelatedProducts,
        },
        "@/lib/product-reviews": { getProductReviewsForViewer },
        "@/lib/format-vnd": { formatVnd },
      },
    );

    const page = await ProductDetailPage({
      params: Promise.resolve({ slug: "air-runner-basic" }),
    });

    expect(JSON.stringify(page)).toContain('"averageRating":4.5');
    expect(JSON.stringify(page)).toContain('"hasPurchased":true');
    expect(JSON.stringify(page)).toContain('"existingReview"');
  });
});
