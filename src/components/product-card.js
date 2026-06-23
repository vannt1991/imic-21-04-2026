import { createElement } from "react";
import Link from "next/link";
import { formatVnd } from "@/lib/format-vnd";
import { ProductImage } from "@/components/product-image";

export function ProductCard({ product }) {
  const isSale = Boolean(product.originalPrice);
  const isOutOfStock = !product.inStock;
  const badgeLabel = isSale ? "Sale" : product.badge;

  return createElement(
    "article",
    {
      className: `product-card ${isOutOfStock ? "product-card--soldout" : ""}`,
    },
    createElement(
      Link,
      {
        href: `/products/${product.slug}`,
        className: "product-card__link",
        "aria-label": `Xem chi tiết ${product.name}`,
      },
      [
        createElement(
          "div",
          {
            key: "image",
            className: "product-card__image",
            "aria-hidden": "true",
          },
          createElement(ProductImage, {
            src: product.image,
            alt: product.name,
            variant: "card",
            sizes: "(max-width: 768px) 100vw, 33vw",
            badge: badgeLabel ?? "",
          }),
        ),
        createElement(
          "div",
          {
            key: "body",
            className: "product-card__body",
          },
          [
            createElement(
              "p",
              {
                key: "category",
                className: "product-card__category",
              },
              product.category,
            ),
            createElement(
              "h2",
              {
                key: "name",
                className: "product-card__name",
              },
              product.name,
            ),
            createElement(
              "p",
              {
                key: "description",
                className: "product-card__description",
              },
              product.description,
            ),
            createElement(
              "div",
              {
                key: "price-row",
                className: "product-card__price-row",
              },
              [
                createElement("strong", { key: "price" }, formatVnd(product.price)),
                isSale
                  ? createElement(
                      "span",
                      {
                        key: "original-price",
                        className: "product-card__compare",
                      },
                      formatVnd(product.originalPrice),
                    )
                  : null,
              ],
            ),
            createElement(
              "p",
              {
                key: "stock",
                className: `product-card__stock ${
                  isOutOfStock ? "product-card__stock--soldout" : ""
                }`,
              },
              isOutOfStock ? "Hết hàng" : "Còn hàng",
            ),
          ],
        ),
      ],
    ),
  );
}
