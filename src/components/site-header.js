import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-shell site-header__inner">
        <Link href="/" className="site-brand">
          MiniShop
        </Link>

        <nav className="site-nav" aria-label="Primary">
          <a href="#featured">Sản phẩm nổi bật</a>
          <Link href="/products">Tất cả sản phẩm</Link>
          <a href="#story">Câu chuyện</a>
          <a href="#contact">Liên hệ</a>
        </nav>
      </div>
    </header>
  );
}
