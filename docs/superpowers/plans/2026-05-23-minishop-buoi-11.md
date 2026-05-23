# MiniShop Buổi 11 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the demo role-cookie auth with real database-backed session auth, then ship admin category CRUD with relation-safe delete.

**Architecture:** Keep the stack small and course-friendly: reuse `User` in Prisma, add a `Session` table, hash passwords with Node `crypto.scrypt`, store a random session token in an `httpOnly` cookie, and keep the DB copy hashed. Centralize login/logout/session lookup in `src/lib/auth.js`, reuse the existing server-action-first admin style, and protect product mutation APIs plus admin pages/actions from the same session lookup. Category CRUD should mirror the existing product CRUD structure so students can compare the two flows directly.

**Tech Stack:** Next.js 16 App Router, React 19, JavaScript, Prisma ORM, SQLite local dev, Zod, Vitest, ESLint, Node `crypto`.

---

## Current Codebase Notes

- `src/lib/auth.js` still trusts a stub cookie named `minishop-role`, so the source of truth is not the database yet.
- `src/app/login/page.js` only offers “Login as Admin/Customer” buttons; there is no email/password form, no password verification, and no session persistence.
- `prisma/schema.prisma` already has `User.passwordHash` and `User.role`, so buổi 11 can build on that instead of introducing a full auth provider.
- `prisma/seed.mjs` deletes users but does not create any real login credentials, so local testing would block without seed updates.
- Admin pages and server actions already call `requireAdminUser()`, which is good: replacing the auth helper will upgrade those boundaries with minimal churn.
- Product mutation APIs in `src/app/api/products/route.js` and `src/app/api/products/[id]/route.js` are still public. Buổi 11 should use them to teach that UI guards are not enough.
- There is no `/admin/categories` surface yet, but product CRUD already demonstrates the exact page/component/action pattern to copy.

## Scope Decisions

- Do **not** add a third-party auth package in this buổi. The course goal here is to teach the mechanics clearly, not abstract them away.
- Do **not** add `/register` in the main path. The spec marks it as “if time”; keep buổi 11 focused on session auth and admin category management.
- Do **not** change the local SQLite datasource yet. Production DB / CI / E2E belong to buổi 12.
- Keep roles string-based (`ADMIN`, `CUSTOMER`) to avoid an unnecessary enum migration during the auth transition.

## File Map

- Create: `prisma/migrations/20260523000000_add_sessions/migration.sql`
- Create: `src/lib/passwords.js`
- Create: `tests/lib/passwords.test.js`
- Create: `src/lib/admin-categories.js`
- Create: `src/lib/category-api.js`
- Create: `tests/lib/category-api.test.js`
- Create: `src/components/admin-category-form.js`
- Create: `src/components/delete-category-button.js`
- Create: `src/app/admin/categories/actions.js`
- Create: `src/app/admin/categories/page.js`
- Create: `src/app/admin/categories/new/page.js`
- Create: `src/app/admin/categories/[id]/edit/page.js`
- Create: `tests/app/admin-category-actions.test.js`
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `prisma/schema.prisma`
- Modify: `prisma/seed.mjs`
- Modify: `src/lib/auth.js`
- Modify: `tests/lib/auth.test.js`
- Modify: `src/app/login/actions.js`
- Modify: `src/app/login/page.js`
- Modify: `tests/app/login-actions.test.js`
- Modify: `src/app/api/products/route.js`
- Modify: `src/app/api/products/[id]/route.js`
- Modify: `tests/app/api-routes.test.js`
- Modify: `src/app/admin/layout.js`
- Modify: `src/app/admin/page.js`
- Modify: `src/app/admin/products/new/page.js`
- Modify: `src/app/admin/products/[id]/edit/page.js`
- Modify: `src/lib/admin-products.js`
- Modify: `src/app/globals.css`

## Verification Strategy

- Use `npm run test -- tests/lib/passwords.test.js tests/lib/auth.test.js tests/app/login-actions.test.js` for password hashing, session lookup, login, and logout flow.
- Use `npm run test -- tests/app/api-routes.test.js` to verify `POST`/`PATCH`/`DELETE` product APIs are no longer public while `GET` endpoints stay public.
- Use `npm run test -- tests/lib/category-api.test.js tests/app/admin-category-actions.test.js` for category validation and category CRUD/integrity behavior.
- Run `npm run lint` and `npm run build` after all auth/category work so App Router server boundaries, imports, and metadata compile cleanly.
- Run `npm run db:migrate && npm run db:seed`, then manually verify `/login`, `/admin`, `/admin/categories`, authorized vs unauthorized product API mutations, and category delete blocking when products still reference that category.

---

### Task 1: Add password hashing, session persistence, and seeded real users

**Files:**
- Create: `src/lib/passwords.js`
- Create: `tests/lib/passwords.test.js`
- Create: `prisma/migrations/20260523000000_add_sessions/migration.sql`
- Modify: `prisma/schema.prisma`
- Modify: `prisma/seed.mjs`
- Modify: `.env.example`

- [ ] **Step 1: Write the failing password-helper tests**

Create `tests/lib/passwords.test.js`:

```js
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../../src/lib/passwords.js";

describe("password helpers", () => {
  it("hashes and verifies passwords", async () => {
    const passwordHash = await hashPassword("admin123");

    expect(passwordHash).not.toBe("admin123");
    await expect(verifyPassword("admin123", passwordHash)).resolves.toBe(true);
    await expect(verifyPassword("wrong123", passwordHash)).resolves.toBe(false);
  });

  it("returns false for malformed hash payloads", async () => {
    await expect(verifyPassword("admin123", "broken-format")).resolves.toBe(
      false,
    );
  });
});
```

- [ ] **Step 2: Run the new password test file to verify the helper does not exist yet**

Run:
```bash
npm run test -- tests/lib/passwords.test.js
```

Expected:
- Vitest fails with a module-not-found error for `src/lib/passwords.js`.

- [ ] **Step 3: Implement the password hashing helper**

Create `src/lib/passwords.js`:

```js
import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, KEY_LENGTH);

  return `${salt}:${Buffer.from(derivedKey).toString("hex")}`;
}

export async function verifyPassword(password, passwordHash) {
  if (typeof passwordHash !== "string") {
    return false;
  }

  const [salt, storedHash] = passwordHash.split(":");

  if (!salt || !storedHash) {
    return false;
  }

  const derivedKey = await scrypt(password, salt, KEY_LENGTH);
  const storedBuffer = Buffer.from(storedHash, "hex");
  const derivedBuffer = Buffer.from(derivedKey);

  if (storedBuffer.length !== derivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(storedBuffer, derivedBuffer);
}
```

