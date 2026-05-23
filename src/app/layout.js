import "./globals.css";
import { Inter, Space_Grotesk } from "next/font/google";
import { CartProvider } from "@/components/cart-provider";
import { SiteHeader } from "@/components/site-header";
import { getOptionalSiteUrl } from "@/lib/seo";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const optionalSiteUrl = getOptionalSiteUrl();

export const metadata = {
  ...(optionalSiteUrl ? { metadataBase: new URL(optionalSiteUrl) } : {}),
  title: {
    default: "MiniShop | Sneaker Store",
    template: "%s | MiniShop",
  },
  description:
    "MiniShop course project: storefront, cart, checkout, admin, auth, và catalog filter bằng Next.js App Router.",
  openGraph: {
    title: "MiniShop",
    description:
      "Project học React + Next.js theo flow bán hàng hoàn chỉnh từ landing tới admin.",
    siteName: "MiniShop",
    locale: "vi_VN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MiniShop",
    description:
      "Project học React + Next.js theo flow bán hàng hoàn chỉnh từ landing tới admin.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body>
        <CartProvider>
          <SiteHeader />
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
