import Link from "next/link";

const adminLinks = [
  { href: "/admin", label: "Tổng quan" },
  { href: "/admin/products", label: "Sản phẩm" },
  { href: "/admin/products/new", label: "Tạo sản phẩm" },
];

export default function AdminLayout({ children }) {
  return (
    <div className="admin-layout">
      <aside className="admin-layout__sidebar">
        <div className="admin-layout__brand">
          <p className="admin-layout__eyebrow">MiniShop Admin</p>
          <h2>Quản trị catalog</h2>
          <p>
            Buổi 7 tập trung vào CRUD sản phẩm bằng Server Component và Server
            Action.
          </p>
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
