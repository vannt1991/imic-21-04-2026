import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({ alt, src, ...props }) =>
    React.createElement("img", { alt, src, ...props }),
}));

import { ProductImage } from "../../src/components/product-image.js";

describe("ProductImage", () => {
  it("renders an image for valid https URLs", () => {
    const html = renderToStaticMarkup(
      React.createElement(ProductImage, {
        src: "https://images.example.com/shoe.jpg",
        alt: "Air Runner",
        variant: "card",
      }),
    );

    expect(html).toContain('src="https://images.example.com/shoe.jpg"');
    expect(html).not.toContain("product-image__fallback");
  });

  it("renders fallback markup for missing URLs", () => {
    const html = renderToStaticMarkup(
      React.createElement(ProductImage, {
        src: null,
        alt: "Air Runner",
        variant: "card",
      }),
    );

    expect(html).toContain("product-image__fallback");
  });

  it("renders fallback markup for invalid URLs", () => {
    const html = renderToStaticMarkup(
      React.createElement(ProductImage, {
        src: "http://images.example.com/shoe.jpg",
        alt: "Air Runner",
        variant: "card",
      }),
    );

    expect(html).toContain("product-image__fallback");
  });
});
