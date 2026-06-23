import { describe, expect, it } from "vitest";
import { isRenderableProductImageUrl } from "../../src/lib/product-image-url.js";

describe("isRenderableProductImageUrl", () => {
  it("accepts https URLs", () => {
    expect(
      isRenderableProductImageUrl("https://images.example.com/shoe.jpg"),
    ).toBe(true);
  });

  it("rejects http URLs, blank strings, and malformed values", () => {
    expect(
      isRenderableProductImageUrl("http://images.example.com/shoe.jpg"),
    ).toBe(false);
    expect(isRenderableProductImageUrl("   ")).toBe(false);
    expect(isRenderableProductImageUrl("not-a-url")).toBe(false);
    expect(isRenderableProductImageUrl(null)).toBe(false);
  });
});
