import Link from "next/link";
import { ProductCard } from "@/components/product-card";

export function FeaturedProducts({ products = [] }) {
  const productCount = products.length;

  return (
    <section className="featured" id="featured">
      <div className="site-shell">
        <div className="section-heading section-heading--split">
          <div>
            <p className="section-heading__eyebrow">Sản phẩm nổi bật</p>
            <h2>{productCount} mẫu cơ bản để học cách render list bằng component</h2>
          </div>

          <Link href="/products" className="section-heading__link">
            Xem tất cả
          </Link>
        </div>

        <div className="featured__grid">
          {products.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
