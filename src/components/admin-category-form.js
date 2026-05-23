import Link from "next/link";

const emptyValues = {
  name: "",
  slug: "",
};

export function AdminCategoryForm({
  action,
  initialValues = emptyValues,
  title,
  description,
  submitLabel,
  errorMessage = "",
  submitDisabled = false,
}) {
  const values = { ...emptyValues, ...initialValues };

  return (
    <main className="admin-page">
      <section className="admin-page__hero">
        <p className="admin-page__eyebrow">Category CRUD</p>
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
          <span>Tên category</span>
          <input name="name" defaultValue={values.name} required />
        </label>

        <label className="admin-field">
          <span>Slug</span>
          <input name="slug" defaultValue={values.slug} required />
        </label>

        <div className="admin-form__actions">
          <button
            type="submit"
            className="button button--primary"
            disabled={submitDisabled}
          >
            {submitLabel}
          </button>
          <Link href="/admin/categories" className="button button--secondary">
            Hủy
          </Link>
        </div>
      </form>
    </main>
  );
}
