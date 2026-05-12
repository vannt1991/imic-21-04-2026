import { SiteHeader } from "@/components/site-header";
import { HeroSection } from "@/components/hero-section";
import { FeaturedProducts } from "@/components/featured-products";

const featuredProducts = [
  {
    name: "Air Runner Basic",
    category: "Running",
    badge: "Bestseller",
    description: "Mẫu sneaker gọn nhẹ, phù hợp cho buổi học đầu tiên.",
    priceLabel: "1.290.000đ",
    note: "Dễ phối đồ",
  },
  {
    name: "Street Flex Pro",
    category: "Lifestyle",
    badge: "New",
    description: "Thiết kế nổi bật hơn, hợp với phong cách streetwear.",
    priceLabel: "1.890.000đ",
    note: "Phối outfit nhanh",
  },
  {
    name: "Court Classic White",
    category: "Classic",
    badge: "Sale",
    description: "Một đôi basic sạch, đơn giản, dễ dùng hằng ngày.",
    priceLabel: "990.000đ",
    note: "Giá dễ tiếp cận",
  },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <HeroSection />
        <FeaturedProducts products={featuredProducts} />
        <section className="story" id="story">
          <div className="site-shell">
            <h2>Vì sao MiniShop?</h2>
            <p>
              Mục tiêu của project là học App Router bằng một flow bán hàng
              thật: landing → listing → detail → cart → checkout.
            </p>
          </div>
        </section>

        <section className="contact" id="contact">
          <div className="site-shell">
            <h2>Liên hệ</h2>
            <p>Email demo cho buổi học đầu tiên.</p>
          </div>
        </section>
      </main>
    </>
  );
}
