import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) =>
    React.createElement("a", { href, ...props }, children),
}));

vi.mock("@/components/product-image", () => ({
  ProductImage: ({ src, alt, variant }) =>
    React.createElement("div", {
      "data-product-image": `${variant}:${src}:${alt}`,
    }),
}));

import { ProductCard } from "../../src/components/product-card.js";

describe("ProductCard", () => {
  it("routes card visuals through ProductImage", () => {
    const html = renderToStaticMarkup(
      React.createElement(ProductCard, {
        product: {
          slug: "air-runner",
          name: "Air Runner",
          category: "Running",
          badge: "New",
          description: "Demo",
          price: 1,
          originalPrice: null,
          image: "https://images.example.com/shoe.jpg",
          note: "",
          inStock: true,
        },
      }),
    );

    expect(html).toContain(
      'data-product-image="card:https://images.example.com/shoe.jpg:Air Runner"',
    );
  });
});
