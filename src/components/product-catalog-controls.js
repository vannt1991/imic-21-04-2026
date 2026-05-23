import Link from "next/link";

export function ProductCatalogControls({ filters, categories }) {
  return (
    <form className="catalog-controls" action="/products">
      <label className="catalog-controls__field">
        <span>Từ khóa</span>
        <input
          type="search"
          name="q"
          defaultValue={filters.q}
          placeholder="Ví dụ: trail, running, sale"
        />
      </label>

      <label className="catalog-controls__field">
        <span>Danh mục</span>
        <select name="category" defaultValue={filters.category}>
          <option value="">Tất cả danh mục</option>
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <div className="catalog-controls__actions">
        <button type="submit" className="button button--primary">
          Áp dụng
        </button>

        <Link href="/products" className="button button--secondary">
          Xóa bộ lọc
        </Link>
      </div>
    </form>
  );
}
