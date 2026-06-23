import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) =>
    React.createElement("a", { href, ...props }, children),
}));

vi.mock("@/components/admin-product-image-field", () => ({
  AdminProductImageField: ({ initialValue, productName }) =>
    React.createElement("div", {
      "data-admin-preview": `${productName}:${initialValue}`,
    }),
}));

import { AdminProductForm } from "../../src/components/admin-product-form.js";

describe("AdminProductForm component", () => {
  it("renders the admin image field preview with initial values", () => {
    const html = renderToStaticMarkup(
      React.createElement(AdminProductForm, {
        action: () => {},
        categories: [{ id: "1", slug: "running", name: "Running" }],
        title: "Create",
        description: "Create",
        submitLabel: "Save",
        initialValues: {
          image: "https://images.example.com/shoe.jpg",
          name: "Air Runner",
        },
      }),
    );

    expect(html).toContain(
      'data-admin-preview="Air Runner:https://images.example.com/shoe.jpg"',
    );
  });
});
