export const PRODUCTS_PER_PAGE = 9;

const CATEGORY_SLUG_PATTERN = /^[a-z0-9-]+$/;

function normalizeQuery(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, 60);
}

function normalizeCategory(value) {
  if (typeof value !== "string") {
    return "";
  }

  const normalized = value.trim().toLowerCase();

  return CATEGORY_SLUG_PATTERN.test(normalized) ? normalized : "";
}

function normalizePage(value) {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : 1;
  }

  if (typeof value !== "string") {
    return 1;
  }

  const normalized = value.trim();

  if (!/^[1-9]\d*$/.test(normalized)) {
    return 1;
  }

  return Number(normalized);
}

export function normalizeProductCatalogParams(searchParams = {}) {
  return {
    q: normalizeQuery(searchParams.q),
    category: normalizeCategory(searchParams.category),
    page: normalizePage(searchParams.page),
  };
}

export function buildProductWhere(filters) {
  const and = [];

  if (filters.q) {
    and.push({
      OR: [
        { name: { contains: filters.q, mode: "insensitive" } },
        { description: { contains: filters.q, mode: "insensitive" } },
        { category: { name: { contains: filters.q, mode: "insensitive" } } },
      ],
    });
  }

  if (filters.category) {
    and.push({
      category: {
        slug: filters.category,
      },
    });
  }

  return {
    isActive: true,
    ...(and.length > 0 ? { AND: and } : {}),
  };
}

export function buildCatalogHref(currentParams, overrides = {}) {
  const currentFilters = normalizeProductCatalogParams(currentParams);
  const mergedParams = normalizeProductCatalogParams({
    ...currentParams,
    ...overrides,
  });
  const shouldResetPage =
    (mergedParams.q !== currentFilters.q ||
      mergedParams.category !== currentFilters.category) &&
    !Object.prototype.hasOwnProperty.call(overrides, "page");

  const nextParams = normalizeProductCatalogParams({
    ...mergedParams,
    ...(shouldResetPage && !("page" in overrides) ? { page: 1 } : {}),
  });

  const searchParams = new URLSearchParams();

  if (nextParams.q) {
    searchParams.set("q", nextParams.q);
  }

  if (nextParams.category) {
    searchParams.set("category", nextParams.category);
  }

  if (nextParams.page > 1) {
    searchParams.set("page", String(nextParams.page));
  }

  const query = searchParams.toString();

  return query ? `/products?${query}` : "/products";
}
