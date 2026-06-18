import { createElement } from "react";
import Link from "next/link";
import { buildCatalogHref } from "@/lib/product-search";

function renderNavControl({ disabled, href, label, key }) {
  if (disabled) {
    return createElement(
      "span",
      {
        key,
        className: "catalog-pagination__nav catalog-pagination__nav--disabled",
        "aria-disabled": "true",
      },
      label,
    );
  }

  return createElement(
    Link,
    {
      key,
      href,
      className: "catalog-pagination__nav",
    },
    label,
  );
}

export function ProductPagination({ filters, pagination }) {
  const { page, totalPages } = pagination;

  if (totalPages <= 1) {
    return null;
  }

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return createElement(
    "nav",
    {
      className: "catalog-pagination",
      "aria-label": "Phân trang sản phẩm",
    },
    [
      renderNavControl({
        disabled: page === 1,
        href: buildCatalogHref(filters, { page: page - 1 }),
        key: "previous",
        label: "Trước",
      }),
      createElement(
        "div",
        {
          className: "catalog-pagination__pages",
          key: "pages",
        },
        pages.map((pageNumber) =>
          createElement(
            Link,
            {
              key: pageNumber,
              href: buildCatalogHref(filters, { page: pageNumber }),
              className: `catalog-pagination__page ${
                pageNumber === page ? "catalog-pagination__page--current" : ""
              }`,
              "aria-current": pageNumber === page ? "page" : undefined,
            },
            pageNumber,
          ),
        ),
      ),
      renderNavControl({
        disabled: page === totalPages,
        href: buildCatalogHref(filters, { page: page + 1 }),
        key: "next",
        label: "Sau",
      }),
    ],
  );
}
