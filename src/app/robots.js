import { getSiteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
