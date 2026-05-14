import Link from "next/link";

export default function ProductNotFound() {
  return (
    <main className="product-not-found">
      <div className="site-shell product-not-found__inner">
        <p className="product-not-found__eyebrow">404</p>
        <h1>Không tìm thấy sản phẩm</h1>
        <p>
          Slug này không khớp với catalog demo. Hãy quay lại danh sách để chọn
          một sản phẩm hợp lệ.
        </p>

        <Link href="/products" className="button button--primary">
          Về trang danh sách
        </Link>
      </div>
    </main>
  );
}
