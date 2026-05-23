import Link from "next/link";
import { logoutAction } from "@/app/login/actions";
import { requireAdminUser } from "@/lib/auth";

const adminLinks = [
  { href: "/admin", label: "Tổng quan" },
  { href: "/admin/products", label: "Sản phẩm" },
  { href: "/admin/products/new", label: "Tạo sản phẩm" },
  { href: "/admin/orders", label: "Đơn hàng" },
];

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }) {
  const user = await requireAdminUser({ nextPath: "/admin" });

  return (
    <div className="admin-layout">
      <aside className="admin-layout__sidebar">
        <div className="admin-layout__brand">
          <p className="admin-layout__eyebrow">MiniShop Admin</p>
          <h2>Quản trị dữ liệu có phân quyền</h2>
          <p>
            Buổi 9 tập trung vào auth stub, route guard phía server, và quản lý
            đơn hàng.
          </p>
        </div>

        <div className="admin-layout__session">
          <p>Đang đăng nhập: {user.name}</p>
          <p>Role: {user.role}</p>

          <form action={logoutAction}>
            <input type="hidden" name="next" value="/" />
            <button type="submit" className="button button--secondary">
              Đăng xuất
            </button>
          </form>
        </div>

        <nav className="admin-layout__nav" aria-label="Admin">
          {adminLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="admin-layout__content">{children}</div>
    </div>
  );
}
