import Link from "next/link";

export default function AdminHomePage() {
  return (
    <main className="admin-page">
      <section className="admin-page__hero">
        <p className="admin-page__eyebrow">Admin dashboard</p>
        <h1>Quản lý dữ liệu MiniShop từ server</h1>
        <p className="admin-page__description">
          Dùng khu vực này để tạo, sửa, và xóa sản phẩm mà không cần gọi API thủ
          công từ client.
        </p>
      </section>

      <section className="admin-shortcuts">
        <Link href="/admin/products" className="admin-shortcut-card">
          <h2>Danh sách sản phẩm</h2>
          <p>Xem toàn bộ catalog, trạng thái active, category, và tồn kho.</p>
        </Link>

        <Link href="/admin/products/new" className="admin-shortcut-card">
          <h2>Tạo sản phẩm mới</h2>
          <p>Submit form trực tiếp vào Server Action rồi quay lại trang list.</p>
        </Link>
      </section>
    </main>
  );
}
