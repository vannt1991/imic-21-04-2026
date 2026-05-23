import { getProductSlugs } from "@/lib/products";
import { buildAbsoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap() {
  const products = await getProductSlugs();

  return [
    {
      url: buildAbsoluteUrl("/"),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: buildAbsoluteUrl("/products"),
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...products.map(({ slug }) => ({
      url: buildAbsoluteUrl(`/products/${slug}`),
      changeFrequency: "weekly",
      priority: 0.8,
    })),
  ];
}
