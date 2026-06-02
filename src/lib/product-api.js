import { z } from "zod";

const requiredString = z.string().min(1);
const optionalNullableString = z.string().nullable().optional();
const nonNegativeInt = z.number().int().nonnegative();

function normalizeNullableString(value) {
  if (value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export const productCreateSchema = z.object({
  name: requiredString,
  slug: requiredString,
  description: requiredString,
  badge: optionalNullableString,
  originalPrice: nonNegativeInt.nullable().optional(),
  price: nonNegativeInt,
  image: optionalNullableString,
  note: optionalNullableString,
  stock: nonNegativeInt,
  featured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  categorySlug: requiredString,
});

export const productUpdateSchema = productCreateSchema
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided for update",
  );

export function toProductCreateData(payload, categoryId) {
  return {
    name: payload.name,
    slug: payload.slug,
    description: payload.description,
    badge: payload.badge,
    originalPrice: payload.originalPrice,
    price: payload.price,
    image: payload.image,
    note: payload.note,
    stock: payload.stock,
    featured: payload.featured,
    isActive: payload.isActive,
    categoryId,
  };
}

export function toProductUpdateData(payload, categoryId) {
  const data = {};
  if (payload.name !== undefined) data.name = payload.name;
  if (payload.slug !== undefined) data.slug = payload.slug;
  if (payload.description !== undefined) data.description = payload.description.trim();
  if (payload.badge !== undefined) data.badge = normalizeNullableString(payload.badge);
  if (payload.originalPrice !== undefined)
    data.originalPrice = payload.originalPrice;
  if (payload.price !== undefined) data.price = payload.price;
  if (payload.image !== undefined) data.image = normalizeNullableString(payload.image);
  if (payload.note !== undefined) data.note = normalizeNullableString(payload.note);
  if (payload.stock !== undefined) data.stock = payload.stock;
  if (payload.featured !== undefined) data.featured = payload.featured;
  if (payload.isActive !== undefined) data.isActive = payload.isActive;
  if (categoryId !== undefined) data.categoryId = categoryId;

  return data;
}

export function toProductApiModel(product) {
    return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        badge: product.badge,
        originalPrice: product.originalPrice,
        price: product.price,
        image: product.image,
        note: product.note,
        stock: product.stock,
        featured: product.featured,
        isActive: product.isActive,
        category: product.category
          ? {
              id: product.category.id,
              name: product.category.name,
              slug: product.category.slug,
            }
          : null,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
    };
}
