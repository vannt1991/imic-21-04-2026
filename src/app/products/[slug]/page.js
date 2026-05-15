import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/add-to-cart-button";
import {
  getProductBySlug,
  getProductSlugs,
  getRelatedProducts,
} from "@/lib/products";
import { formatVnd } from "@/lib/format-vnd";

export function generateStaticParams() {
  return getProductSlugs();
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    return {
      title: "MiniShop | Không tìm thấy sản phẩm",
      description: "Sản phẩm không tồn tại trong catalog demo của MiniShop.",
    };
  }

  return {
    title: `MiniShop | ${product.name}`,
    description: product.description,
  };
}

export default async function ProductDetailPage({ params }) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const relatedProducts = getRelatedProducts(product.slug);
  const isSale = Boolean(product.originalPrice);

  return (
    <main className="product-detail">
      <section className="product-detail__hero">
        <div className="site-shell product-detail__grid">
          <div className="product-detail__visual" aria-hidden="true">
            <span className="product-detail__badge">{product.badge}</span>
            <p className="product-detail__visual-label">{product.category}</p>
          </div>

          <div className="product-detail__summary">
            <p className="product-detail__eyebrow">Product detail</p>
            <h1>{product.name}</h1>
            <p className="product-detail__description">{product.description}</p>

            <div className="product-detail__price-row">
              <strong>{formatVnd(product.price)}</strong>
              {isSale ? (
                <span className="product-detail__compare">
                  {formatVnd(product.originalPrice)}
                </span>
              ) : null}
            </div>

            <p
              className={`product-detail__stock ${
                product.inStock ? "" : "product-detail__stock--soldout"
              }`}
            >
              {product.inStock ? "Còn hàng" : "Hết hàng"}
            </p>

            <p className="product-detail__note">{product.note}</p>

            <div className="product-detail__actions">
              <AddToCartButton product={product} />
              <Link href="/cart" className="button button--secondary">
                Mở giỏ hàng
              </Link>
              <Link href="/products" className="button button--secondary">
                Quay lại danh sách
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="product-detail__related">
        <div className="site-shell">
          <div className="section-heading">
            <p className="section-heading__eyebrow">Sản phẩm liên quan</p>
            <h2>Gợi ý thêm để học cách nối từ detail sang list</h2>
          </div>

          <div className="related-products__grid">
            {relatedProducts.map((relatedProduct) => (
              <article
                key={relatedProduct.slug}
                className="related-products__item"
              >
                <h3>{relatedProduct.name}</h3>
                <p>{relatedProduct.category}</p>
                <Link href={`/products/${relatedProduct.slug}`}>
                  Xem chi tiết
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