- [ ] **Step 4: Add a `Session` model to Prisma and commit the migration**

Update `prisma/schema.prisma`:

```prisma
model User {
  id           String    @id @default(cuid())
  name         String?
  email        String    @unique
  passwordHash String?
  role         String    @default("CUSTOMER")
  orders       Order[]
  sessions     Session[]
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

model Session {
  id        String   @id @default(cuid())
  tokenHash String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@index([expiresAt])
}
```

Create `prisma/migrations/20260523000000_add_sessions/migration.sql`:

```sql
CREATE TABLE "Session" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Session_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
```

- [ ] **Step 5: Seed real demo users and add the auth secret to env template**

Update `.env.example`:

```env
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
AUTH_SECRET="replace-me-with-a-long-random-string"
```

Update the relevant parts of `prisma/seed.mjs`:

```js
import { hashPassword } from "../src/lib/passwords.js";

const users = [
  {
    name: "MiniShop Admin",
    email: "admin@minishop.local",
    password: "admin123",
    role: "ADMIN",
  },
  {
    name: "MiniShop Customer",
    email: "customer@minishop.local",
    password: "customer123",
    role: "CUSTOMER",
  },
];

async function main() {
  await db.session.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.product.deleteMany();
  await db.category.deleteMany();
  await db.user.deleteMany();

  await db.category.createMany({ data: categories });

  const categoryRows = await db.category.findMany({
    select: { id: true, slug: true },
  });
  const categoryMap = new Map(
    categoryRows.map((category) => [category.slug, category.id]),
  );

  await db.product.createMany({
    data: products.map(({ categorySlug, ...product }) => ({
      ...product,
      categoryId: categoryMap.get(categorySlug),
    })),
  });

  await db.user.createMany({
    data: await Promise.all(
      users.map(async ({ password, ...user }) => ({
        ...user,
        passwordHash: await hashPassword(password),
      })),
    ),
  });
}
```

- [ ] **Step 6: Run the targeted tests and local DB bootstrap**

Run:
```bash
npm run test -- tests/lib/passwords.test.js
npm run db:migrate
npm run db:seed
```

Expected:
- Password helper tests pass.
- Migration creates `Session`.
- Seed completes and leaves two real loginable users in the database.

- [ ] **Step 7: Commit the persistence foundation**

Run:
```bash
git add tests/lib/passwords.test.js src/lib/passwords.js prisma/schema.prisma prisma/migrations/20260523000000_add_sessions/migration.sql prisma/seed.mjs .env.example
git commit -m "feat: add real auth session persistence"
```

---

### Task 2: Replace the demo role switcher with real login/logout and session-backed guard helpers

**Files:**
- Modify: `src/lib/auth.js`
- Modify: `tests/lib/auth.test.js`
- Modify: `src/app/login/actions.js`
- Modify: `src/app/login/page.js`
- Modify: `tests/app/login-actions.test.js`

- [ ] **Step 1: Rewrite the auth helper tests around real sessions**

Replace `tests/lib/auth.test.js` with:

```js
import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirectMock, db } = vi.hoisted(() => ({
  redirectMock: vi.fn((location) => {
    throw new Error(`REDIRECT:${location}`);
  }),
  db: {
    session: {
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({
  db,
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import {
  ROLE_ADMIN,
  ROLE_CUSTOMER,
  getCurrentUser,
  hashSessionToken,
  requireAdminUser,
  sanitizeNextPath,
} from "../../src/lib/auth.js";

function createCookieStore(value) {
  return {
    get(name) {
      if (name !== "minishop-session" || !value) {
        return undefined;
      }

      return { value };
    },
    delete: vi.fn(),
  };
}

describe("auth helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps redirect targets on internal paths only", () => {
    expect(sanitizeNextPath("/admin/orders")).toBe("/admin/orders");
    expect(sanitizeNextPath("orders")).toBe("/admin");
    expect(sanitizeNextPath("https://evil.example")).toBe("/admin");
  });

  it("hashes the session token deterministically", () => {
    process.env.AUTH_SECRET = "test-auth-secret";

    expect(hashSessionToken("token-123")).toBe(hashSessionToken("token-123"));
    expect(hashSessionToken("token-123")).not.toBe(hashSessionToken("token-456"));
  });

  it("returns null when the session cookie is missing", async () => {
    await expect(
      getCurrentUser({ cookieStore: createCookieStore() }),
    ).resolves.toBe(null);
  });

  it("returns the database user from an active session", async () => {
    process.env.AUTH_SECRET = "test-auth-secret";
    db.session.findUnique.mockResolvedValue({
      id: "sess_1",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      user: {
        id: "user_1",
        name: "MiniShop Admin",
        email: "admin@minishop.local",
        role: ROLE_ADMIN,
      },
    });

    await expect(
      getCurrentUser({ cookieStore: createCookieStore("token-123") }),
    ).resolves.toEqual({
      id: "user_1",
      name: "MiniShop Admin",
      email: "admin@minishop.local",
      role: ROLE_ADMIN,
    });
  });

  it("cleans up expired sessions and returns null", async () => {
    process.env.AUTH_SECRET = "test-auth-secret";
    const cookieStore = createCookieStore("expired-token");
    db.session.findUnique.mockResolvedValue({
      id: "sess_1",
      tokenHash: hashSessionToken("expired-token"),
      expiresAt: new Date("2000-01-01T00:00:00.000Z"),
      user: {
        id: "user_1",
        role: ROLE_ADMIN,
      },
    });

    await expect(getCurrentUser({ cookieStore })).resolves.toBe(null);
    expect(db.session.deleteMany).toHaveBeenCalledWith({
      where: { tokenHash: hashSessionToken("expired-token") },
    });
    expect(cookieStore.delete).toHaveBeenCalledWith("minishop-session");
  });

  it("redirects anonymous users to login with the next path", async () => {
    await expect(
      requireAdminUser({
        cookieStore: createCookieStore(),
        nextPath: "/admin/orders",
      }),
    ).rejects.toThrow("REDIRECT:/login?next=%2Fadmin%2Forders");
  });

  it("redirects logged-in customers away from admin pages", async () => {
    process.env.AUTH_SECRET = "test-auth-secret";
    db.session.findUnique.mockResolvedValue({
      id: "sess_2",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      user: {
        id: "user_2",
        name: "MiniShop Customer",
        email: "customer@minishop.local",
        role: ROLE_CUSTOMER,
      },
    });

    await expect(
      requireAdminUser({
        cookieStore: createCookieStore("customer-token"),
        nextPath: "/admin",
      }),
    ).rejects.toThrow("REDIRECT:/login?next=%2Fadmin");
  });
});
```

