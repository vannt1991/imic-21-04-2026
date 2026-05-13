import { ProductCard } from "@/components/product-card";

export function FeaturedProducts({ products = [] }) {
  return (
    <section className="featured" id="featured">
      <div className="site-shell">
        <div className="section-heading">
          <p className="section-heading__eyebrow">Sản phẩm nổi bật</p>
          <h2>3 mẫu cơ bản để học cách render list bằng component</h2>
        </div>

        <div className="featured__grid">
          {products.map((product) => (
            <ProductCard key={product.name} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
