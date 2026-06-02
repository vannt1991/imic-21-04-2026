import { z } from "zod";

export const originalPriceInvariantMessage =
  "Original price must be greater than price.";

const requiredString = z.string().trim().min(1);
const nullableString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => normalizeNullableString(value));
const nullableUpdateString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) =>
    value === undefined ? undefined : normalizeNullableString(value),
  );
const nonNegativeInt = z.number().int().nonnegative();

function normalizeNullableString(value) {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function requireCategoryId(categoryId) {
  if (!categoryId) {
    throw new Error("Category resolution is required.");
  }

  return categoryId;
}

function stripUndefinedValues(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  );
}

function hasInvalidOriginalPrice(originalPrice, price) {
  return originalPrice !== null && originalPrice !== undefined && originalPrice <= price;
}

function addOriginalPriceIssue(context) {
  context.addIssue({
    code: "custom",
    path: ["originalPrice"],
    message: originalPriceInvariantMessage,
  });
}

const productFields = {
  name: requiredString,
  slug: requiredString,
  description: requiredString,
  price: nonNegativeInt,
  originalPrice: nonNegativeInt.nullable().optional().default(null),
  image: nullableString.default(null),
  badge: nullableString.default(null),
  note: nullableString.default(null),
  stock: nonNegativeInt,
  featured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  categorySlug: requiredString,
};

export const productCreateSchema = z
  .object(productFields)
  .strict()
  .superRefine((payload, context) => {
    if (hasInvalidOriginalPrice(payload.originalPrice, payload.price)) {
      addOriginalPriceIssue(context);
    }
  });

export const productUpdateSchema = z
  .object({
    name: requiredString.optional(),
    slug: requiredString.optional(),
    description: requiredString.optional(),
    price: nonNegativeInt.optional(),
    originalPrice: nonNegativeInt.nullable().optional(),
    image: nullableUpdateString,
    badge: nullableUpdateString,
    note: nullableUpdateString,
    stock: nonNegativeInt.optional(),
    featured: z.boolean().optional(),
    isActive: z.boolean().optional(),
    categorySlug: requiredString.optional(),
  })
  .strict()
  .transform(stripUndefinedValues)
  .superRefine((payload, context) => {
    if (
      payload.price !== undefined &&
      hasInvalidOriginalPrice(payload.originalPrice, payload.price)
    ) {
      addOriginalPriceIssue(context);
    }
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required.",
  });

export function toProductCreateData(payload, categoryId) {
  return {
    name: payload.name,
    slug: payload.slug,
    description: payload.description,
    price: payload.price,
    originalPrice: payload.originalPrice,
    image: payload.image,
    badge: payload.badge,
    note: payload.note,
    stock: payload.stock,
    featured: payload.featured,
    isActive: payload.isActive,
    categoryId: requireCategoryId(categoryId),
  };
}

export function toProductUpdateData(payload, categoryId) {
  const data = {};

  if (payload.name !== undefined) {
    data.name = payload.name;
  }

  if (payload.slug !== undefined) {
    data.slug = payload.slug;
  }

  if (payload.description !== undefined) {
    data.description = payload.description;
  }

  if (payload.price !== undefined) {
    data.price = payload.price;
  }

  if (payload.originalPrice !== undefined) {
    data.originalPrice = payload.originalPrice;
  }

  if (payload.image !== undefined) {
    data.image = payload.image;
  }

  if (payload.badge !== undefined) {
    data.badge = payload.badge;
  }

  if (payload.note !== undefined) {
    data.note = payload.note;
  }

  if (payload.stock !== undefined) {
    data.stock = payload.stock;
  }

  if (payload.featured !== undefined) {
    data.featured = payload.featured;
  }

  if (payload.isActive !== undefined) {
    data.isActive = payload.isActive;
  }

  if (payload.categorySlug !== undefined) {
    data.categoryId = requireCategoryId(categoryId);
  }

  return data;
}

export function toProductApiModel(product) {
  if (!product.category) {
    throw new Error("Product category is required.");
  }

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    price: product.price,
    originalPrice: product.originalPrice,
    image: product.image,
    badge: product.badge,
    note: product.note,
    stock: product.stock,
    featured: product.featured,
    isActive: product.isActive,
    category: {
      id: product.category.id,
      slug: product.category.slug,
      name: product.category.name,
    },
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}
