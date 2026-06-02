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

export const categoryCreateSchema = z.object({
  name: requiredString,
  slug: requiredString,
});

export const categoryUpdateSchema = categoryCreateSchema
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided for update",
  );

export function toCategoryCreateData(payload) {
  return {
    name: payload.name,
    slug: payload.slug,
  };
}

export function toCategoryUpdateData(payload) {
  const data = {};
  if (payload.name !== undefined) data.name = payload.name;
  if (payload.slug !== undefined) data.slug = payload.slug;

  return data;
}

export function toCategoryApiModel(category) {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
  };
}
