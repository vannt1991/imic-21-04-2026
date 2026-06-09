import Link from "next/link";

const emptyValues = {
  name: "",
  slug: "",
  description: "",
  price: "",
  originalPrice: "",
  image: "",
  badge: "",
  note: "",
  stock: "0",
  featured: false,
  isActive: true,
  categorySlug: "",
};

export function AdminProductForm({
  action,
  categories,
  initialValues = emptyValues,
  title,
  description,
  submitLabel,
  errorMessage = "",
  submitDisabled = false,
}) {
  const values = { ...emptyValues, ...initialValues };
  const hasCategories = categories.length > 0;
  const isSubmitDisabled = submitDisabled || !hasCategories;

  return (
    <main className="admin-page">
      <section className="admin-page__hero">
        <p className="admin-page__eyebrow">Server Action Form</p>
        <h1>{title}</h1>
        <p className="admin-page__description">{description}</p>
        {errorMessage ? (
          <p className="admin-page__description" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </section>

      <form action={action} className="admin-form">
        <label className="admin-field">
          <span>Tên sản phẩm</span>
          <input name="name" defaultValue={values.name} required />
        </label>

        <label className="admin-field">
          <span>Slug</span>
          <input name="slug" defaultValue={values.slug} required />
        </label>

        <label className="admin-field admin-field--full">
          <span>Mô tả</span>
          <textarea
            name="description"
            rows="4"
            defaultValue={values.description}
            required
          />
        </label>

        <label className="admin-field">
          <span>Giá bán</span>
          <input
            type="number"
            name="price"
            min="0"
            step="1"
            defaultValue={values.price}
            required
          />
        </label>

        <label className="admin-field">
          <span>Giá gốc</span>
          <input
            type="number"
            name="originalPrice"
            min="0"
            step="1"
            defaultValue={values.originalPrice}
          />
        </label>

        <label className="admin-field">
          <span>Tồn kho</span>
          <input
            type="number"
            name="stock"
            min="0"
            step="1"
            defaultValue={values.stock}
            required
          />
        </label>

        <label className="admin-field">
          <span>Category</span>
          <select
            name="categorySlug"
            defaultValue={values.categorySlug}
            disabled={!hasCategories}
            required={hasCategories}
          >
            <option value="">Chọn category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
          {!hasCategories ? (
            <span>Chưa có category nào để gán cho sản phẩm mới.</span>
          ) : null}
        </label>

        <label className="admin-field">
          <span>Image</span>
          <input name="image" defaultValue={values.image} />
        </label>

        <label className="admin-field">
          <span>Badge</span>
          <input name="badge" defaultValue={values.badge} />
        </label>

        <label className="admin-field admin-field--full">
          <span>Note</span>
          <textarea name="note" rows="3" defaultValue={values.note} />
        </label>

        <div className="admin-form__checkboxes">
          <label>
            <input
              type="checkbox"
              name="featured"
              defaultChecked={values.featured}
            />
            <span>Hiển thị ở featured products</span>
          </label>

          <label>
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={values.isActive}
            />
            <span>Cho phép xuất hiện ở storefront</span>
          </label>
        </div>

        <div className="admin-form__actions">
          <button
            type="submit"
            className="button button--primary"
            disabled={isSubmitDisabled}
          >
            {submitLabel}
          </button>
          <Link href="/admin/products" className="button button--secondary">
            Hủy
          </Link>
        </div>
      </form>
    </main>
  );
}
