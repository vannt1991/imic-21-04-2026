import Link from "next/link";
import { DeleteProductButton } from "@/components/delete-product-button";
import { formatVnd } from "@/lib/format-vnd";
import { getAdminProducts } from "@/lib/admin-products";
import { requireAdminUser } from "@/lib/auth";
import { deleteProductAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "MiniShop Admin | Products",
  description: "Quản trị sản phẩm cho MiniShop.",
};

export default async function AdminProductsPage({ searchParams }) {
  await requireAdminUser({ nextPath: "/admin/products" });
  const products = await getAdminProducts();
  const params = await searchParams;
  const errorMessage = typeof params?.error === "string" ? params.error : "";

  return (
    <main className="admin-page">
      <section className="admin-page__hero admin-page__hero--split">
        <div>
          <p className="admin-page__eyebrow">Product CRUD</p>
          <h1>Quản lý sản phẩm</h1>
          <p className="admin-page__description">
            Tạo, sửa, xóa sản phẩm bằng Server Action rồi đồng bộ lại storefront.
          </p>
          {errorMessage ? (
            <p className="admin-page__description" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <Link href="/admin/products/new" className="button button--primary">
          Tạo sản phẩm
        </Link>
      </section>

      <section className="admin-product-list">
        {products.length === 0 ? (
          <article className="admin-product-card">
            <div className="admin-product-card__copy">
              <p className="admin-page__eyebrow">Catalog trống</p>
              <h2>Chưa có sản phẩm nào</h2>
              <p>Seed dữ liệu hoặc quay lại Task 3 để bắt đầu tạo sản phẩm.</p>
            </div>

            <div className="admin-product-card__actions">
              <Link href="/admin/products/new" className="button button--primary">
                Tạo sản phẩm đầu tiên
              </Link>
            </div>
          </article>
        ) : (
          products.map((product) => (
            <article key={product.id} className="admin-product-card">
              <div className="admin-product-card__copy">
                <p className="admin-page__eyebrow">{product.category.name}</p>
                <h2>{product.name}</h2>
                <p>/{product.slug}</p>
              </div>

              <dl className="admin-product-card__stats">
                <div>
                  <dt>Giá</dt>
                  <dd>{formatVnd(product.price)}</dd>
                </div>
                <div>
                  <dt>Tồn kho</dt>
                  <dd>{product.stock}</dd>
                </div>
                <div>
                  <dt>Trạng thái</dt>
                  <dd>{product.isActive ? "Đang bán" : "Ẩn"}</dd>
                </div>
              </dl>

              <div className="admin-product-card__actions">
                <Link
                  href={`/admin/products/${product.id}/edit`}
                  className="button button--secondary"
                >
                  Sửa
                </Link>

                <DeleteProductButton
                  action={deleteProductAction.bind(null, product.id)}
                  productName={product.name}
                />
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
