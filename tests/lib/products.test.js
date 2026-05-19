import { describe, expect, it } from "vitest";
import {
  getProductBySlug,
  getProductSlugs,
  getRelatedProducts,
} from "../../src/lib/products.js";

describe("product catalog helpers", () => {
  it("finds a product by slug", () => {
    const product = getProductBySlug("air-runner-basic");

    expect(product).not.toBeNull();
    expect(product.slug).toBe("air-runner-basic");
    expect(product.name).toBe("Air Runner Basic");
  });

  it("returns null for an unknown slug", () => {
    expect(getProductBySlug("missing-product")).toBeNull();
  });

  it("returns slug params for static routes", () => {
    expect(getProductSlugs()).toEqual([
      { slug: "air-runner-basic" },
      { slug: "street-flex-pro" },
      { slug: "court-classic-white" },
      { slug: "trail-guard-mid" },
    ]);
  });

  it("excludes the current product from related products", () => {
    const related = getRelatedProducts("air-runner-basic");

    expect(related).toHaveLength(3);
    expect(related.some((product) => product.slug === "air-runner-basic")).toBe(
      false,
    );
  });
});
