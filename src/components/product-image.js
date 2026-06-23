"use client";

import Image from "next/image";
import { createElement, useMemo, useState } from "react";
import { isRenderableProductImageUrl } from "@/lib/product-image-url";

export function ProductImage({
  src,
  alt,
  variant = "card",
  fill = true,
  sizes = "100vw",
  priority = false,
  badge = "",
}) {
  const normalizedSrc = useMemo(
    () => (typeof src === "string" ? src.trim() : ""),
    [src],
  );
  const [hasLoadError, setHasLoadError] = useState(false);
  const canRender =
    isRenderableProductImageUrl(normalizedSrc) && !hasLoadError;

  return createElement(
    "div",
    { className: `product-image product-image--${variant}` },
    [
      canRender
        ? createElement(Image, {
            key: "image",
            src: normalizedSrc,
            alt,
            fill,
            sizes,
            priority,
            className: "product-image__img",
            onError: () => setHasLoadError(true),
          })
        : createElement(
            "div",
            {
              key: "fallback",
              className: "product-image__fallback",
              "aria-label": `${alt} placeholder`,
            },
            createElement("span", null, "MiniShop"),
          ),
      badge
        ? createElement(
            "span",
            {
              key: "badge",
              className: "product-image__badge",
            },
            badge,
          )
        : null,
    ],
  );
}
