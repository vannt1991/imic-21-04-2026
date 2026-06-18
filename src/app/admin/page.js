import Link from "next/link";
import { requireAdminUser } from "@/lib/auth";

export default async function AdminHomePage() {
  await requireAdminUser({ nextPath: "/admin" });

  return (
    <main className="admin-page">
      <section className="admin-page__hero">
        <p className="admin-page__eyebrow">Admin dashboard</p>
        <h1>Quản lý MiniShop bằng route guard phía server</h1>
        <p className="admin-page__description">
          Khu vực này giờ chỉ mở cho ADMIN và đã có thêm luồng xem, kiểm tra,
          cập nhật trạng thái đơn hàng.
        </p>
      </section>

      <section className="admin-shortcuts">
        <Link href="/admin/products" className="admin-shortcut-card">
          <h2>Danh sách sản phẩm</h2>
          <p>Xem catalog, trạng thái active, category, và tồn kho.</p>
        </Link>

        <Link href="/admin/products/new" className="admin-shortcut-card">
          <h2>Tạo sản phẩm mới</h2>
          <p>Submit form trực tiếp vào Server Action rồi quay lại trang list.</p>
        </Link>

        <Link href="/admin/categories" className="admin-shortcut-card">
          <h2>Quản lý category</h2>
          <p>
            Tạo, sửa, xóa category và kiểm tra relation với products trước khi
            delete.
          </p>
        </Link>

        <Link href="/admin/orders" className="admin-shortcut-card">
          <h2>Quản lý đơn hàng</h2>
          <p>Kiểm tra khách mua gì, tổng tiền bao nhiêu, và đổi status.</p>
        </Link>
      </section>
    </main>
  );
}