- [ ] **Step 2: Rewrite the login action tests for email/password auth**

Replace `tests/app/login-actions.test.js` with:

```js
import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, redirect, setAuthSession, clearAuthSession } = vi.hoisted(() => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
  },
  redirect: vi.fn(),
  setAuthSession: vi.fn(),
  clearAuthSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db,
}));

vi.mock("next/navigation", () => ({
  redirect,
}));

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual("@/lib/auth");

  return {
    ...actual,
    setAuthSession,
    clearAuthSession,
  };
});

vi.mock("@/lib/passwords", () => ({
  verifyPassword: vi.fn(),
}));

import { verifyPassword } from "@/lib/passwords";
import { loginAction, logoutAction } from "@/app/login/actions";

function createLoginFormData(overrides = {}) {
  const formData = new FormData();

  formData.set("email", overrides.email ?? "admin@minishop.local");
  formData.set("password", overrides.password ?? "admin123");
  formData.set("next", overrides.next ?? "/admin");

  return formData;
}

describe("login actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects back to login when credentials are invalid", async () => {
    db.user.findUnique.mockResolvedValue(null);

    await loginAction(createLoginFormData());

    expect(setAuthSession).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith(
      "/login?error=Email%20ho%E1%BA%B7c%20m%E1%BA%ADt%20kh%E1%BA%A9u%20kh%C3%B4ng%20%C4%91%C3%BAng.&next=%2Fadmin&email=admin%40minishop.local",
    );
  });

  it("creates a session and redirects the admin to the requested page", async () => {
    db.user.findUnique.mockResolvedValue({
      id: "user_admin",
      email: "admin@minishop.local",
      role: "ADMIN",
      passwordHash: "salt:hash",
    });
    verifyPassword.mockResolvedValue(true);

    await loginAction(createLoginFormData({ next: "/admin/orders" }));

    expect(setAuthSession).toHaveBeenCalledWith("user_admin");
    expect(redirect).toHaveBeenCalledWith("/admin/orders");
  });

  it("redirects customers away from admin targets after login", async () => {
    db.user.findUnique.mockResolvedValue({
      id: "user_customer",
      email: "customer@minishop.local",
      role: "CUSTOMER",
      passwordHash: "salt:hash",
    });
    verifyPassword.mockResolvedValue(true);

    await loginAction(
      createLoginFormData({
        email: "customer@minishop.local",
        password: "customer123",
        next: "/admin",
      }),
    );

    expect(setAuthSession).toHaveBeenCalledWith("user_customer");
    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("clears the current session on logout", async () => {
    const formData = new FormData();
    formData.set("next", "/");

    await logoutAction(formData);

    expect(clearAuthSession).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/");
  });
});
```

- [ ] **Step 3: Run the auth/login tests and confirm the current stub implementation fails**

Run:
```bash
npm run test -- tests/lib/auth.test.js tests/app/login-actions.test.js
```

Expected:
- The tests fail because `src/lib/auth.js` still reads `minishop-role` stub cookies.
- `loginAction` does not exist yet.

- [ ] **Step 4: Replace the auth stub with real session helpers**

Replace `src/lib/auth.js` with:

```js
import { createHmac, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jsonError } from "@/lib/api-response";
import { db } from "@/lib/db";

export const SESSION_COOKIE_NAME = "minishop-session";
export const ROLE_ADMIN = "ADMIN";
export const ROLE_CUSTOMER = "CUSTOMER";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getAuthSecret() {
  if (process.env.AUTH_SECRET) {
    return process.env.AUTH_SECRET;
  }

  if (process.env.NODE_ENV === "test") {
    return "test-auth-secret";
  }

  throw new Error("AUTH_SECRET is required.");
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
  const token = store.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = await client.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
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
    store.delete(SESSION_COOKIE_NAME);
    return null;
  }

  if (session.expiresAt <= new Date()) {
    await client.session.deleteMany({
      where: { tokenHash: hashSessionToken(token) },
    });
    store.delete(SESSION_COOKIE_NAME);
    return null;
  }

  return session;
}

export async function getCurrentUser(options = {}) {
  const session = await getCurrentSession(options);
  return session?.user ?? null;
}

export async function requireAdminUser(options = {}) {
  const { nextPath = "/admin" } = options;
  const user = await getCurrentUser(options);

  if (!user || user.role !== ROLE_ADMIN) {
    redirect(`/login?next=${encodeURIComponent(sanitizeNextPath(nextPath))}`);
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
```

- [ ] **Step 5: Replace demo login buttons with a real email/password flow**

Replace `src/app/login/actions.js` with:

```js
"use server";

import { redirect } from "next/navigation";
import { clearAuthSession, sanitizeNextPath, setAuthSession } from "@/lib/auth";
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
  if (user.role !== "ADMIN" && nextPath.startsWith("/admin")) {
    return "/";
  }

  return nextPath;
}

export async function loginAction(formData) {
  const email = getTrimmedValue(formData, "email").toLowerCase();
  const password = getTrimmedValue(formData, "password");
  const nextPath = sanitizeNextPath(getTrimmedValue(formData, "next") || "/admin");

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
    redirect(
      buildLoginUrl({
        error: "Email hoặc mật khẩu không đúng.",
        nextPath,
        email,
      }),
    );
  }

  await setAuthSession(user.id);
  redirect(resolvePostLoginPath(user, nextPath));
}

export async function logoutAction(formData) {
  const nextPath = sanitizeNextPath(
    getTrimmedValue(formData, "next") || "/",
  );

  await clearAuthSession();
  redirect(nextPath === "/admin" ? "/" : nextPath);
}
```

Replace `src/app/login/page.js` with:

