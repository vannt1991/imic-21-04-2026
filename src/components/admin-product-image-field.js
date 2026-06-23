"use client";

import { createElement, useState } from "react";
import { ProductImage } from "@/components/product-image";

export function AdminProductImageField({
  initialValue = "",
  productName = "Product image",
}) {
  const [image, setImage] = useState(initialValue);

  return createElement(
    "div",
    {
      className: "admin-field admin-field--full admin-product-image-field",
    },
    [
      createElement("span", { key: "label" }, "Image"),
      createElement("input", {
        key: "input",
        name: "image",
        value: image,
        onChange: (event) => setImage(event.target.value),
      }),
      createElement(
        "div",
        {
          key: "preview",
          className: "admin-product-image-field__preview",
        },
        [
          createElement("span", { key: "preview-label" }, "Preview"),
          createElement(
            "div",
            {
              key: "preview-frame",
              className: "admin-product-image-field__frame",
            },
            createElement(ProductImage, {
              src: image,
              alt: productName || "Product image",
              variant: "admin-preview",
              sizes: "320px",
              badge: "Preview",
            }),
          ),
        ],
      ),
    ],
  );
}
