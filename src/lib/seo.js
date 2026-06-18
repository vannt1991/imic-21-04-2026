import { isProductionEnvironment } from "@/lib/env";

const FALLBACK_SITE_URL = "http://localhost:3000";
const MISSING_SITE_URL_ERROR =
  "NEXT_PUBLIC_SITE_URL must be set in production.";

function normalizeSiteUrl(value) {
  const url = new URL(value);
  const normalizedPathname =
    url.pathname !== "/" && url.pathname.endsWith("/")
      ? url.pathname.slice(0, -1)
      : url.pathname;

  url.pathname = normalizedPathname;
  url.search = "";
  url.hash = "";

  return url.toString().replace(/\/$/, normalizedPathname === "/" ? "" : "");
}

function readSiteUrlValue() {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!value) {
    return null;
  }

  return normalizeSiteUrl(value);
}

export function getOptionalSiteUrl() {
  const siteUrl = readSiteUrlValue();

  if (!siteUrl) {
    if (isProductionEnvironment()) {
      return null;
    }

    return FALLBACK_SITE_URL;
  }

  return siteUrl;
}

export function getSiteUrl() {
  const siteUrl = readSiteUrlValue();

  if (!siteUrl) {
    if (isProductionEnvironment()) {
      throw new Error(MISSING_SITE_URL_ERROR);
    }

    return FALLBACK_SITE_URL;
  }

  return siteUrl;
}

export function buildAbsoluteUrl(pathname = "/") {
  const baseUrl = new URL(getSiteUrl());
  const basePathname = baseUrl.pathname.endsWith("/")
    ? baseUrl.pathname
    : `${baseUrl.pathname}/`;
  const normalizedPath = pathname === "/" ? "" : pathname.replace(/^\/+/, "");

  baseUrl.pathname = basePathname;
  baseUrl.search = "";
  baseUrl.hash = "";

  return new URL(normalizedPath, baseUrl).toString();
}
