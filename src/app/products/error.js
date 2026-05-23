"use client";

export default function ProductsError({ error, reset }) {
  console.error(error);

  return (
    <main className="status-page">
      <section className="site-shell status-page__card">
        <p className="products-page__eyebrow">Error state</p>
        <h1>Không tải được catalog</h1>
        <p>
          Đã có lỗi xảy ra khi đọc dữ liệu sản phẩm. Vui lòng thử lại sau ít
          phút.
        </p>
        <button type="button" className="button button--primary" onClick={reset}>
          Thử lại
        </button>
      </section>
    </main>
  );
}
