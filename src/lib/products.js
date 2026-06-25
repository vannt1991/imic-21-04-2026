import { db } from "@/lib/db";
import {
  PRODUCTS_PER_PAGE,
  buildProductWhere,
  normalizeProductCatalogParams,
} from "@/lib/product-search";

export function toProductViewModel(product) {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: product.category?.name ?? "",
    badge: product.badge ?? (product.originalPrice ? "Sale" : "New"),
    description: product.description,
    price: product.price,
    originalPrice: product.originalPrice ?? null,
    image: product.image ?? null,
    note: product.note ?? "",
    inStock: product.stock > 0,
    featured: product.featured,
    isActive: product.isActive,
  };
}

async function findProducts(where = {}, take) {
  const products = await db.product.findMany({
    where: { isActive: true, ...where },
    include: { category: true },
    ...(take ? { take } : {}),
    orderBy: { createdAt: "desc" },
  });

  return products.map(toProductViewModel);
}

async function getCatalogCategories() {
  return db.category.findMany({
    where: {
      products: {
        some: {
          isActive: true,
        },
      },
    },
    select: {
      slug: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}

export async function getProductCatalogPage(rawParams = {}) {
  const filters = normalizeProductCatalogParams(rawParams);
  const where = buildProductWhere(filters);
  const [totalItems, categories] = await Promise.all([
    db.product.count({ where }),
    getCatalogCategories(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalItems / PRODUCTS_PER_PAGE));
  const page = Math.min(filters.page, totalPages);

  const products = await db.product.findMany({
    where,
    include: { category: true },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    skip: (page - 1) * PRODUCTS_PER_PAGE,
    take: PRODUCTS_PER_PAGE,
  });

  return {
    filters: {
      ...filters,
      page,
    },
    pagination: {
      page,
      perPage: PRODUCTS_PER_PAGE,
      totalItems,
      totalPages,
    },
    categories,
    products: products.map(toProductViewModel),
    hasResults: totalItems > 0,
  };
}

export async function getProducts() {
  return findProducts();
}

export async function getFeaturedProducts(limit = 3) {
  return findProducts({ featured: true }, limit);
}

export async function getProductBySlug(slug) {
  if (!slug) {
    return null;
  }

  const product = await db.product.findUnique({
    where: { slug },
    include: { category: true },
  });

  if (!product || !product.isActive) {
    return null;
  }

  return toProductViewModel(product);
}

export async function getProductSlugs() {
  const products = await db.product.findMany({
    where: { isActive: true },
    select: { slug: true },
    orderBy: { createdAt: "desc" },
  });

  return products.map(({ slug }) => ({ slug }));
}

export async function getRelatedProducts(slug, limit = 3) {
  const currentProduct = await db.product.findUnique({
    where: { slug },
    select: { categoryId: true },
  });

  if (!currentProduct) {
    return [];
  }

  return findProducts(
    {
      slug: { not: slug },
      categoryId: currentProduct.categoryId,
    },
    limit,
  );
}
