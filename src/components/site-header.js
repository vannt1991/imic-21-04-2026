import Link from "next/link";
import { CartStatusLink } from "@/components/cart-status-link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-shell site-header__inner">
        <Link href="/" className="site-brand">
          MiniShop
        </Link>

        <nav className="site-nav" aria-label="Primary">
          <Link href="/products">Tất cả sản phẩm</Link>
          <CartStatusLink />
          <Link href="/#featured">Sản phẩm nổi bật</Link>
          <Link href="/#story">Câu chuyện</Link>
          <Link href="/#contact">Liên hệ</Link>
        </nav>
      </div>
    </header>
  );
}
