import { describe, expect, it } from "vitest";
import {
  readProductFormPayload,
  toProductFormValues,
} from "../../src/lib/admin-product-form.js";

function createFormData(fields) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    if (value === true) {
      formData.set(key, "on");
      continue;
    }

    if (value === false || value === undefined || value === null) {
      continue;
    }

    formData.set(key, String(value));
  }

  return formData;
}

describe("admin product form helpers", () => {
  it("normalizes form fields into the payload expected by product schemas", () => {
    const payload = readProductFormPayload(
      createFormData({
        name: "  Air Runner Pro  ",
        slug: " air-runner-pro ",
        description: "  Daily trainer for admin CRUD.  ",
        price: "1490000",
        originalPrice: "1790000",
        image: "   ",
        badge: "  Bestseller  ",
        note: "  Màu mới  ",
        stock: "5",
        featured: "yes",
        isActive: true,
        categorySlug: " running ",
      }),
    );

    expect(payload).toEqual({
      name: "Air Runner Pro",
      slug: "air-runner-pro",
      description: "Daily trainer for admin CRUD.",
      price: 1490000,
      originalPrice: 1790000,
      image: null,
      badge: "Bestseller",
      note: "Màu mới",
      stock: 5,
      featured: true,
      isActive: true,
      categorySlug: "running",
    });
  });

  it("treats blank optional fields as null and unchecked boxes as false", () => {
    const payload = readProductFormPayload(
      createFormData({
        name: "Court Classic",
        slug: "court-classic",
        description: "Retro court silhouette.",
        price: "990000",
        originalPrice: "",
        image: "",
        badge: "",
        note: "",
        stock: "0",
        categorySlug: "lifestyle",
      }),
    );

    expect(payload).toEqual({
      name: "Court Classic",
      slug: "court-classic",
      description: "Retro court silhouette.",
      price: 990000,
      originalPrice: null,
      image: null,
      badge: null,
      note: null,
      stock: 0,
      featured: false,
      isActive: false,
      categorySlug: "lifestyle",
    });
  });

  it("keeps malformed numeric strings invalid for downstream schema validation", () => {
    const payload = readProductFormPayload(
      createFormData({
        name: "Bad Numbers",
        slug: "bad-numbers",
        description: "Numeric parsing regression coverage.",
        price: "12abc",
        originalPrice: "1.5",
        stock: "7x",
        categorySlug: "running",
      }),
    );

    expect(Number.isNaN(payload.price)).toBe(true);
    expect(Number.isNaN(payload.originalPrice)).toBe(true);
    expect(Number.isNaN(payload.stock)).toBe(true);
  });

  it("maps a product record into string defaults for the shared form", () => {
    expect(
      toProductFormValues({
        name: "Air Runner Basic",
        slug: "air-runner-basic",
        description: "Mẫu sneaker gọn nhẹ.",
        price: 1290000,
        originalPrice: null,
        image: null,
        badge: "New",
        note: null,
        stock: 12,
        featured: true,
        isActive: true,
        categorySlug: "running",
      }),
    ).toEqual({
      name: "Air Runner Basic",
      slug: "air-runner-basic",
      description: "Mẫu sneaker gọn nhẹ.",
      price: "1290000",
      originalPrice: "",
      image: "",
      badge: "New",
      note: "",
      stock: "12",
      featured: true,
      isActive: true,
      categorySlug: "running",
    });
  });

  it("returns fallback defaults when no product is provided", () => {
    expect(toProductFormValues(undefined)).toEqual({
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
    });
  });
});
