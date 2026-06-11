"use server";

import { redirect } from "next/navigation";
import {
  clearAuthSession,
  ROLE_ADMIN,
  sanitizeNextPath,
  setAuthSession,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/passwords";

function getTrimmedValue(formData, fieldName) {
  const value = formData.get(fieldName);
  return typeof value === "string" ? value.trim() : "";
}

function buildLoginUrl({ error, nextPath, email }) {
  const searchParams = new URLSearchParams({
    error,
    next: nextPath,
  });

  if (email) {
    searchParams.set("email", email);
  }

  return `/login?${searchParams.toString()}`;
}

function resolvePostLoginPath(user, nextPath) {
  if (user.role !== ROLE_ADMIN && nextPath.startsWith("/admin")) {
    return "/";
  }

  return nextPath;
}

export async function loginAction(formData) {
  const email = getTrimmedValue(formData, "email").toLowerCase();
  const password = getTrimmedValue(formData, "password");
  const nextPath = sanitizeNextPath(
    getTrimmedValue(formData, "next") || "/admin",
  );

  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      passwordHash: true,
    },
  });

  const isValid =
    !!user?.passwordHash &&
    password.length > 0 &&
    (await verifyPassword(password, user.passwordHash));

  if (!isValid) {
    return redirect(
      buildLoginUrl({
        error: "Email hoặc mật khẩu không đúng.",
        nextPath,
        email,
      }),
    );
  }

  await setAuthSession(user.id);
  return redirect(resolvePostLoginPath(user, nextPath));
}

export async function logoutAction(formData) {
  const nextPath = sanitizeNextPath(getTrimmedValue(formData, "next") || "/");

  await clearAuthSession();
  return redirect(nextPath === "/admin" ? "/" : nextPath);
}
