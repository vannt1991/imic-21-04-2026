import { SiteHeader } from "@/components/site-header";
import { HeroSection } from "@/components/hero-section";
import { FeaturedProducts } from "@/components/featured-products";
import { featuredProducts } from "@/lib/products";

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
