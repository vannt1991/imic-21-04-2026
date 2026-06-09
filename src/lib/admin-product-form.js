export function getTrimmedString(formData, fieldName) {
  const value = formData.get(fieldName);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

export function getNullableString(formData, fieldName) {
  const value = getTrimmedString(formData, fieldName);

  return value.length > 0 ? value : null;
}

function parseStrictInteger(value) {
  return /^-?\d+$/.test(value) ? Number(value) : Number.NaN;
}

export function getInteger(formData, fieldName) {
  const value = getTrimmedString(formData, fieldName);

  return parseStrictInteger(value);
}

export function getNullableInteger(formData, fieldName) {
  const value = getNullableString(formData, fieldName);

  return value === null ? null : parseStrictInteger(value);
}

export function getCheckboxValue(formData, fieldName) {
  return formData.has(fieldName);
}

export function readProductFormPayload(formData) {
  return {
    name: getTrimmedString(formData, "name"),
    slug: getTrimmedString(formData, "slug"),
    description: getTrimmedString(formData, "description"),
    price: getInteger(formData, "price"),
    originalPrice: getNullableInteger(formData, "originalPrice"),
    image: getNullableString(formData, "image"),
    badge: getNullableString(formData, "badge"),
    note: getNullableString(formData, "note"),
    stock: getInteger(formData, "stock"),
    featured: getCheckboxValue(formData, "featured"),
    isActive: getCheckboxValue(formData, "isActive"),
    categorySlug: getTrimmedString(formData, "categorySlug"),
  };
}

export function toProductFormValues(product) {
  return {
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    description: product?.description ?? "",
    price: product?.price?.toString() ?? "",
    originalPrice: product?.originalPrice?.toString() ?? "",
    image: product?.image ?? "",
    badge: product?.badge ?? "",
    note: product?.note ?? "",
    stock: product?.stock?.toString() ?? "0",
    featured: product?.featured ?? false,
    isActive: product?.isActive ?? true,
    categorySlug: product?.categorySlug ?? "",
  };
}
