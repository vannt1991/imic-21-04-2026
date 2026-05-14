export function HeroSection() {
  return (
    <section className="hero">
      <div className="hero__content">
        <p className="hero__eyebrow">New Collection 2026</p>
        <h1>Giày sneaker hiện đại cho nhịp sống mỗi ngày</h1>
        <p className="hero__description">
          Khám phá các mẫu sneaker dễ phối đồ, bền, êm và đủ nổi bật để học
          viên thấy ngay cấu trúc của một landing page bán hàng.
        </p>

        <div className="hero__actions">
          <a className="button button--primary" href="#featured">
            Xem sản phẩm nổi bật
          </a>
          <a className="button button--secondary" href="#story">
            Vì sao chọn MiniShop
          </a>
        </div>
      </div>
    </section>
  );
}
