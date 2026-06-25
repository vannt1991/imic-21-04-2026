import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProductStarRating } from "../../src/components/product-star-rating.js";

describe("ProductStarRating", () => {
  it("renders filled and empty stars in read-only mode", () => {
    const html = renderToStaticMarkup(
      React.createElement(ProductStarRating, {
        value: 4,
        label: "4 sao",
        readOnly: true,
      }),
    );

    expect(html).toContain('aria-label="4 sao"');
    expect(html.match(/product-star-rating__star--filled/g)).toHaveLength(4);
    expect(html.match(/product-star-rating__star--empty/g)).toHaveLength(1);
  });

  it("rounds the average display to the nearest whole star", () => {
    const html = renderToStaticMarkup(
      React.createElement(ProductStarRating, {
        value: 4.5,
        label: "4.5/5",
        readOnly: true,
      }),
    );

    expect(html.match(/product-star-rating__star--filled/g)).toHaveLength(5);
  });
});
