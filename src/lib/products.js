import { db } from "@/lib/db";

export function toProductViewModel(product) {
  return {
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
