import Link from "next/link";
import { logoutAction } from "@/app/login/actions";
import { CartStatusLink } from "@/components/cart-status-link";
import { getCurrentUser } from "@/lib/auth";

export async function SiteHeader() {
  const currentUser = await getCurrentUser();

  return (
    <header className="site-header">
      <div className="site-shell site-header__inner">
        <Link href="/" className="site-brand">
          MiniShop
        </Link>

        <nav className="site-nav" aria-label="Primary">
          <Link href="/products">Tất cả sản phẩm</Link>
          {currentUser?.role === "ADMIN" ? <Link href="/admin">Admin</Link> : null}
          <CartStatusLink />
          <Link href="/#featured">Sản phẩm nổi bật</Link>
          <Link href="/#story">Câu chuyện</Link>
          <Link href="/#contact">Liên hệ</Link>
          {currentUser ? (
            <form action={logoutAction}>
              <input type="hidden" name="next" value="/" />
              <button type="submit" className="site-nav__button">
                Đăng xuất
              </button>
            </form>
          ) : (
            <Link href="/login?next=/admin">Đăng nhập</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