```jsx
import Link from "next/link";
import { loginAction } from "@/app/login/actions";
import { getCurrentUser, sanitizeNextPath } from "@/lib/auth";

export const metadata = {
  title: "MiniShop | Login",
  description: "Email/password login page for MiniShop session auth.",
};

function readStringParam(params, key) {
  return typeof params?.[key] === "string" ? params[key] : "";
}

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const currentUser = await getCurrentUser();
  const nextPath = sanitizeNextPath(readStringParam(params, "next") || "/admin");
  const errorMessage = readStringParam(params, "error");
  const email = readStringParam(params, "email");

  return (
    <main className="login-page site-shell">
      <section className="login-card">
        <p className="login-card__eyebrow">Real session auth</p>
        <h1>Đăng nhập bằng tài khoản thật</h1>
        <p className="login-card__description">
          Buổi 11 dùng user trong database, hash password, và session cookie
          phía server thay cho role cookie stub.
        </p>

        {currentUser ? (
          <p className="login-card__session" role="status">
            Phiên hiện tại: <strong>{currentUser.name ?? currentUser.email}</strong>
            {" "}({currentUser.role})
          </p>
        ) : null}

        {errorMessage ? (
          <p className="login-card__session" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <form action={loginAction} className="login-form">
          <input type="hidden" name="next" value={nextPath} />

          <label className="login-field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              defaultValue={email}
              required
              autoComplete="email"
            />
          </label>

          <label className="login-field">
            <span>Mật khẩu</span>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
            />
          </label>

          <button type="submit" className="button button--primary">
            Đăng nhập
          </button>
        </form>

        <div className="login-card__hint">
          <p>Tài khoản seed để demo:</p>
          <p>`admin@minishop.local / admin123`</p>
          <p>`customer@minishop.local / customer123`</p>
        </div>

        <div className="login-card__links">
          <Link href="/">Về storefront</Link>
          <Link href="/products">Xem catalog</Link>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 6: Re-run the auth/login tests**

Run:
```bash
npm run test -- tests/lib/auth.test.js tests/app/login-actions.test.js
```

Expected:
- Auth helper tests pass against the new session-backed flow.
- Login/logout action tests pass with email/password credentials.

- [ ] **Step 7: Commit the real auth flow**

Run:
```bash
git add src/lib/auth.js tests/lib/auth.test.js src/app/login/actions.js src/app/login/page.js tests/app/login-actions.test.js
git commit -m "feat: replace demo auth with real sessions"
```

---

### Task 3: Protect product mutation APIs with the real admin session

**Files:**
- Modify: `src/app/api/products/route.js`
- Modify: `src/app/api/products/[id]/route.js`
- Modify: `tests/app/api-routes.test.js`

- [ ] **Step 1: Add failing API auth tests before touching the routes**

Update the mocked auth setup at the top of `tests/app/api-routes.test.js`:

```js
const { db, requireAdminApiUser } = vi.hoisted(() => ({
  db: {
    category: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    product: {
      create: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  requireAdminApiUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db,
}));

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual("@/lib/auth");

  return {
    ...actual,
    requireAdminApiUser,
  };
});
```

Add these cases inside the suite:

```js
  it("POST /api/products returns 401 for anonymous requests", async () => {
    requireAdminApiUser.mockResolvedValue(
      Response.json({ error: { message: "Authentication required." } }, { status: 401 }),
    );

    const response = await createProduct(
      new Request("http://localhost/api/products", {
        method: "POST",
        body: JSON.stringify({
          name: "API Runner",
          slug: "api-runner",
          description: "Temporary product for route testing.",
          price: 990000,
          stock: 4,
          categorySlug: "running",
        }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(401);
    expect(await readJson(response)).toEqual({
      error: { message: "Authentication required." },
    });
    expect(db.product.create).not.toHaveBeenCalled();
  });

  it("PATCH /api/products/[id] returns 403 for non-admin users", async () => {
    requireAdminApiUser.mockResolvedValue(
      Response.json({ error: { message: "Forbidden." } }, { status: 403 }),
    );

    const response = await patchProduct(
      new Request("http://localhost/api/products/prod_1", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated Runner" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "prod_1" }) },
    );

    expect(response.status).toBe(403);
    expect(await readJson(response)).toEqual({
      error: { message: "Forbidden." },
    });
    expect(db.product.update).not.toHaveBeenCalled();
  });
```

Also set the default success path in `beforeEach`:

```js
  beforeEach(() => {
    vi.resetAllMocks();
    requireAdminApiUser.mockResolvedValue({
      id: "user_admin",
      role: "ADMIN",
    });
  });
```

- [ ] **Step 2: Run the API route tests and confirm they fail on the still-public mutations**

Run:
```bash
npm run test -- tests/app/api-routes.test.js
```

Expected:
- The new auth assertions fail because the current route handlers never call `requireAdminApiUser()`.

- [ ] **Step 3: Guard `POST`, `PATCH`, and `DELETE` using the shared session helper**

Update `src/app/api/products/route.js`:

```js
import { requireAdminApiUser } from "@/lib/auth";

export async function POST(request) {
  const authResult = await requireAdminApiUser();

  if (authResult instanceof Response) {
    return authResult;
  }

  try {
    const payload = productCreateSchema.parse(await request.json());
    const category = await db.category.findUnique({
      where: { slug: payload.categorySlug },
      select: { id: true },
    });

    if (!category) {
      return jsonError("Category not found.", 404);
    }

    const product = await db.product.create({
      data: toProductCreateData(payload, category.id),
      include: { category: true },
    });

    return Response.json(toProductApiModel(product), { status: 201 });
  } catch (error) {
    if (isForeignKeyConstraintError(error)) {
      return jsonError("Category not found.", 404);
    }

    return handleProductRouteError(error);
  }
}
```

Update the mutation handlers in `src/app/api/products/[id]/route.js`:

```js
import { requireAdminApiUser } from "@/lib/auth";

export async function PATCH(request, { params }) {
  const authResult = await requireAdminApiUser();

  if (authResult instanceof Response) {
    return authResult;
  }

  // keep the existing validation/update logic below this guard
}

export async function DELETE(_request, { params }) {
  const authResult = await requireAdminApiUser();

  if (authResult instanceof Response) {
    return authResult;
  }

  // keep the existing delete logic below this guard
}
```

- [ ] **Step 4: Re-run the API route suite**

Run:
```bash
npm run test -- tests/app/api-routes.test.js
```

Expected:
- Public `GET` routes still pass.
- Product mutation routes now reject anonymous/non-admin callers before any database write.

- [ ] **Step 5: Commit the API guard upgrade**

Run:
```bash
git add src/app/api/products/route.js 'src/app/api/products/[id]/route.js' tests/app/api-routes.test.js
git commit -m "feat: protect product mutation APIs with admin sessions"
```

---

### Task 4: Build admin category CRUD with relation-safe delete

**Files:**
- Create: `src/lib/admin-categories.js`
- Create: `src/lib/category-api.js`
- Create: `tests/lib/category-api.test.js`
- Create: `src/components/admin-category-form.js`
- Create: `src/components/delete-category-button.js`
- Create: `src/app/admin/categories/actions.js`
- Create: `src/app/admin/categories/page.js`
- Create: `src/app/admin/categories/new/page.js`
- Create: `src/app/admin/categories/[id]/edit/page.js`
- Create: `tests/app/admin-category-actions.test.js`
- Modify: `src/lib/admin-products.js`
- Modify: `src/app/admin/products/new/page.js`
- Modify: `src/app/admin/products/[id]/edit/page.js`

- [ ] **Step 1: Write the failing category validation tests**

Create `tests/lib/category-api.test.js`:

```js
import { describe, expect, it } from "vitest";
import {
  categoryCreateSchema,
  categoryUpdateSchema,
  readCategoryFormPayload,
  toCategoryFormValues,
} from "../../src/lib/category-api.js";

describe("category api helpers", () => {
  it("parses create payloads and trims values", () => {
    expect(
      categoryCreateSchema.parse({
        name: "  Running  ",
        slug: "running",
      }),
    ).toEqual({
      name: "Running",
      slug: "running",
    });
  });

  it("rejects invalid slugs", () => {
    expect(() =>
      categoryCreateSchema.parse({
        name: "Running",
        slug: "Running Shoes",
      }),
    ).toThrow("Slug chỉ được chứa chữ thường, số, và dấu gạch ngang.");
  });

  it("rejects empty patch payloads", () => {
    expect(() => categoryUpdateSchema.parse({})).toThrow(
      "At least one field is required.",
    );
  });

  it("reads category form payloads from FormData", () => {
    const formData = new FormData();
    formData.set("name", "  Outdoor  ");
    formData.set("slug", "outdoor");

    expect(readCategoryFormPayload(formData)).toEqual({
      name: "Outdoor",
      slug: "outdoor",
    });
  });

  it("maps category rows to admin form values", () => {
    expect(
      toCategoryFormValues({
        name: "Lifestyle",
        slug: "lifestyle",
      }),
    ).toEqual({
      name: "Lifestyle",
      slug: "lifestyle",
    });
  });
});
```

- [ ] **Step 2: Write the failing admin category action tests**

Create `tests/app/admin-category-actions.test.js`:

```js
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, revalidatePath, redirect, requireAdminUser } = vi.hoisted(() => ({
  db: {
    category: {
      create: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  revalidatePath: vi.fn(),
  redirect: vi.fn((location) => {
    throw new Error(`REDIRECT:${location}`);
  }),
  requireAdminUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db,
}));

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual("@/lib/auth");

  return {
    ...actual,
    requireAdminUser,
  };
});

vi.mock("next/cache", () => ({
  revalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect,
}));

import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/app/admin/categories/actions";

function createKnownRequestError(code, message = "Prisma request failed.") {
  return new Prisma.PrismaClientKnownRequestError(message, {
    code,
    clientVersion: "test",
  });
}

function createCategoryFormData(overrides = {}) {
  const formData = new FormData();

  formData.set("name", overrides.name ?? "Running");
  formData.set("slug", overrides.slug ?? "running");

  return formData;
}

describe("admin category actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminUser.mockResolvedValue({
      id: "user_admin",
      role: "ADMIN",
    });
  });

  it("creates a category and redirects back to the list", async () => {
    db.category.create.mockResolvedValue({ id: "cat_1", slug: "running" });

    await expect(createCategoryAction(createCategoryFormData())).rejects.toThrow(
      "REDIRECT:/admin/categories",
    );

    expect(db.category.create).toHaveBeenCalledWith({
      data: { name: "Running", slug: "running" },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/categories");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/products");
    expect(revalidatePath).toHaveBeenCalledWith("/products");
  });

  it("redirects back to the create form when slug is duplicated", async () => {
    db.category.create.mockRejectedValue(createKnownRequestError("P2002"));

    await expect(createCategoryAction(createCategoryFormData())).rejects.toThrow(
      "REDIRECT:/admin/categories/new?error=Slug%20%C4%91%C3%A3%20t%E1%BB%93n%20t%E1%BA%A1i.%20Vui%20l%C3%B2ng%20ch%E1%BB%8Dn%20slug%20kh%C3%A1c.&name=Running&slug=running",
    );
  });

  it("updates a category and redirects back to the list", async () => {
    db.category.update.mockResolvedValue({ id: "cat_1", slug: "lifestyle" });

    await expect(
      updateCategoryAction("cat_1", createCategoryFormData({ name: "Lifestyle", slug: "lifestyle" })),
    ).rejects.toThrow("REDIRECT:/admin/categories");

    expect(db.category.update).toHaveBeenCalledWith({
      where: { id: "cat_1" },
      data: { name: "Lifestyle", slug: "lifestyle" },
    });
  });

  it("blocks deleting categories that still have products", async () => {
    db.category.findUnique.mockResolvedValue({
      id: "cat_1",
      _count: {
        products: 3,
      },
    });

    await expect(deleteCategoryAction("cat_1")).rejects.toThrow(
      "REDIRECT:/admin/categories?error=Kh%C3%B4ng%20th%E1%BB%83%20x%C3%B3a%20category%20%C4%91ang%20c%C3%B2n%20s%E1%BA%A3n%20ph%E1%BA%A9m.",
    );

    expect(db.category.delete).not.toHaveBeenCalled();
  });

  it("deletes empty categories", async () => {
    db.category.findUnique.mockResolvedValue({
      id: "cat_1",
      _count: {
        products: 0,
      },
    });
    db.category.delete.mockResolvedValue({ id: "cat_1" });

    await expect(deleteCategoryAction("cat_1")).rejects.toThrow(
      "REDIRECT:/admin/categories",
    );

    expect(db.category.delete).toHaveBeenCalledWith({
      where: { id: "cat_1" },
    });
  });
});
```

- [ ] **Step 3: Run the category test files and confirm the missing modules fail**

Run:
```bash
npm run test -- tests/lib/category-api.test.js tests/app/admin-category-actions.test.js
```

Expected:
- Vitest fails because category helper/action modules do not exist yet.

- [ ] **Step 4: Implement the category helper layer**

Create `src/lib/category-api.js`:

```js
import { z } from "zod";

