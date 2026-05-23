import { describe, expect, it } from "vitest";
import {
  categoryCreateSchema,
  categoryUpdateSchema,
  readCategoryFormPayload,
  toCategoryFormValues,
} from "../../src/lib/category-api.js";

function createFormData(fields) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) {
      continue;
    }

    formData.set(key, String(value));
  }

  return formData;
}

describe("category api helpers", () => {
  it("trims and parses create payloads", () => {
    expect(
      categoryCreateSchema.parse({
        name: "  Running Shoes  ",
        slug: " running-shoes ",
      }),
    ).toEqual({
      name: "Running Shoes",
      slug: "running-shoes",
    });
  });

  it("rejects invalid slugs with the expected message", () => {
    expect(() =>
      categoryCreateSchema.parse({
        name: "Running Shoes",
        slug: "Running Shoes",
      }),
    ).toThrow("Slug chỉ được chứa chữ thường, số, và dấu gạch ngang.");
  });

  it("rejects an empty patch payload", () => {
    expect(() => categoryUpdateSchema.parse({})).toThrow(
      "At least one field is required.",
    );
  });

  it("normalizes FormData into category payloads", () => {
    expect(
      readCategoryFormPayload(
        createFormData({
          name: "  Lifestyle  ",
          slug: " lifestyle ",
        }),
      ),
    ).toEqual({
      name: "Lifestyle",
      slug: "lifestyle",
    });
  });

  it("maps category records into form values", () => {
    expect(
      toCategoryFormValues({
        name: "Outdoor",
        slug: "outdoor",
      }),
    ).toEqual({
      name: "Outdoor",
      slug: "outdoor",
    });

    expect(toCategoryFormValues(undefined)).toEqual({
      name: "",
      slug: "",
    });
  });
});
