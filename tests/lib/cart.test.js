import { describe, expect, it } from "vitest";
import {
  addCartItem,
  getCartCount,
  getCartSubtotal,
  parseStoredCart,
  removeCartItem,
  serializeCart,
  updateCartItemQuantity,
} from "../../src/lib/cart.js";

const runningShoe = {
  slug: "air-runner-basic",
  name: "Air Runner Basic",
  price: 1290000,
  badge: "Bestseller",
  inStock: true,
};

const lifestyleShoe = {
  slug: "street-flex-pro",
  name: "Street Flex Pro",
  price: 1890000,
  badge: "New",
  inStock: true,
};

describe("cart helpers", () => {
  it("adds a new product with quantity 1", () => {
    expect(addCartItem([], runningShoe)).toEqual([
      {
        slug: "air-runner-basic",
        name: "Air Runner Basic",
        price: 1290000,
        badge: "Bestseller",
        quantity: 1,
      },
    ]);
  });

  it("increments quantity when adding the same product twice", () => {
    const firstPass = addCartItem([], runningShoe);

    expect(addCartItem(firstPass, runningShoe)).toEqual([
      {
        slug: "air-runner-basic",
        name: "Air Runner Basic",
        price: 1290000,
        badge: "Bestseller",
        quantity: 2,
      },
    ]);
  });

  it("updates a line quantity and removes it when the next quantity is zero", () => {
    const cart = addCartItem(addCartItem([], runningShoe), lifestyleShoe);

    expect(updateCartItemQuantity(cart, "street-flex-pro", 3)).toEqual([
      {
        slug: "air-runner-basic",
        name: "Air Runner Basic",
        price: 1290000,
        badge: "Bestseller",
        quantity: 1,
      },
      {
        slug: "street-flex-pro",
        name: "Street Flex Pro",
        price: 1890000,
        badge: "New",
        quantity: 3,
      },
    ]);

    expect(removeCartItem(cart, "air-runner-basic")).toEqual([
      {
        slug: "street-flex-pro",
        name: "Street Flex Pro",
        price: 1890000,
        badge: "New",
        quantity: 1,
      },
    ]);

    expect(updateCartItemQuantity(cart, "street-flex-pro", 0)).toEqual([
      {
        slug: "air-runner-basic",
        name: "Air Runner Basic",
        price: 1290000,
        badge: "Bestseller",
        quantity: 1,
      },
    ]);
  });

  it("ignores non-finite quantity updates", () => {
    const cart = addCartItem([], runningShoe);

    expect(updateCartItemQuantity(cart, "air-runner-basic", Number.NaN)).toEqual(
      cart,
    );
    expect(
      updateCartItemQuantity(cart, "air-runner-basic", Number.POSITIVE_INFINITY),
    ).toEqual(cart);
  });

  it("calculates cart count and subtotal from mixed items", () => {
    const cart = [
      {
        slug: "air-runner-basic",
        name: "Air Runner Basic",
        price: 1290000,
        badge: "Bestseller",
        quantity: 2,
      },
      {
        slug: "street-flex-pro",
        name: "Street Flex Pro",
        price: 1890000,
        badge: "New",
        quantity: 1,
      },
    ];

    expect(getCartCount(cart)).toBe(3);
    expect(getCartSubtotal(cart)).toBe(4470000);
  });

  it("returns an empty array for broken storage payloads", () => {
    expect(parseStoredCart("")).toEqual([]);
    expect(parseStoredCart("not-json")).toEqual([]);
    expect(parseStoredCart(JSON.stringify({ slug: "air-runner-basic" }))).toEqual(
      [],
    );
  });

  it("rejects stored cart entries with invalid prices", () => {
    expect(
      parseStoredCart(
        JSON.stringify([
          {
            slug: "air-runner-basic",
            name: "Air Runner Basic",
            price: 1290000,
            badge: "Bestseller",
            quantity: 2,
          },
          {
            slug: "broken-price",
            name: "Broken Price",
            price: -5000,
            badge: "Sale",
            quantity: 1,
          },
        ]),
      ),
    ).toEqual([
      {
        slug: "air-runner-basic",
        name: "Air Runner Basic",
        price: 1290000,
        badge: "Bestseller",
        quantity: 2,
      },
    ]);
  });

  it("serializes and restores a valid stored cart", () => {
    const cart = [
      {
        slug: "air-runner-basic",
        name: "Air Runner Basic",
        price: 1290000,
        badge: "Bestseller",
        quantity: 2,
      },
    ];

    expect(parseStoredCart(serializeCart(cart))).toEqual(cart);
  });
});
