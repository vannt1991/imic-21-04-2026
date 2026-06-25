import { describe, expect, it } from "vitest";
import { toProductViewModel } from "../../src/lib/products.js";

describe("toProductViewModel", () => {
  it("flattens the category relation and derives inStock from stock", () => {
    expect(
      toProductViewModel({
        id: "prod_1",
        slug: "air-runner-basic",
        name: "Air Runner Basic",
        description: "Mẫu sneaker gọn nhẹ, phù hợp cho buổi học đầu tiên.",
        price: 1290000,
        originalPrice: 1490000,
        image: null,
        badge: "Bestseller",
        note: "Dễ phối đồ",
        stock: 12,
        featured: true,
        isActive: true,
        category: { name: "Running" },
      }),
    ).toEqual({
      id: "prod_1",
      slug: "air-runner-basic",
      name: "Air Runner Basic",
      category: "Running",
      badge: "Bestseller",
      description: "Mẫu sneaker gọn nhẹ, phù hợp cho buổi học đầu tiên.",
      price: 1290000,
      originalPrice: 1490000,
      image: null,
      note: "Dễ phối đồ",
      inStock: true,
      featured: true,
      isActive: true,
    });
  });
});
