"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart-provider";
import { formatVnd } from "@/lib/format-vnd";

export function CartPageContent() {
  const {
    items,
    cartCount,
    subtotal,
    isHydrated,
    updateQuantity,
    removeFromCart,
  } = useCart();
  const [draftQuantities, setDraftQuantities] = useState({});

  function handleQuantityChange(slug, nextValue) {
    if (nextValue === "") {
      setDraftQuantities((currentDrafts) => ({
        ...currentDrafts,
        [slug]: "",
      }));
      return;
    }

    const nextQuantity = Number(nextValue);

    if (!Number.isInteger(nextQuantity) || nextQuantity < 1) {
      return;
    }

    setDraftQuantities((currentDrafts) => ({
      ...currentDrafts,
      [slug]: String(nextQuantity),
    }));

    updateQuantity(slug, nextQuantity);
  }

  function handleQuantityBlur(slug, fallbackQuantity) {
    const draftQuantity = draftQuantities[slug];
    const parsedQuantity = Number(draftQuantity);

    if (draftQuantity === "" || !Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
      setDraftQuantities((currentDrafts) => ({
        ...currentDrafts,
        [slug]: String(fallbackQuantity),
      }));
    }
  }

  if (!isHydrated) {
    return (
      <main className="cart-page">
        <section className="cart-page__hero">
          <div className="site-shell">
            <p className="cart-page__eyebrow">Cart</p>
            <h1>Đang tải giỏ hàng...</h1>
          </div>
        </section>
      </main>
    );
  }

  if (!items.length) {
    return (
      <main className="cart-page">
        <section className="cart-page__hero">
          <div className="site-shell cart-empty">
            <p className="cart-page__eyebrow">Cart</p>
            <h1>Giỏ hàng đang trống</h1>
            <p>
              Hãy quay lại trang sản phẩm, chọn một đôi giày và thêm vào cart để
              học tiếp flow frontend của buổi 4.
            </p>
            <Link href="/products" className="button button--primary">
              Đi đến danh sách sản phẩm
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="cart-page">
      <section className="cart-page__hero">
        <div className="site-shell">
          <p className="cart-page__eyebrow">Cart</p>
          <h1>{cartCount} sản phẩm trong giỏ hàng</h1>
          <p className="cart-page__description">
            Trang này minh họa state dùng chung qua Context API và dữ liệu tạm
            thời được lưu ở `localStorage`.
          </p>
        </div>
      </section>

      <section className="cart-page__content">
        <div className="site-shell cart-page__grid">
          <div className="cart-page__list">
            {items.map((item) => (
              <article key={item.slug} className="cart-line">
                <div className="cart-line__copy">
                  <p className="cart-line__eyebrow">
                    {item.badge || "Cart item"}
                  </p>
                  <h2>{item.name}</h2>
                  <p>{formatVnd(item.price)} / sản phẩm</p>
                </div>

                <label className="cart-line__quantity">
                  <span>
                    Số lượng{" "}
                    <span className="sr-only">của {item.name}</span>
                  </span>
                  <input
                    type="number"
                    min="1"
                    inputMode="numeric"
                    value={draftQuantities[item.slug] ?? String(item.quantity)}
                    onBlur={() => handleQuantityBlur(item.slug, item.quantity)}
                    onChange={(event) =>
                      handleQuantityChange(item.slug, event.target.value)
                    }
                  />
                </label>

                <div className="cart-line__meta">
                  <strong>{formatVnd(item.price * item.quantity)}</strong>
                  <button
                    type="button"
                    className="cart-line__remove"
                    onClick={() => removeFromCart(item.slug)}
                  >
                    Xóa{" "}
                    <span className="sr-only">{item.name} khỏi giỏ hàng</span>
                  </button>
                </div>
              </article>
            ))}
          </div>

          <aside className="cart-summary">
            <p className="cart-summary__eyebrow">Tóm tắt đơn hàng</p>
            <h2>Tổng frontend của buổi 4</h2>

            <div className="cart-summary__row">
              <span>Số lượng</span>
              <strong>{cartCount}</strong>
            </div>

            <div className="cart-summary__row">
              <span>Tạm tính</span>
              <strong>{formatVnd(subtotal)}</strong>
            </div>

            <div className="cart-summary__row cart-summary__row--total">
              <span>Tổng cộng</span>
              <strong>{formatVnd(subtotal)}</strong>
            </div>

            <p className="cart-summary__note">
              Chưa có shipping fee hay checkout backend ở milestone này.
            </p>

            <Link href="/products" className="button button--secondary">
              Tiếp tục mua hàng
            </Link>
          </aside>
        </div>
      </section>
    </main>
  );
}
