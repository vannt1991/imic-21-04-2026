"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useCart } from "@/components/cart-provider";
import { formatVnd } from "@/lib/format-vnd";
import { toCheckoutItems } from "@/lib/cart";

const defaultFormValues = {
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  shippingAddress: "",
};

export function CheckoutPageContent() {
  const router = useRouter();
  const { items, cartCount, subtotal, isHydrated, clearCart } = useCart();
  const [formValues, setFormValues] = useState(defaultFormValues);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitInFlightRef = useRef(false);

  function handleFieldChange(event) {
    const { name, value } = event.target;

    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitInFlightRef.current) {
      return;
    }

    submitInFlightRef.current = true;
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ...formValues,
          items: toCheckoutItems(items),
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setErrorMessage(
          payload?.error?.message ?? "Không thể tạo đơn hàng lúc này.",
        );
        return;
      }

      clearCart();
      router.push(`/order-success?orderId=${payload.id}`);
    } catch {
      setErrorMessage("Không thể tạo đơn hàng lúc này.");
    } finally {
      submitInFlightRef.current = false;
      setIsSubmitting(false);
    }
  }

  if (!isHydrated) {
    return (
      <main className="checkout-page cart-page">
        <section className="checkout-page__hero cart-page__hero">
          <div className="site-shell">
            <p className="cart-page__eyebrow">Thanh toán</p>
            <h1>Đang tải trang thanh toán...</h1>
          </div>
        </section>
      </main>
    );
  }

  if (!items.length) {
    return (
      <main className="checkout-page cart-page">
        <section className="checkout-page__hero cart-page__hero">
          <div className="site-shell cart-empty">
            <p className="cart-page__eyebrow">Thanh toán</p>
            <h1>Chưa có sản phẩm để checkout</h1>
            <p>
              Hãy thêm sản phẩm vào giỏ hàng trước, rồi quay lại đây để gửi đơn
              hàng ở buổi 8.
            </p>
            <Link href="/cart" className="button button--primary">
              Quay lại giỏ hàng
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="checkout-page cart-page">
      <section className="checkout-page__hero cart-page__hero">
        <div className="site-shell">
          <p className="cart-page__eyebrow">Thanh toán</p>
          <h1>Hoàn tất đơn hàng</h1>
          <p className="cart-page__description">
            Nhập thông tin khách hàng rồi gửi đơn hàng sang API
            `/api/orders`.
          </p>
        </div>
      </section>

      <section className="checkout-page__content cart-page__content">
        <div className="site-shell checkout-page__grid cart-page__grid">
          <form className="checkout-form" onSubmit={handleSubmit}>
            <div className="checkout-form__header">
              <p className="cart-summary__eyebrow">Thông tin khách hàng</p>
              <h2>Form đặt hàng</h2>
            </div>

            <label className="checkout-form__field">
              <span>Họ tên</span>
              <input
                name="customerName"
                value={formValues.customerName}
                onChange={handleFieldChange}
                autoComplete="name"
                required
              />
            </label>

            <label className="checkout-form__field">
              <span>Email</span>
              <input
                type="email"
                name="customerEmail"
                value={formValues.customerEmail}
                onChange={handleFieldChange}
                autoComplete="email"
                required
              />
            </label>

            <label className="checkout-form__field">
              <span>Số điện thoại</span>
              <input
                type="tel"
                name="customerPhone"
                value={formValues.customerPhone}
                onChange={handleFieldChange}
                autoComplete="tel"
                required
              />
            </label>

            <label className="checkout-form__field checkout-form__field--full">
              <span>Địa chỉ giao hàng</span>
              <textarea
                name="shippingAddress"
                rows="4"
                value={formValues.shippingAddress}
                onChange={handleFieldChange}
                autoComplete="street-address"
                required
              />
            </label>

            {errorMessage ? (
              <p className="checkout-form__error" role="alert">
                {errorMessage}
              </p>
            ) : null}

            <div className="checkout-form__actions">
              <button
                type="submit"
                className="button button--primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Đang gửi đơn..." : "Đặt hàng"}
              </button>

              <Link href="/cart" className="button button--secondary">
                Quay lại giỏ hàng
              </Link>
            </div>
          </form>

          <aside className="checkout-summary cart-summary">
            <p className="cart-summary__eyebrow">Tóm tắt đơn hàng</p>
            <h2>{cartCount} sản phẩm sẽ được gửi lên API</h2>

            <div className="checkout-summary__list">
              {items.map((item) => (
                <article key={item.slug} className="checkout-summary__item">
                  <div className="checkout-summary__copy">
                    <p>{item.badge || "Sản phẩm trong giỏ"}</p>
                    <h3>{item.name}</h3>
                    <span>
                      {item.quantity} x {formatVnd(item.price)}
                    </span>
                  </div>
                  <strong>{formatVnd(item.price * item.quantity)}</strong>
                </article>
              ))}
            </div>

            <div className="checkout-summary__row cart-summary__row">
              <span>Số lượng</span>
              <strong>{cartCount}</strong>
            </div>

            <div className="checkout-summary__row cart-summary__row">
              <span>Tạm tính</span>
              <strong>{formatVnd(subtotal)}</strong>
            </div>

            <div className="checkout-summary__row cart-summary__row cart-summary__row--total">
              <span>Tổng cộng</span>
              <strong>{formatVnd(subtotal)}</strong>
            </div>

            <p className="checkout-summary__note cart-summary__note">
              Payload line items chỉ gửi `slug` và `quantity`; giá trị còn lại
              sẽ được server xác nhận lại.
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}
