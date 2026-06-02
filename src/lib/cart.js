export const CART_STORAGE_KEY = "minishop-cart";

function sanitizeQuantity(quantity) {
  if (!Number.isFinite(quantity) || quantity < 1) {
    return 1;
  }

  return Math.floor(quantity);
}

function toCartItem(product) {
  return {
    slug: product.slug,
    name: product.name,
    price: product.price,
    badge: product.badge,
    quantity: 1,
  };
}

export function addCartItem(items, product) {
  if (!product?.slug || !product?.inStock) {
    return items;
  }

  const existingItem = items.find((item) => item.slug === product.slug);

  if (!existingItem) {
    return [...items, toCartItem(product)];
  }

  return items.map((item) =>
    item.slug === product.slug
      ? { ...item, quantity: item.quantity + 1 }
      : item,
  );
}

export function updateCartItemQuantity(items, slug, quantity) {
  if (!slug) {
    return items;
  }

  if (!Number.isFinite(quantity)) {
    return items;
  }

  const nextQuantity = Math.floor(quantity);

  if (nextQuantity <= 0) {
    return removeCartItem(items, slug);
  }

  return items.map((item) =>
    item.slug === slug ? { ...item, quantity: nextQuantity } : item,
  );
}

export function removeCartItem(items, slug) {
  return items.filter((item) => item.slug !== slug);
}

export function getCartCount(items) {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function getCartSubtotal(items) {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
}

export function parseStoredCart(value) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    const itemsBySlug = new Map();

    for (const item of parsed) {
      if (
        !item ||
        typeof item.slug !== "string" ||
        typeof item.name !== "string" ||
        typeof item.price !== "number" ||
        !Number.isFinite(item.price) ||
        item.price < 0
      ) {
        continue;
      }

      const slug = item.slug.trim();

      if (!slug) {
        continue;
      }

      const quantity = sanitizeQuantity(item.quantity);
      const existingItem = itemsBySlug.get(slug);

      if (!existingItem) {
        itemsBySlug.set(slug, {
          slug,
          name: item.name,
          price: item.price,
          badge: typeof item.badge === "string" ? item.badge : "",
          quantity,
        });
        continue;
      }

      existingItem.quantity += quantity;
    }

    return Array.from(itemsBySlug.values());
  } catch {
    return [];
  }
}

export function serializeCart(items) {
  return JSON.stringify(items);
}

export function toCheckoutItems(items) {
  return items.reduce((checkoutItems, item) => {
    if (!item || typeof item.slug !== "string" || !Number.isInteger(item.quantity)) {
      return checkoutItems;
    }

    const slug = item.slug.trim();
    const quantity = item.quantity;

    if (!slug || quantity < 1) {
      return checkoutItems;
    }

    checkoutItems.push({ slug, quantity });
    return checkoutItems;
  }, []);
}
