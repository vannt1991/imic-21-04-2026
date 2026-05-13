export function ProductCard({ product }) {
  return (
    <article
      className="product-card"
      aria-label={`${product.badge} - ${product.name}`}
    >
      <div className="product-card__image" aria-hidden="true">
        <span>{product.badge}</span>
      </div>

      <div className="product-card__body">
        <p className="product-card__category">{product.category}</p>
        <h2 className="product-card__name">{product.name}</h2>
        <p className="product-card__description">{product.description}</p>

        <div className="product-card__footer">
          <strong>{product.priceLabel}</strong>
          <span>{product.note}</span>
        </div>
      </div>
    </article>
  );
}