const requiredString = z.string().trim().min(1);
const slugSchema = z
  .string()
  .trim()
  .min(1)
  .regex(
    /^[a-z0-9-]+$/,
    "Slug chỉ được chứa chữ thường, số, và dấu gạch ngang.",
  );

function stripUndefinedValues(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  );
}

function getTrimmedValue(formData, fieldName) {
  const value = formData.get(fieldName);
  return typeof value === "string" ? value.trim() : "";
}

export const categoryCreateSchema = z
  .object({
    name: requiredString,
    slug: slugSchema,
  })
  .strict();

export const categoryUpdateSchema = z
  .object({
    name: requiredString.optional(),
    slug: slugSchema.optional(),
  })
  .strict()
  .transform(stripUndefinedValues)
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required.",
  });

export function readCategoryFormPayload(formData) {
  return {
    name: getTrimmedValue(formData, "name"),
    slug: getTrimmedValue(formData, "slug"),
  };
}

export function toCategoryFormValues(category) {
  return {
    name: category?.name ?? "",
    slug: category?.slug ?? "",
  };
}
```

Create `src/lib/admin-categories.js`:

```js
import { db } from "@/lib/db";

export async function getAdminCategories() {
  return db.category.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      _count: {
        select: {
          products: true,
        },
      },
    },
    orderBy: [{ name: "asc" }],
  });
}

