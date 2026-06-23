import { createElement } from "react";
import Link from "next/link";
import { AdminProductImageField } from "@/components/admin-product-image-field";

const emptyValues = {
  name: "",
  slug: "",
  description: "",
  price: "",
  originalPrice: "",
  image: "",
  badge: "",
  note: "",
  stock: "0",
  featured: false,
  isActive: true,
  categorySlug: "",
};

function renderField(children, key, className = "admin-field") {
  return createElement(
    "label",
    {
      key,
      className,
    },
    children,
  );
}

export function AdminProductForm({
  action,
  categories,
  initialValues = emptyValues,
  title,
  description,
  submitLabel,
  errorMessage = "",
  submitDisabled = false,
}) {
  const values = { ...emptyValues, ...initialValues };
  const hasCategories = categories.length > 0;
  const isSubmitDisabled = submitDisabled || !hasCategories;

  return createElement(
    "main",
    { className: "admin-page" },
    [
      createElement(
        "section",
        {
          key: "hero",
          className: "admin-page__hero",
        },
        [
          createElement(
            "p",
            { key: "eyebrow", className: "admin-page__eyebrow" },
            "Server Action Form",
          ),
          createElement("h1", { key: "title" }, title),
          createElement(
            "p",
            { key: "description", className: "admin-page__description" },
            description,
          ),
          errorMessage
            ? createElement(
                "p",
                {
                  key: "error",
                  className: "admin-page__description",
                  role: "alert",
                },
                errorMessage,
              )
            : null,
        ],
      ),
      createElement(
        "form",
        {
          key: "form",
          action,
          className: "admin-form",
        },
        [
          renderField(
            [
              createElement("span", { key: "label" }, "Tên sản phẩm"),
              createElement("input", {
                key: "input",
                name: "name",
                defaultValue: values.name,
                required: true,
              }),
            ],
            "name",
          ),
          renderField(
            [
              createElement("span", { key: "label" }, "Slug"),
              createElement("input", {
                key: "input",
                name: "slug",
                defaultValue: values.slug,
                required: true,
              }),
            ],
            "slug",
          ),
          renderField(
            [
              createElement("span", { key: "label" }, "Mô tả"),
              createElement("textarea", {
                key: "input",
                name: "description",
                rows: "4",
                defaultValue: values.description,
                required: true,
              }),
            ],
            "description",
            "admin-field admin-field--full",
          ),
          renderField(
            [
              createElement("span", { key: "label" }, "Giá bán"),
              createElement("input", {
                key: "input",
                type: "number",
                name: "price",
                min: "0",
                step: "1",
                defaultValue: values.price,
                required: true,
              }),
            ],
            "price",
          ),
          renderField(
            [
              createElement("span", { key: "label" }, "Giá gốc"),
              createElement("input", {
                key: "input",
                type: "number",
                name: "originalPrice",
                min: "0",
                step: "1",
                defaultValue: values.originalPrice,
              }),
            ],
            "originalPrice",
          ),
          renderField(
            [
              createElement("span", { key: "label" }, "Tồn kho"),
              createElement("input", {
                key: "input",
                type: "number",
                name: "stock",
                min: "0",
                step: "1",
                defaultValue: values.stock,
                required: true,
              }),
            ],
            "stock",
          ),
          renderField(
            [
              createElement("span", { key: "label" }, "Category"),
              createElement(
                "select",
                {
                  key: "input",
                  name: "categorySlug",
                  defaultValue: values.categorySlug,
                  disabled: !hasCategories,
                  required: hasCategories,
                },
                [
                  createElement(
                    "option",
                    { key: "default", value: "" },
                    "Chọn category",
                  ),
                  ...categories.map((category) =>
                    createElement(
                      "option",
                      { key: category.id, value: category.slug },
                      category.name,
                    ),
                  ),
                ],
              ),
              !hasCategories
                ? createElement(
                    "span",
                    { key: "hint" },
                    "Chưa có category nào để gán cho sản phẩm mới.",
                  )
                : null,
            ],
            "category",
          ),
          createElement(AdminProductImageField, {
            key: "image",
            initialValue: values.image,
            productName: values.name,
          }),
          renderField(
            [
              createElement("span", { key: "label" }, "Badge"),
              createElement("input", {
                key: "input",
                name: "badge",
                defaultValue: values.badge,
              }),
            ],
            "badge",
          ),
          renderField(
            [
              createElement("span", { key: "label" }, "Note"),
              createElement("textarea", {
                key: "input",
                name: "note",
                rows: "3",
                defaultValue: values.note,
              }),
            ],
            "note",
            "admin-field admin-field--full",
          ),
          createElement(
            "div",
            {
              key: "checkboxes",
              className: "admin-form__checkboxes",
            },
            [
              createElement(
                "label",
                { key: "featured" },
                [
                  createElement("input", {
                    key: "input",
                    type: "checkbox",
                    name: "featured",
                    defaultChecked: values.featured,
                  }),
                  createElement(
                    "span",
                    { key: "text" },
                    "Hiển thị ở featured products",
                  ),
                ],
              ),
              createElement(
                "label",
                { key: "isActive" },
                [
                  createElement("input", {
                    key: "input",
                    type: "checkbox",
                    name: "isActive",
                    defaultChecked: values.isActive,
                  }),
                  createElement(
                    "span",
                    { key: "text" },
                    "Cho phép xuất hiện ở storefront",
                  ),
                ],
              ),
            ],
          ),
          createElement(
            "div",
            {
              key: "actions",
              className: "admin-form__actions",
            },
            [
              createElement(
                "button",
                {
                  key: "submit",
                  type: "submit",
                  className: "button button--primary",
                  disabled: isSubmitDisabled,
                },
                submitLabel,
              ),
              createElement(
                Link,
                {
                  key: "cancel",
                  href: "/admin/products",
                  className: "button button--secondary",
                },
                "Hủy",
              ),
            ],
          ),
        ],
      ),
    ],
  );
}
