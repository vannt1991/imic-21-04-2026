import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { getProducts } from "@/lib/products";

export const metadata = {
  title: "MiniShop | Tất cả sản phẩm",
  description: "Danh sách sản phẩm tĩnh của MiniShop.",
};

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <main className="products-page">
      <section className="products-page__hero">
        <div className="site-shell">
          <p className="products-page__eyebrow">Product listing</p>
          <h1>Tất cả sản phẩm</h1>
          <p className="products-page__description">
            Trang này đọc trực tiếp từ database để học cách tách data layer
            khỏi UI layer.
          </p>

          <Link href="/" className="button button--secondary">
            Quay lại trang chủ
          </Link>
        </div>
      </section>

      <section className="products-page__list">
        <div className="site-shell">
          <div className="products-page__grid">
            {products.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
