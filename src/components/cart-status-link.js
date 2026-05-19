"use client";

import Link from "next/link";
import { useCart } from "@/components/cart-provider";

export function CartStatusLink() {
  const { cartCount } = useCart();

  return (
    <Link href="/cart" className="cart-status-link">
      <span>Giỏ hàng</span>
      <strong>{cartCount}</strong>
    </Link>
  );
}
