import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { ProductCatalogControls } from "@/components/product-catalog-controls";
import { ProductPagination } from "@/components/product-pagination";
import { buildAbsoluteUrl } from "@/lib/seo";
import {
  buildCatalogHref,
  normalizeProductCatalogParams,
} from "@/lib/product-search";
import { getProductCatalogPage } from "@/lib/products";

export async function generateMetadata({ searchParams }) {
  const filters = normalizeProductCatalogParams(await searchParams);
  const title = filters.q
    ? `Kết quả cho "${filters.q}"`
    : filters.category
      ? `Danh mục ${filters.category}`
      : "Tất cả sản phẩm";
  const description =
    filters.q || filters.category
      ? "Danh sách sản phẩm đã lọc bằng search params của MiniShop."
      : "Danh sách toàn bộ sneaker demo của MiniShop.";
  const canonicalPath = buildCatalogHref(filters);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: `${title} | MiniShop`,
      description,
      url: buildAbsoluteUrl(canonicalPath),
    },
  };
}

export default async function ProductsPage({ searchParams }) {
  const catalog = await getProductCatalogPage(await searchParams);

  return (
    <main className="products-page">
      <section className="products-page__hero">
        <div className="site-shell">
          <p className="products-page__eyebrow">Search + filter + pagination</p>
          <h1>Tất cả sản phẩm</h1>
          <p className="products-page__description">
            URL là source of truth để người học bookmark, chia sẻ, và debug
            trạng thái catalog.
          </p>
          <Link href="/" className="button button--secondary">
            Quay lại trang chủ
          </Link>
        </div>
      </section>

      <section className="products-page__list">
        <div className="site-shell products-page__stack">
          <div className="products-page__summary">
            <strong>{catalog.pagination.totalItems}</strong>
            <span>sản phẩm khớp điều kiện hiện tại</span>
          </div>

          <ProductCatalogControls
            filters={catalog.filters}
            categories={catalog.categories}
          />

          {catalog.hasResults ? (
            <>
              <div className="products-page__grid">
                {catalog.products.map((product) => (
                  <ProductCard key={product.slug} product={product} />
                ))}
              </div>

              <ProductPagination
                filters={catalog.filters}
                pagination={catalog.pagination}
              />
            </>
          ) : (
            <article className="products-empty-state">
              <p className="products-page__eyebrow">Empty state</p>
              <h2>Không có sản phẩm phù hợp</h2>
              <p>
                Thử đổi từ khóa, bỏ category filter, hoặc quay lại danh sách đầy
                đủ để kiểm tra catalog seed.
              </p>
              <Link href="/products" className="button button--primary">
                Xem lại toàn bộ sản phẩm
              </Link>
            </article>
          )}
        </div>
      </section>
    </main>
  );
}
