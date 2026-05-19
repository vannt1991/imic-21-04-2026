"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  CART_STORAGE_KEY,
  addCartItem,
  getCartCount,
  getCartSubtotal,
  parseStoredCart,
  removeCartItem,
  serializeCart,
  updateCartItemQuantity,
} from "@/lib/cart";

const CartContext = createContext(null);

function readStoredCart() {
  try {
    return parseStoredCart(window.localStorage.getItem(CART_STORAGE_KEY));
  } catch {
    return [];
  }
}

function persistCart(items) {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, serializeCart(items));
  } catch {
    // Ignore storage write failures so cart state stays usable in memory.
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const parsedCart = readStoredCart();

    // Hydrate from client storage after mount so the first client render
    // matches the server render and avoids hydration mismatch.
    queueMicrotask(() => {
      setItems(parsedCart);
      setIsHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    persistCart(items);
  }, [isHydrated, items]);

  function addToCart(product) {
    setItems((currentItems) => addCartItem(currentItems, product));
  }

  function updateQuantity(slug, quantity) {
    setItems((currentItems) =>
      updateCartItemQuantity(currentItems, slug, quantity),
    );
  }

  function removeFromCart(slug) {
    setItems((currentItems) => removeCartItem(currentItems, slug));
  }

  return (
    <CartContext.Provider
      value={{
        items,
        isHydrated,
        cartCount: getCartCount(items),
        subtotal: getCartSubtotal(items),
        addToCart,
        updateQuantity,
        removeFromCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
}
