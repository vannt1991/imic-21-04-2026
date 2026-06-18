import Link from "next/link";
import { DeleteCategoryButton } from "@/components/delete-category-button";
import { getAdminCategories } from "@/lib/admin-categories";
import { requireAdminUser } from "@/lib/auth";
import { deleteCategoryAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "MiniShop Admin | Categories",
  description: "Quản trị category cho MiniShop.",
};

export default async function AdminCategoriesPage({ searchParams }) {
  await requireAdminUser({ nextPath: "/admin/categories" });
  const categories = await getAdminCategories();
  const params = await searchParams;
  const errorMessage = typeof params?.error === "string" ? params.error : "";

  return (
    <main className="admin-page">
      <section className="admin-page__hero admin-page__hero--split">
        <div>
          <p className="admin-page__eyebrow">Category CRUD</p>
          <h1>Quản lý category</h1>
          <p className="admin-page__description">
            Tạo, sửa, xóa category bằng Server Action và chặn xóa khi còn sản
            phẩm liên quan.
          </p>
          {errorMessage ? (
            <p className="admin-page__description" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <Link href="/admin/categories/new" className="button button--primary">
          Tạo category
        </Link>
      </section>

      <section className="admin-product-list">
        {categories.length === 0 ? (
          <article className="admin-product-card">
            <div className="admin-product-card__copy">
              <p className="admin-page__eyebrow">Catalog trống</p>
              <h2>Chưa có category nào</h2>
              <p>Tạo category đầu tiên để gán cho sản phẩm trong admin.</p>
            </div>

            <div className="admin-product-card__actions">
              <Link
                href="/admin/categories/new"
                className="button button--primary"
              >
                Tạo category đầu tiên
              </Link>
            </div>
          </article>
        ) : (
          categories.map((category) => (
            <article key={category.id} className="admin-product-card">
              <div className="admin-product-card__copy">
                <p className="admin-page__eyebrow">
                  {category._count.products} sản phẩm
                </p>
                <h2>{category.name}</h2>
                <p>/{category.slug}</p>
              </div>

              <dl className="admin-product-card__stats">
                <div>
                  <dt>Sản phẩm</dt>
                  <dd>{category._count.products}</dd>
                </div>
              </dl>

              <div className="admin-product-card__actions">
                <Link
                  href={`/admin/categories/${category.id}/edit`}
                  className="button button--secondary"
                >
                  Sửa
                </Link>

                <DeleteCategoryButton
                  action={deleteCategoryAction.bind(null, category.id)}
                  categoryName={category.name}
                />
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
