export default function ProductsLoading() {
  return (
    <main className="products-page" aria-busy="true">
      <section className="products-page__hero">
        <div className="site-shell">
          <p className="products-page__eyebrow">Loading state</p>
          <h1>Đang tải catalog...</h1>
        </div>
      </section>

      <section className="products-page__list">
        <div
          className="site-shell products-page__grid"
          role="status"
          aria-live="polite"
        >
          <span className="sr-only">Đang tải danh sách sản phẩm.</span>
          {Array.from({ length: 6 }).map((_, index) => (
            <article
              key={index}
              className="product-card product-card--loading"
              aria-hidden="true"
            >
              <div className="product-card__image" />
              <div className="product-card__body">
                <div className="product-skeleton product-skeleton--short" />
                <div className="product-skeleton product-skeleton--title" />
                <div className="product-skeleton" />
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
