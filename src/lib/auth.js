import { createHmac, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jsonError } from "@/lib/api-response";
import { db } from "@/lib/db";
import { readRequiredEnv } from "@/lib/env";

export const SESSION_COOKIE_NAME = "minishop-session";
export const ROLE_ADMIN = "ADMIN";
export const ROLE_CUSTOMER = "CUSTOMER";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getAuthSecret() {
  return readRequiredEnv("AUTH_SECRET", {
    fallbackInTest: "test-auth-secret",
  });
}

function getSessionCookieOptions(expiresAt) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  };
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

export function hashSessionToken(token) {
  return createHmac("sha256", getAuthSecret()).update(token).digest("hex");
}

export async function createUserSession(userId, client = db) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await client.session.create({
    data: {
      tokenHash: hashSessionToken(token),
      userId,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function setAuthSession(userId, cookieStore = null, client = db) {
  const store = cookieStore ?? (await cookies());
  const session = await createUserSession(userId, client);

  store.set(
    SESSION_COOKIE_NAME,
    session.token,
    getSessionCookieOptions(session.expiresAt),
  );
}

export async function clearAuthSession(cookieStore = null, client = db) {
  const store = cookieStore ?? (await cookies());
  const token = store.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await client.session.deleteMany({
      where: { tokenHash: hashSessionToken(token) },
    });
  }

  store.delete(SESSION_COOKIE_NAME);
}

async function getCurrentSession({ cookieStore = null, client = db } = {}) {
  const store = cookieStore ?? (await cookies());
  const canMutateCookies = cookieStore !== null && cookieStore !== undefined;
  const token = store.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);
  const session = await client.session.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      expiresAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  if (!session) {
    if (canMutateCookies) {
      store.delete(SESSION_COOKIE_NAME);
    }
    return null;
  }

  if (session.expiresAt <= new Date()) {
    await client.session.deleteMany({
      where: { tokenHash },
    });
    if (canMutateCookies) {
      store.delete(SESSION_COOKIE_NAME);
    }
    return null;
  }

  return session;
}

export async function getCurrentUser(options = {}) {
  const session = await getCurrentSession(options);
  return session?.user ?? null;
}

export async function requireAuthenticatedUser(options = {}) {
  const { nextPath = "/" } = options;
  const user = await getCurrentUser(options);

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(sanitizeNextPath(nextPath))}`);
  }

  return user;
}

export async function requireAdminUser(options = {}) {
  const { nextPath = "/admin" } = options;
  const user = await getCurrentUser(options);

  if (!user || user.role !== ROLE_ADMIN) {
    redirect(`/login?next=${encodeURIComponent(sanitizeNextPath(nextPath))}`);
  }

  return user;
}

export async function requireAuthenticatedApiUser(options = {}) {
  const user = await getCurrentUser(options);

  if (!user) {
    return jsonError("Authentication required.", 401);
  }

  return user;
}

export async function requireAdminApiUser(options = {}) {
  const user = await getCurrentUser(options);

  if (!user) {
    return jsonError("Authentication required.", 401);
  }

  if (user.role !== ROLE_ADMIN) {
    return jsonError("Forbidden.", 403);
  }

  return user;
}
