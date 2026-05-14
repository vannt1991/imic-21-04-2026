import Link from "next/link";
import { formatVnd } from "@/lib/format-vnd";

export function ProductCard({ product }) {
  const isSale = Boolean(product.originalPrice);
  const isOutOfStock = !product.inStock;
  const badgeLabel = isSale ? "Sale" : product.badge;

  return (
    <article
      className={`product-card ${isOutOfStock ? "product-card--soldout" : ""}`}
    >
      <Link
        href={`/products/${product.slug}`}
        className="product-card__link"
        aria-label={`Xem chi tiết ${product.name}`}
      >
        <div className="product-card__image" aria-hidden="true">
          <span>{badgeLabel}</span>
        </div>

        <div className="product-card__body">
          <p className="product-card__category">{product.category}</p>
          <h2 className="product-card__name">{product.name}</h2>
          <p className="product-card__description">{product.description}</p>

          <div className="product-card__price-row">
            <strong>{formatVnd(product.price)}</strong>
            {isSale ? (
              <span className="product-card__compare">
                {formatVnd(product.originalPrice)}
              </span>
            ) : null}
          </div>

          <p
            className={`product-card__stock ${
              isOutOfStock ? "product-card__stock--soldout" : ""
            }`}
          >
            {isOutOfStock ? "Hết hàng" : "Còn hàng"}
          </p>
        </div>
      </Link>
    </article>
  );
}