export async function getAdminCategoryById(id) {
  if (!id) {
    return null;
  }

  return db.category.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: {
        select: {
          products: true,
        },
      },
    },
  });
}
```

Update `src/lib/admin-products.js` so it only owns product reads:

```js
import { db } from "@/lib/db";

const categorySelect = {
  id: true,
  slug: true,
  name: true,
};

export async function getAdminProducts() {
  return db.product.findMany({
    include: {
      category: {
        select: categorySelect,
      },
    },
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
  });
}

export async function getAdminProductById(id) {
  if (!id) {
    return null;
  }

  return db.product.findUnique({
    where: { id },
    include: {
      category: {
        select: categorySelect,
      },
    },
  });
}
```

- [ ] **Step 5: Implement the category pages, forms, and server actions**

Create `src/components/admin-category-form.js`:

```jsx
import Link from "next/link";

const emptyValues = {
  name: "",
  slug: "",
};

export function AdminCategoryForm({
  action,
  title,
  description,
  submitLabel,
  initialValues = emptyValues,
  errorMessage = "",
}) {
  const values = { ...emptyValues, ...initialValues };

  return (
    <main className="admin-page">
      <section className="admin-page__hero">
        <p className="admin-page__eyebrow">Category CRUD</p>
        <h1>{title}</h1>
        <p className="admin-page__description">{description}</p>
        {errorMessage ? (
          <p className="admin-page__description" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </section>

      <form action={action} className="admin-form">
        <label className="admin-field">
          <span>Tên category</span>
          <input name="name" defaultValue={values.name} required />
        </label>

        <label className="admin-field">
          <span>Slug</span>
          <input name="slug" defaultValue={values.slug} required />
        </label>

        <div className="admin-form__actions">
          <button type="submit" className="button button--primary">
            {submitLabel}
          </button>
          <Link href="/admin/categories" className="button button--secondary">
            Hủy
          </Link>
        </div>
      </form>
    </main>
  );
}
```

Create `src/components/delete-category-button.js`:

```jsx
"use client";

export function DeleteCategoryButton({ action, categoryName }) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          `Xóa category "${categoryName}" khỏi hệ thống?`,
        );

        if (!confirmed) {
          event.preventDefault();
        }
      }}
    >
      <button type="submit" className="button button--danger">
        Xóa
      </button>
    </form>
  );
}
```

Create `src/app/admin/categories/actions.js`:

```js
"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/auth";
import { categoryCreateSchema, categoryUpdateSchema, readCategoryFormPayload } from "@/lib/category-api";
import { db } from "@/lib/db";

function buildCategoryFormUrl(pathname, errorMessage, values = {}) {
  const searchParams = new URLSearchParams({ error: errorMessage });

  if (values.name) {
    searchParams.set("name", values.name);
  }

  if (values.slug) {
    searchParams.set("slug", values.slug);
  }

  return `${pathname}?${searchParams.toString()}`;
}

function revalidateCategoryPaths() {
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath("/admin/categories");
}

export async function createCategoryAction(formData) {
  await requireAdminUser({ nextPath: "/admin/categories/new" });

  const rawValues = readCategoryFormPayload(formData);
  const parsedPayload = categoryCreateSchema.safeParse(rawValues);

  if (!parsedPayload.success) {
    redirect(
      buildCategoryFormUrl(
        "/admin/categories/new",
        parsedPayload.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.",
        rawValues,
      ),
    );
  }

  try {
    await db.category.create({
      data: parsedPayload.data,
    });
    revalidateCategoryPaths();
    redirect("/admin/categories");
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      redirect(
        buildCategoryFormUrl(
          "/admin/categories/new",
          "Slug đã tồn tại. Vui lòng chọn slug khác.",
          rawValues,
        ),
      );
    }

    console.error(error);
    redirect(
      buildCategoryFormUrl(
        "/admin/categories/new",
        "Không thể tạo category lúc này. Vui lòng thử lại.",
        rawValues,
      ),
    );
  }
}

