import { afterEach, describe, expect, it } from "vitest";
import { buildAbsoluteUrl, getSiteUrl } from "../../src/lib/seo.js";

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  process.env.NODE_ENV = originalNodeEnv;
});

describe("seo helpers", () => {
  it("falls back to localhost in development when NEXT_PUBLIC_SITE_URL is missing", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NODE_ENV = "development";

    expect(getSiteUrl()).toBe("http://localhost:3000");
  });

  it("throws in production when NEXT_PUBLIC_SITE_URL is missing", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NODE_ENV = "production";

    expect(() => getSiteUrl()).toThrow(
      "NEXT_PUBLIC_SITE_URL must be set in production.",
    );
  });

  it("trims trailing slashes before building absolute URLs", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://minishop-demo.vercel.app/";

    expect(getSiteUrl()).toBe("https://minishop-demo.vercel.app");
    expect(buildAbsoluteUrl("/products?q=trail")).toBe(
      "https://minishop-demo.vercel.app/products?q=trail",
    );
  });

  it("preserves subpath deployments when building absolute URLs", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com/shop/";

    expect(getSiteUrl()).toBe("https://example.com/shop");
    expect(buildAbsoluteUrl("/products")).toBe(
      "https://example.com/shop/products",
    );
  });

  it("normalizes non-leading-slash inputs as relative paths", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com/shop";

    expect(buildAbsoluteUrl("products?q=trail")).toBe(
      "https://example.com/shop/products?q=trail",
    );
  });
});
