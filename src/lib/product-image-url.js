export function isRenderableProductImageUrl(value) {
  if (typeof value !== "string") {
    return false;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return false;
  }

  try {
    return new URL(trimmed).protocol === "https:";
  } catch {
    return false;
  }
}