export async function updateCategoryAction(categoryId, formData) {
  await requireAdminUser({ nextPath: `/admin/categories/${categoryId}/edit` });

  const rawValues = readCategoryFormPayload(formData);
  const parsedPayload = categoryUpdateSchema.safeParse(rawValues);

  if (!parsedPayload.success) {
    redirect(
      buildCategoryFormUrl(
        `/admin/categories/${categoryId}/edit`,
        parsedPayload.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.",
        rawValues,
      ),
    );
  }

  try {
    await db.category.update({
      where: { id: categoryId },
      data: parsedPayload.data,
    });
    revalidateCategoryPaths();
    redirect("/admin/categories");
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      redirect(
        buildCategoryFormUrl(
          `/admin/categories/${categoryId}/edit`,
          "Slug đã tồn tại. Vui lòng chọn slug khác.",
          rawValues,
        ),
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      redirect("/admin/categories?error=Category%20kh%C3%B4ng%20t%E1%BB%93n%20t%E1%BA%A1i.");
    }

    console.error(error);
    redirect(
      buildCategoryFormUrl(
        `/admin/categories/${categoryId}/edit`,
        "Không thể cập nhật category lúc này. Vui lòng thử lại.",
        rawValues,
      ),
    );
  }
}

export async function deleteCategoryAction(categoryId) {
  await requireAdminUser({ nextPath: "/admin/categories" });

  const category = await db.category.findUnique({
    where: { id: categoryId },
    select: {
      id: true,
      _count: {
        select: {
          products: true,
        },
      },
    },
  });

  if (!category) {
    redirect("/admin/categories?error=Category%20kh%C3%B4ng%20t%E1%BB%93n%20t%E1%BA%A1i.");
  }

  if (category._count.products > 0) {
    redirect(
      "/admin/categories?error=Kh%C3%B4ng%20th%E1%BB%83%20x%C3%B3a%20category%20%C4%91ang%20c%C3%B2n%20s%E1%BA%A3n%20ph%E1%BA%A9m.",
    );
  }

  await db.category.delete({
    where: { id: categoryId },
  });

  revalidateCategoryPaths();
  redirect("/admin/categories");
}
```

Create `src/app/admin/categories/page.js`:

```jsx
import Link from "next/link";
import { DeleteCategoryButton } from "@/components/delete-category-button";
import { getAdminCategories } from "@/lib/admin-categories";
import { deleteCategoryAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "MiniShop Admin | Categories",
  description: "Quản trị category cho MiniShop.",
};

