import { formatVnd } from "@/lib/format-vnd";

export const products = [
  {
    slug: "air-runner-basic",
    name: "Air Runner Basic",
    category: "Running",
    badge: "Bestseller",
    description: "Mẫu sneaker gọn nhẹ, phù hợp cho buổi học đầu tiên.",
    price: 1290000,
    originalPrice: 1490000,
    inStock: true,
    featured: true,
    note: "Dễ phối đồ",
  },
  {
    slug: "street-flex-pro",
    name: "Street Flex Pro",
    category: "Lifestyle",
    badge: "New",
    description: "Thiết kế nổi bật hơn, hợp với phong cách streetwear.",
    price: 1890000,
    originalPrice: null,
    inStock: true,
    featured: true,
    note: "Phối outfit nhanh",
  },
  {
    slug: "court-classic-white",
    name: "Court Classic White",
    category: "Classic",
    badge: "Sale",
    description: "Một đôi basic sạch, đơn giản, dễ dùng hằng ngày.",
    price: 990000,
    originalPrice: 1190000,
    inStock: true,
    featured: true,
    note: "Giá dễ tiếp cận",
  },
  {
    slug: "trail-guard-mid",
    name: "Trail Guard Mid",
    category: "Outdoor",
    badge: "Sold out",
    description: "Bản mid-top chắc chân cho những buổi đi bộ cuối tuần.",
    price: 1590000,
    originalPrice: null,
    inStock: false,
    featured: false,
    note: "Hết hàng tạm thời",
  },
];

export const featuredProducts = products
  .filter((product) => product.featured)
  .map((product) => ({
    ...product,
    priceLabel: formatVnd(product.price),
  }));

export function getProductBySlug(slug) {
  return products.find((product) => product.slug === slug) ?? null;
}

export function getProductSlugs() {
  return products.map((product) => ({ slug: product.slug }));
}

export function getRelatedProducts(slug, limit = 3) {
  return products.filter((product) => product.slug !== slug).slice(0, limit);
}
