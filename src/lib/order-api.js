import { z } from "zod";

const requiredString = z.string().trim().min(1);
const positiveInt = z.number().int().positive();

const checkoutItemSchema = z
  .object({
    slug: requiredString,
    quantity: positiveInt,
  })
  .strict();

export const createOrderSchema = z
  .object({
    customerName: requiredString,
    customerEmail: requiredString.email(),
    customerPhone: requiredString,
    shippingAddress: requiredString,
    items: z.array(checkoutItemSchema).min(1),
  })
  .strict();

export class MissingProductsError extends Error {
  constructor(slugs) {
    super("Some products are unavailable.");
    this.name = "MissingProductsError";
    this.slugs = slugs;
  }
}

export class InsufficientStockError extends Error {
  constructor(items) {
    super("Some products do not have enough stock.");
    this.name = "InsufficientStockError";
    this.items = items;
  }
}

export function collapseOrderItems(items) {
  const groupedItems = new Map();

  for (const item of items) {
    const currentQuantity = groupedItems.get(item.slug) ?? 0;
    groupedItems.set(item.slug, currentQuantity + item.quantity);
  }

  return Array.from(groupedItems, ([slug, quantity]) => ({ slug, quantity }));
}

export function buildOrderDraft(payload, products) {
  const items = collapseOrderItems(payload.items);
  const productsBySlug = new Map(products.map((product) => [product.slug, product]));
  const missingSlugs = items
    .filter((item) => {
      const product = productsBySlug.get(item.slug);
      return !product || !product.isActive;
    })
    .map((item) => item.slug);

  if (missingSlugs.length > 0) {
    throw new MissingProductsError(missingSlugs);
  }

  const insufficientItems = items
    .map((item) => {
      const product = productsBySlug.get(item.slug);

      if (product.stock >= item.quantity) {
        return null;
      }

      return {
        slug: item.slug,
        requestedQuantity: item.quantity,
        availableStock: product.stock,
      };
    })
    .filter(Boolean);

  if (insufficientItems.length > 0) {
    throw new InsufficientStockError(insufficientItems);
  }

  const stockReservations = [];
  const orderItems = [];
  let total = 0;

  for (const item of items) {
    const product = productsBySlug.get(item.slug);

    stockReservations.push({
      productId: product.id,
      slug: product.slug,
      quantity: item.quantity,
    });
    orderItems.push({
      productId: product.id,
      quantity: item.quantity,
      price: product.price,
    });
    total += product.price * item.quantity;
  }

  return {
    customer: {
      customerName: payload.customerName,
      customerEmail: payload.customerEmail,
      customerPhone: payload.customerPhone,
      shippingAddress: payload.shippingAddress,
    },
    total,
    stockReservations,
    orderItems,
  };
}

export const orderApiInclude = Object.freeze({
  items: {
    include: {
      product: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
    },
  },
});

function requireDate(value, fieldName) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error(`Order ${fieldName} is required.`);
  }

  return value;
}

export function toOrderApiModel(order) {
  const createdAt = requireDate(order.createdAt, "createdAt");
  const updatedAt = requireDate(order.updatedAt, "updatedAt");
  const items = Array.isArray(order.items) ? order.items : null;

  if (!items) {
    throw new Error("Order items are required.");
  }

  return {
    id: order.id,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    shippingAddress: order.shippingAddress,
    status: order.status,
    total: order.total,
    items: items.map((item) => {
      if (!item.product) {
        throw new Error("Order item product is required.");
      }

      return {
        id: item.id,
        quantity: item.quantity,
        price: item.price,
        product: {
          id: item.product.id,
          slug: item.product.slug,
          name: item.product.name,
        },
      };
    }),
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}
