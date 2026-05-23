"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  AUTH_COOKIE_NAME,
  ROLE_ADMIN,
  ROLE_CUSTOMER,
  sanitizeNextPath,
} from "@/lib/auth";

const authCookieOptions = Object.freeze({
  httpOnly: true,
  sameSite: "lax",
  path: "/",
});

function readNextPath(formData, fallbackPath) {
  const rawValue = formData?.get("next");
  if (typeof rawValue !== "string") {
    return sanitizeNextPath(fallbackPath);
  }

  const trimmedPath = rawValue.trim();
  const sanitizedPath = sanitizeNextPath(rawValue);

  if (sanitizedPath !== trimmedPath) {
    return fallbackPath;
  }

  return sanitizedPath;
}

async function loginWithRole(role, formData) {
  const cookieStore = await cookies();

  cookieStore.set(AUTH_COOKIE_NAME, role, authCookieOptions);
  redirect(readNextPath(formData, "/admin"));
}

export async function loginAsAdminAction(formData) {
  await loginWithRole(ROLE_ADMIN, formData);
}

export async function loginAsCustomerAction(formData) {
  await loginWithRole(ROLE_CUSTOMER, formData);
}

export async function logoutAction(formData) {
  const cookieStore = await cookies();

  cookieStore.delete(AUTH_COOKIE_NAME);
  redirect(readNextPath(formData, "/"));
}
