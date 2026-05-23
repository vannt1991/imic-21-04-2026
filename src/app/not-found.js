import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="status-page">
      <section className="site-shell status-page__card">
        <p className="products-page__eyebrow">404</p>
        <h1>Trang này không tồn tại</h1>
        <p>
          Kiểm tra lại URL hoặc quay về catalog để tiếp tục flow storefront của
          MiniShop.
        </p>
        <div className="hero__actions">
          <Link href="/" className="button button--primary">
            Về trang chủ
          </Link>
          <Link href="/products" className="button button--secondary">
            Xem sản phẩm
          </Link>
        </div>
      </section>
    </main>
  );
}
