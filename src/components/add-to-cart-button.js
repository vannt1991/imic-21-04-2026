"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/components/cart-provider";

export function AddToCartButton({ product }) {
  const { addToCart, isHydrated } = useCart();
  const [status, setStatus] = useState({ id: 0, message: "" });
  const isDisabled = !isHydrated || !product.inStock;

  useEffect(() => {
    if (!status.message) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setStatus((currentStatus) =>
        currentStatus.id === status.id
          ? { ...currentStatus, message: "" }
          : currentStatus,
      );
    }, 2500);

    return () => window.clearTimeout(timeoutId);
  }, [status]);

  function handleAddToCart() {
    if (!isHydrated || !product.inStock) {
      return;
    }

    addToCart(product);
    setStatus((currentStatus) => ({
      id: currentStatus.id + 1,
      message: `Đã thêm ${product.name} vào giỏ hàng.`,
    }));
  }

  return (
    <>
      <button
        type="button"
        className="button button--primary"
        disabled={isDisabled}
        onClick={handleAddToCart}
      >
        {!isHydrated ? "Đang tải giỏ hàng..." : isDisabled ? "Hết hàng" : "Thêm vào giỏ"}
      </button>
      <span key={status.id} className="sr-only" aria-live="polite" role="status">
        {status.message}
      </span>
    </>
  );
}