export default async function AdminCategoriesPage({ searchParams }) {
  const [categories, params] = await Promise.all([
    getAdminCategories(),
    searchParams,
  ]);
  const errorMessage = typeof params?.error === "string" ? params.error : "";

  return (
    <main className="admin-page">
      <section className="admin-page__hero admin-page__hero--split">
        <div>
          <p className="admin-page__eyebrow">Category CRUD</p>
          <h1>Quản lý category</h1>
          <p className="admin-page__description">
            Tạo, sửa, xóa category và giữ an toàn relation với product.
          </p>
          {errorMessage ? (
            <p className="admin-page__description" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <Link href="/admin/categories/new" className="button button--primary">
          Tạo category
        </Link>
      </section>

      <section className="admin-category-list">
        {categories.map((category) => (
          <article key={category.id} className="admin-category-card">
            <div className="admin-category-card__copy">
              <p className="admin-page__eyebrow">/{category.slug}</p>
              <h2>{category.name}</h2>
              <p>{category._count.products} sản phẩm đang dùng category này</p>
            </div>

            <div className="admin-category-card__actions">
              <Link
                href={`/admin/categories/${category.id}/edit`}
                className="button button--secondary"
              >
                Sửa
              </Link>

              <DeleteCategoryButton
                action={deleteCategoryAction.bind(null, category.id)}
                categoryName={category.name}
              />
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
```

Create `src/app/admin/categories/new/page.js`:

```jsx
import { AdminCategoryForm } from "@/components/admin-category-form";
import { createCategoryAction } from "../actions";

export const metadata = {
  title: "MiniShop Admin | New Category",
  description: "Tạo category mới cho MiniShop.",
};

function readStringParam(params, key) {
  return typeof params?.[key] === "string" ? params[key] : "";
}

export default async function NewAdminCategoryPage({ searchParams }) {
  const params = await searchParams;

  return (
    <AdminCategoryForm
      action={createCategoryAction}
      title="Tạo category mới"
      description="Category mới sẽ xuất hiện ngay trong admin product form sau khi lưu."
      submitLabel="Lưu category"
      errorMessage={readStringParam(params, "error")}
      initialValues={{
        name: readStringParam(params, "name"),
        slug: readStringParam(params, "slug"),
      }}
    />
  );
}
```

Create `src/app/admin/categories/[id]/edit/page.js`:

```jsx
import { notFound } from "next/navigation";
import { AdminCategoryForm } from "@/components/admin-category-form";
import { getAdminCategoryById } from "@/lib/admin-categories";
import { toCategoryFormValues } from "@/lib/category-api";
import { updateCategoryAction } from "../../actions";

export const metadata = {
  title: "MiniShop Admin | Edit Category",
  description: "Chỉnh sửa category trong MiniShop admin.",
};

function readStringParam(params, key) {
  return typeof params?.[key] === "string" ? params[key] : "";
}

export default async function EditAdminCategoryPage({ params, searchParams }) {
  const { id } = await params;
  const [category, resolvedSearchParams] = await Promise.all([
    getAdminCategoryById(id),
    searchParams,
  ]);

  if (!category) {
    notFound();
  }

  const recoveredValues = {
    name: readStringParam(resolvedSearchParams, "name"),
    slug: readStringParam(resolvedSearchParams, "slug"),
  };
  const hasRecoveredValues = recoveredValues.name || recoveredValues.slug;

  return (
    <AdminCategoryForm
      action={updateCategoryAction.bind(null, category.id)}
      title={`Sửa: ${category.name}`}
      description="Giữ slug ổn định nếu category đã được dùng rộng trong catalog."
      submitLabel="Cập nhật category"
      errorMessage={readStringParam(resolvedSearchParams, "error")}
      initialValues={
        hasRecoveredValues ? recoveredValues : toCategoryFormValues(category)
      }
    />
  );
}
```

Update category imports in `src/app/admin/products/new/page.js` and `src/app/admin/products/[id]/edit/page.js`:

```js
import { getAdminCategories } from "@/lib/admin-categories";
```

- [ ] **Step 6: Re-run the category suites**

Run:
```bash
npm run test -- tests/lib/category-api.test.js tests/app/admin-category-actions.test.js
```

Expected:
- Category validation tests pass.
- Category actions cover create, update, duplicate slug handling, and relation-safe delete.

- [ ] **Step 7: Commit the category CRUD feature**

Run:
```bash
git add src/lib/admin-categories.js src/lib/category-api.js tests/lib/category-api.test.js src/components/admin-category-form.js src/components/delete-category-button.js src/app/admin/categories tests/app/admin-category-actions.test.js src/lib/admin-products.js src/app/admin/products/new/page.js 'src/app/admin/products/[id]/edit/page.js'
git commit -m "feat: add admin category management"
```

---

### Task 5: Polish admin navigation/docs/styles and verify the full buổi 11 slice

**Files:**
- Modify: `src/app/admin/layout.js`
- Modify: `src/app/admin/page.js`
- Modify: `src/app/globals.css`
- Modify: `README.md`

- [ ] **Step 1: Expose category management in the admin navigation and dashboard**

Update the `adminLinks` array in `src/app/admin/layout.js`:

```js
const adminLinks = [
  { href: "/admin", label: "Tổng quan" },
  { href: "/admin/products", label: "Sản phẩm" },
  { href: "/admin/categories", label: "Category" },
  { href: "/admin/products/new", label: "Tạo sản phẩm" },
  { href: "/admin/orders", label: "Đơn hàng" },
];
```

Update the sidebar copy in the same file:

```jsx
<p>
  Buổi 11 tập trung vào session auth thật, role lookup từ database, và
  category CRUD có bảo vệ relation.
</p>
```

Update `src/app/admin/page.js` to add the new shortcut:

```jsx
        <Link href="/admin/categories" className="admin-shortcut-card">
          <h2>Quản lý category</h2>
          <p>Tạo, sửa, xóa category và quan sát relation với product.</p>
        </Link>
```

- [ ] **Step 2: Add the missing login/category styles**

Append the relevant styles to `src/app/globals.css`:

```css
.login-form {
  display: grid;
  gap: 1rem;
}

.login-field {
  display: grid;
  gap: 0.5rem;
}

.login-field input {
  width: 100%;
  border: 1px solid rgba(15, 23, 42, 0.16);
  border-radius: 0.9rem;
  padding: 0.85rem 1rem;
  font: inherit;
}

.login-card__hint {
  display: grid;
  gap: 0.25rem;
  padding: 1rem 1.1rem;
  border-radius: 1rem;
  background: rgba(15, 23, 42, 0.04);
}

.admin-category-list {
  display: grid;
  gap: 1rem;
}

.admin-category-card {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 1.25rem;
  background: white;
}

.admin-category-card__copy,
.admin-category-card__actions {
  display: grid;
  gap: 0.75rem;
}

@media (max-width: 720px) {
  .admin-category-card {
    flex-direction: column;
  }
}
```

- [ ] **Step 3: Update the README for real auth credentials and buổi 11 behavior**

Replace the auth-related README sections with:

````md
## Environment variables

`.env.example`:

```env
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
AUTH_SECRET="replace-me-with-a-long-random-string"
```

- `AUTH_SECRET` là bắt buộc cho session auth.
- Ở local có thể dùng chuỗi dài bất kỳ.
- Ở production phải dùng secret ngẫu nhiên và không commit secret thật.

## Demo roles

Auth giờ dùng user + password hash + session lưu trong database.

- `ADMIN`
  - email: `admin@minishop.local`
  - password: `admin123`
- `CUSTOMER`
  - email: `customer@minishop.local`
  - password: `customer123`

`CUSTOMER` vẫn không vào được `/admin`, dù có tự sửa URL.

## Admin surfaces

- `/admin/products`
- `/admin/categories`
- `/admin/orders`

Category không thể bị xóa nếu vẫn còn product đang tham chiếu tới nó.
````

- [ ] **Step 4: Run the full buổi 11 automated verification**

Run:
```bash
npm run test -- tests/lib/passwords.test.js tests/lib/auth.test.js tests/app/login-actions.test.js tests/app/api-routes.test.js tests/lib/category-api.test.js tests/app/admin-category-actions.test.js
npm run lint
npm run build
```

Expected:
- All targeted unit/integration tests pass.
- ESLint passes without new warnings/errors.
- Next.js production build succeeds.

- [ ] **Step 5: Run the manual buổi 11 verification checklist**

Run:
```bash
npm run db:migrate
npm run db:seed
npm run dev
```

Verify manually:

- Open `/login` and sign in with `admin@minishop.local / admin123`.
- Open `/admin` and confirm the session persists after navigation.
- Open `/admin/categories`, create one new category, edit it, then delete an empty one.
- Try deleting `running`, `lifestyle`, or `outdoor` while products still reference them and confirm the UI shows the relation-safety error.
- Log out and confirm `/admin` redirects to `/login?next=%2Fadmin`.
- Sign in with `customer@minishop.local / customer123` and confirm `/admin` still redirects away.
- Call `POST /api/products` without an admin session and confirm it returns `401`.
- Call the same route with an admin session and confirm it still works.

- [ ] **Step 6: Commit the polish and docs**

Run:
```bash
git add src/app/admin/layout.js src/app/admin/page.js src/app/globals.css README.md
git commit -m "docs: finalize buoi 11 real auth and categories"
```

---

## Spec Coverage Check

- Real auth instead of role stub: covered by Task 1 and Task 2.
- Session-based user lookup: covered by Task 2.
- Password hashing: covered by Task 1.
- Protect page, server action, API: pages/actions via `requireAdminUser()` in Task 2, mutation APIs via Task 3.
- Admin category CRUD: covered by Task 4.
- Relation-safe delete: covered by Task 4 and manual verification in Task 5.
- Optional register/audit fields: intentionally deferred to keep buổi 11 scope tight.

## Placeholder Scan

- No `TODO`, `TBD`, or “similar to previous task” placeholders remain.
- Each task lists concrete file paths, concrete commands, and concrete code.
- All identifiers stay consistent: `SESSION_COOKIE_NAME`, `AUTH_SECRET`, `ROLE_ADMIN`, `ROLE_CUSTOMER`, `createCategoryAction`, `updateCategoryAction`, `deleteCategoryAction`.

## Type Consistency Check

- Roles stay string-based as `ADMIN` and `CUSTOMER` across schema, seed, helpers, and tests.
- Auth cookie name is always `minishop-session`.
- Category payloads always use `{ name, slug }`.
- Session persistence always stores a raw token in the cookie and `tokenHash` in the database.

**Plan complete and saved to `docs/superpowers/plans/2026-05-23-minishop-buoi-11.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
