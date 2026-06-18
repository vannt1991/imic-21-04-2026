import { z } from "zod";

const slugMessage = "Slug chỉ được chứa chữ thường, số, và dấu gạch ngang.";
const requiredString = z.string().trim().min(1);
const slugSchema = requiredString.regex(/^[a-z0-9-]+$/, slugMessage);

function stripUndefinedValues(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  );
}

export const categoryCreateSchema = z
  .object({
    name: requiredString,
    slug: slugSchema,
  })
  .strict();

export const categoryUpdateSchema = z
  .object({
    name: requiredString.optional(),
    slug: slugSchema.optional(),
  })
  .strict()
  .transform(stripUndefinedValues)
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required.",
  });

export function readCategoryFormPayload(formData) {
  return {
    name:
      typeof formData.get("name") === "string"
        ? formData.get("name").trim()
        : "",
    slug:
      typeof formData.get("slug") === "string"
        ? formData.get("slug").trim()
        : "",
  };
}

export function toCategoryFormValues(category) {
  return {
    name: category?.name ?? "",
    slug: category?.slug ?? "",
  };
}
