import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const AUTH_COOKIE_NAME = "minishop-role";
export const ROLE_ADMIN = "ADMIN";
export const ROLE_CUSTOMER = "CUSTOMER";

const roleUsers = Object.freeze({
  [ROLE_ADMIN]: Object.freeze({
    id: "stub-admin",
    name: "MiniShop Admin",
    email: "admin@minishop.local",
    role: ROLE_ADMIN,
  }),
  [ROLE_CUSTOMER]: Object.freeze({
    id: "stub-customer",
    name: "MiniShop Customer",
    email: "customer@minishop.local",
    role: ROLE_CUSTOMER,
  }),
});

export function normalizeRole(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();

  return roleUsers[normalized] ? normalized : null;
}

export function sanitizeNextPath(value) {
  if (typeof value !== "string") {
    return "/admin";
  }

  const trimmed = value.trim();

  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.includes("\\")
  ) {
    return "/admin";
  }

  return trimmed;
}

export async function getCurrentUser(cookieStore = null) {
  const store = cookieStore ?? (await cookies());
  const role = normalizeRole(store.get(AUTH_COOKIE_NAME)?.value);

  if (!role) {
    return null;
  }

  return { ...roleUsers[role] };
}

export async function requireAdminUser(options = {}) {
  const { nextPath = "/admin", cookieStore = null } = options;
  const user = await getCurrentUser(cookieStore);

  if (!user || user.role !== ROLE_ADMIN) {
    redirect(`/login?next=${encodeURIComponent(sanitizeNextPath(nextPath))}`);
  }

  return user;
}
