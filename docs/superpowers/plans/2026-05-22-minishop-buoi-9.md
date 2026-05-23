# MiniShop Buổi 9 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first auth layer to MiniShop so `/admin` is protected on the server, learners can switch between demo roles from `/login`, and admins can manage orders from `/admin/orders` plus `/admin/orders/[id]`.

**Architecture:** Use a cookie-based auth stub instead of a real provider so buổi 9 stays focused on authentication, authorization, and server-side guards. Centralize role parsing and redirect sanitizing in `src/lib/auth.js`, protect the whole admin tree from `src/app/admin/layout.js`, then add a small admin-order layer (`src/lib/admin-orders.js`, `src/lib/admin-order-status.js`, `src/app/admin/orders/actions.js`) so order reads and status mutations stay separate from the buổi 8 checkout API.

**Tech Stack:** Next.js 16 App Router, React 19, JavaScript, Prisma ORM, SQLite, Zod, Vitest, Server Actions, `cookies`, `redirect`, `revalidatePath`, global CSS.

---

## Current Codebase Notes

- `src/app/admin/layout.js` and `src/app/admin/page.js` already exist from buổi 7, but nothing checks auth yet, so every visitor can open admin routes directly.
- `src/components/site-header.js` always renders an `Admin` link, which is useful for discoverability now but conflicts with buổi 9's “hide UI is not security” lesson unless the header reads session state.
- `prisma/schema.prisma` already has `User` and `Order`, but the current app does not create sessions, passwords, or provider config, so buổi 9 should stay with a deliberate auth stub.
- `src/app/api/orders/route.js` and `src/lib/order-api.js` already create pending orders and enforce stock rules, but there is no admin UI to list orders or change status.
- `prisma/seed.mjs` clears all orders and users on every seed, so manual smoke tests for buổi 9 must create at least one order through `/checkout` after reseeding.
- `src/app/globals.css` already contains admin shell, button, form, and card styles; extend those utilities instead of introducing a second styling system.

## File Map

- Create: `src/lib/auth.js`
- Create: `tests/lib/auth.test.js`
- Create: `src/app/login/actions.js`
- Create: `tests/app/login-actions.test.js`
- Create: `src/app/login/page.js`
- Create: `src/lib/admin-order-status.js`
- Create: `tests/lib/admin-order-status.test.js`
- Create: `src/lib/admin-orders.js`
- Create: `src/app/admin/orders/actions.js`
- Create: `tests/app/admin-order-actions.test.js`
- Create: `src/app/admin/orders/page.js`
- Create: `src/app/admin/orders/[id]/page.js`
- Create: `src/components/admin-order-status-form.js`
- Modify: `src/app/admin/layout.js`
- Modify: `src/app/admin/page.js`
- Modify: `src/components/site-header.js`
- Modify: `src/app/globals.css`

## Verification Strategy

- Use `npm run test -- tests/lib/auth.test.js` for pure auth/session helpers.
- Use `npm run test -- tests/app/login-actions.test.js` for cookie-setting login/logout actions.
- Use `npm run test -- tests/lib/admin-order-status.test.js` for order-status parsing and label helpers.
- Use `npm run test -- tests/app/admin-order-actions.test.js` for admin status mutation redirects, revalidation, and Prisma error mapping.
- Re-run `npm run test -- tests/lib/order-api.test.js tests/app/order-route.test.js` so buổi 8 checkout behavior stays stable.
- Run `npm run lint` and `npm run build` to catch App Router route/action signatures, server/client boundary mistakes, and async `cookies()` usage.
- Run `npm run db:seed`, then `npm run dev`, create one checkout order through `/checkout`, and smoke test `/login`, `/admin`, `/admin/orders`, `/admin/orders/<id>`, and logout/login role switching.

---

### Task 1: Add reusable auth/session helpers first

**Files:**
- Create: `src/lib/auth.js`
- Create: `tests/lib/auth.test.js`

- [ ] **Step 1: Write the failing auth helper tests**

Create `tests/lib/auth.test.js` with this suite:

```js
import { describe, expect, it } from "vitest";
import {
  AUTH_COOKIE_NAME,
  ROLE_ADMIN,
  ROLE_CUSTOMER,
  getCurrentUser,
  normalizeRole,
  sanitizeNextPath,
} from "../../src/lib/auth.js";

function createCookieStore(value) {
  return {
    get(name) {
      if (name !== AUTH_COOKIE_NAME || value === undefined) {
        return undefined;
      }

      return { value };
    },
  };
}

describe("auth helpers", () => {
  it("normalizes supported roles and rejects unknown values", () => {
    expect(normalizeRole("admin")).toBe(ROLE_ADMIN);
    expect(normalizeRole(" CUSTOMER ")).toBe(ROLE_CUSTOMER);
    expect(normalizeRole("manager")).toBe(null);
    expect(normalizeRole("")).toBe(null);
  });

  it("returns null when the auth cookie is missing or invalid", async () => {
    await expect(getCurrentUser(createCookieStore())).resolves.toBe(null);
    await expect(getCurrentUser(createCookieStore("manager"))).resolves.toBe(
      null,
    );
  });

  it("returns a stub user for the supported demo roles", async () => {
    await expect(getCurrentUser(createCookieStore("ADMIN"))).resolves.toEqual({
      id: "stub-admin",
      name: "MiniShop Admin",
      email: "admin@minishop.local",
      role: ROLE_ADMIN,
    });

    await expect(getCurrentUser(createCookieStore("customer"))).resolves.toEqual({
      id: "stub-customer",
      name: "MiniShop Customer",
      email: "customer@minishop.local",
      role: ROLE_CUSTOMER,
    });
  });

  it("keeps redirect targets on internal paths only", () => {
    expect(sanitizeNextPath("/admin/orders")).toBe("/admin/orders");
    expect(sanitizeNextPath("https://evil.example")).toBe("/admin");
    expect(sanitizeNextPath("orders")).toBe("/admin");
  });
});
```

- [ ] **Step 2: Run the new auth test file to verify the module does not exist yet**

Run:
```bash
npm run test -- tests/lib/auth.test.js
```

Expected:
- Vitest fails with a module-not-found error for `src/lib/auth.js`.

- [ ] **Step 3: Implement the shared auth stub module**

Create `src/lib/auth.js` with this code:

```js
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const AUTH_COOKIE_NAME = "minishop-role";
export const ROLE_ADMIN = "ADMIN";
export const ROLE_CUSTOMER = "CUSTOMER";

const roleUsers = Object.freeze({
  [ROLE_ADMIN]: {
    id: "stub-admin",
    name: "MiniShop Admin",
    email: "admin@minishop.local",
    role: ROLE_ADMIN,
  },
  [ROLE_CUSTOMER]: {
    id: "stub-customer",
    name: "MiniShop Customer",
    email: "customer@minishop.local",
    role: ROLE_CUSTOMER,
  },
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

  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
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

  return roleUsers[role];
}

export async function requireAdminUser(options = {}) {
  const { nextPath = "/admin", cookieStore = null } = options;
  const user = await getCurrentUser(cookieStore);

  if (!user || user.role !== ROLE_ADMIN) {
    redirect(`/login?next=${encodeURIComponent(sanitizeNextPath(nextPath))}`);
  }

  return user;
}
```

- [ ] **Step 4: Run the auth helper tests to verify the contract passes**

Run:
```bash
npm run test -- tests/lib/auth.test.js
```

Expected:
- Vitest reports `4 passed` for `tests/lib/auth.test.js`.

- [ ] **Step 5: Add hardening tests for the admin guard and user-object isolation**

Extend `tests/lib/auth.test.js` with these extra cases:

```js
import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((location) => {
    throw new Error(`REDIRECT:${location}`);
  }),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));
```

Add these tests inside the same `describe("auth helpers", ...)` block:

```js
  beforeEach(() => {
    redirectMock.mockClear();
  });

  it("returns isolated user objects for each lookup", async () => {
    const firstUser = await getCurrentUser(createCookieStore("ADMIN"));
    firstUser.name = "Mutated";

    await expect(getCurrentUser(createCookieStore("ADMIN"))).resolves.toEqual({
      id: "stub-admin",
      name: "MiniShop Admin",
      email: "admin@minishop.local",
      role: ROLE_ADMIN,
    });
  });

  it("returns the admin user from requireAdminUser", async () => {
    await expect(
      requireAdminUser({
        cookieStore: createCookieStore("admin"),
      }),
    ).resolves.toEqual({
      id: "stub-admin",
      name: "MiniShop Admin",
      email: "admin@minishop.local",
      role: ROLE_ADMIN,
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("redirects anonymous users to login with the next path", async () => {
    await expect(
      requireAdminUser({
        cookieStore: createCookieStore(),
        nextPath: "/admin/orders",
      }),
    ).rejects.toThrow("REDIRECT:/login?next=%2Fadmin%2Forders");
  });

  it("redirects customer users to login with the next path", async () => {
    await expect(
      requireAdminUser({
        cookieStore: createCookieStore("customer"),
        nextPath: "/admin/orders",
      }),
    ).rejects.toThrow("REDIRECT:/login?next=%2Fadmin%2Forders");
  });

  it("sanitizes unsafe redirect targets before redirecting", async () => {
    await expect(
      requireAdminUser({
        cookieStore: createCookieStore(),
        nextPath: "https://evil.example",
      }),
    ).rejects.toThrow("REDIRECT:/login?next=%2Fadmin");
  });

  it("rejects backslash-based redirect bypasses", async () => {
    expect(sanitizeNextPath("/\\\\evil.example")).toBe("/admin");
  });
```

- [ ] **Step 6: Run the expanded auth test file to verify the hardening cases fail first**

Run:
```bash
npm run test -- tests/lib/auth.test.js
```

Expected:
- The new `requireAdminUser()` and isolation cases fail because the baseline implementation still returns shared user objects and has no direct redirect-path coverage yet.

- [ ] **Step 7: Harden the auth helper module without changing the public API**

Update `src/lib/auth.js` to this:

```js
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
```

- [ ] **Step 8: Re-run the expanded auth tests and confirm the full helper contract passes**

Run:
```bash
npm run test -- tests/lib/auth.test.js
```

Expected:
- Vitest reports `9 passed` for `tests/lib/auth.test.js`.

- [ ] **Step 9: Commit the auth helper baseline + hardening pass**

Run:
```bash
git add src/lib/auth.js tests/lib/auth.test.js
git commit -m "feat: add auth stub helpers"
```

---

### Task 2: Add login/logout server actions with test coverage

**Files:**
- Create: `src/app/login/actions.js`
- Create: `tests/app/login-actions.test.js`

- [ ] **Step 1: Write failing tests for the login/logout actions**

Create `tests/app/login-actions.test.js` with this suite:

```js
import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookieStore, cookies, redirect } = vi.hoisted(() => ({
  cookieStore: {
    set: vi.fn(),
    delete: vi.fn(),
  },
  cookies: vi.fn(async () => cookieStore),
  redirect: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies,
}));

vi.mock("next/navigation", () => ({
  redirect,
}));

import {
  loginAsAdminAction,
  loginAsCustomerAction,
  logoutAction,
} from "@/app/login/actions";
import {
  AUTH_COOKIE_NAME,
  ROLE_ADMIN,
  ROLE_CUSTOMER,
} from "@/lib/auth";

function createFormData(nextPath) {
  const formData = new FormData();

  if (nextPath !== undefined) {
    formData.set("next", nextPath);
  }

  return formData;
}

describe("login actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores the admin role cookie and redirects to the requested admin path", async () => {
    await loginAsAdminAction(createFormData("/admin/orders"));

    expect(cookieStore.set).toHaveBeenCalledWith(
      AUTH_COOKIE_NAME,
      ROLE_ADMIN,
      expect.objectContaining({
        httpOnly: true,
        path: "/",
        sameSite: "lax",
      }),
    );
    expect(redirect).toHaveBeenCalledWith("/admin/orders");
  });

  it("stores the customer role cookie and falls back to /admin for unsafe redirects", async () => {
    await loginAsCustomerAction(createFormData("https://evil.example"));

    expect(cookieStore.set).toHaveBeenCalledWith(
      AUTH_COOKIE_NAME,
      ROLE_CUSTOMER,
      expect.objectContaining({
        httpOnly: true,
        path: "/",
        sameSite: "lax",
      }),
    );
    expect(redirect).toHaveBeenCalledWith("/admin");
  });

  it("deletes the auth cookie and redirects home on logout", async () => {
    await logoutAction(createFormData("/"));

    expect(cookieStore.delete).toHaveBeenCalledWith(AUTH_COOKIE_NAME);
    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("falls back to / on logout when next is unsafe", async () => {
    await logoutAction(createFormData("https://evil.example"));

    expect(cookieStore.delete).toHaveBeenCalledWith(AUTH_COOKIE_NAME);
    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("keeps /admin on logout when next is already safe", async () => {
    await logoutAction(createFormData("/admin"));

    expect(cookieStore.delete).toHaveBeenCalledWith(AUTH_COOKIE_NAME);
    expect(redirect).toHaveBeenCalledWith("/admin");
  });
});
```

- [ ] **Step 2: Run the login action test file to confirm it fails first**

Run:
```bash
npm run test -- tests/app/login-actions.test.js
```

Expected:
- Vitest fails because `src/app/login/actions.js` does not exist yet.

- [ ] **Step 3: Implement the login/logout server actions**

Create `src/app/login/actions.js` with this code:

```js
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
```

- [ ] **Step 4: Run the login action tests to verify cookie + redirect behavior**

Run:
```bash
npm run test -- tests/app/login-actions.test.js
```

Expected:
- Vitest reports `5 passed` for `tests/app/login-actions.test.js`.

- [ ] **Step 5: Commit the action layer before wiring UI**

Run:
```bash
git add src/app/login/actions.js tests/app/login-actions.test.js
git commit -m "feat: add demo login actions"
```

---

### Task 3: Protect the admin shell and add the login page

**Files:**
- Create: `src/app/login/page.js`
- Modify: `src/app/admin/layout.js`
- Modify: `src/app/admin/page.js`
- Modify: `src/components/site-header.js`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Wire the login page around the new auth actions**

Create `src/app/login/page.js` with this code:

```js
import Link from "next/link";
import {
  loginAsAdminAction,
  loginAsCustomerAction,
} from "@/app/login/actions";
import { getCurrentUser, sanitizeNextPath } from "@/lib/auth";

export const metadata = {
  title: "MiniShop | Login",
  description: "Demo login page for MiniShop admin access control.",
};

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const currentUser = await getCurrentUser();
  const nextPath = sanitizeNextPath(
    typeof params?.next === "string" ? params.next : "/admin",
  );

  return (
    <main className="login-page site-shell">
      <section className="login-card">
        <p className="login-card__eyebrow">Demo auth stub</p>
        <h1>Đăng nhập để thử quyền truy cập</h1>
        <p className="login-card__description">
          Buổi 9 chưa dùng provider thật. Chọn một role để học authentication,
          authorization, và server-side guard.
        </p>

        {currentUser ? (
          <p className="login-card__session" role="status">
            Phiên hiện tại: <strong>{currentUser.name}</strong> ({currentUser.role})
          </p>
        ) : null}

        <div className="login-card__actions">
          <form action={loginAsAdminAction}>
            <input type="hidden" name="next" value={nextPath} />
            <button type="submit" className="button button--primary">
              Vào bằng Admin
            </button>
          </form>

          <form action={loginAsCustomerAction}>
            <input type="hidden" name="next" value={nextPath} />
            <button type="submit" className="button button--secondary">
              Vào bằng Customer
            </button>
          </form>
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

- [ ] **Step 2: Protect the entire admin tree from the layout**

Update `src/app/admin/layout.js` to this:

```js
import Link from "next/link";
import { logoutAction } from "@/app/login/actions";
import { requireAdminUser } from "@/lib/auth";

const adminLinks = [
  { href: "/admin", label: "Tổng quan" },
  { href: "/admin/products", label: "Sản phẩm" },
  { href: "/admin/products/new", label: "Tạo sản phẩm" },
  { href: "/admin/orders", label: "Đơn hàng" },
];

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }) {
  const user = await requireAdminUser({ nextPath: "/admin" });

  return (
    <div className="admin-layout">
      <aside className="admin-layout__sidebar">
        <div className="admin-layout__brand">
          <p className="admin-layout__eyebrow">MiniShop Admin</p>
          <h2>Quản trị dữ liệu có phân quyền</h2>
          <p>
            Buổi 9 tập trung vào auth stub, route guard phía server, và quản lý
            đơn hàng.
          </p>
        </div>

        <div className="admin-layout__session">
          <p>Đang đăng nhập: {user.name}</p>
          <p>Role: {user.role}</p>

          <form action={logoutAction}>
            <input type="hidden" name="next" value="/" />
            <button type="submit" className="button button--secondary">
              Đăng xuất
            </button>
          </form>
        </div>

        <nav className="admin-layout__nav" aria-label="Admin">
          {adminLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="admin-layout__content">{children}</div>
    </div>
  );
}
```

- [ ] **Step 3: Update the header and dashboard so auth state is visible**

Update `src/components/site-header.js` to this:

```js
import Link from "next/link";
import { logoutAction } from "@/app/login/actions";
import { CartStatusLink } from "@/components/cart-status-link";
import { getCurrentUser } from "@/lib/auth";

export async function SiteHeader() {
  const currentUser = await getCurrentUser();

  return (
    <header className="site-header">
      <div className="site-shell site-header__inner">
        <Link href="/" className="site-brand">
          MiniShop
        </Link>

        <nav className="site-nav" aria-label="Primary">
          <Link href="/products">Tất cả sản phẩm</Link>
          {currentUser?.role === "ADMIN" ? <Link href="/admin">Admin</Link> : null}
          <CartStatusLink />
          <Link href="/#featured">Sản phẩm nổi bật</Link>
          <Link href="/#story">Câu chuyện</Link>
          <Link href="/#contact">Liên hệ</Link>
          {currentUser ? (
            <form action={logoutAction}>
              <input type="hidden" name="next" value="/" />
              <button type="submit" className="site-nav__button">
                Đăng xuất
              </button>
            </form>
          ) : (
            <Link href="/login?next=/admin">Đăng nhập</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
```

Update `src/app/admin/page.js` to this:

```js
import Link from "next/link";

export default function AdminHomePage() {
  return (
    <main className="admin-page">
      <section className="admin-page__hero">
        <p className="admin-page__eyebrow">Admin dashboard</p>
        <h1>Quản lý MiniShop bằng route guard phía server</h1>
        <p className="admin-page__description">
          Khu vực này giờ chỉ mở cho ADMIN và đã có thêm luồng xem, kiểm tra,
          cập nhật trạng thái đơn hàng.
        </p>
      </section>

      <section className="admin-shortcuts">
        <Link href="/admin/products" className="admin-shortcut-card">
          <h2>Danh sách sản phẩm</h2>
          <p>Xem catalog, trạng thái active, category, và tồn kho.</p>
        </Link>

        <Link href="/admin/products/new" className="admin-shortcut-card">
          <h2>Tạo sản phẩm mới</h2>
          <p>Submit form trực tiếp vào Server Action rồi quay lại trang list.</p>
        </Link>

        <Link href="/admin/orders" className="admin-shortcut-card">
          <h2>Quản lý đơn hàng</h2>
          <p>Kiểm tra khách mua gì, tổng tiền bao nhiêu, và đổi status.</p>
        </Link>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Extend global styles for login/session UI**

Append these rules to `src/app/globals.css` near the existing admin styles:

```css
.site-nav__button {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
}

.site-nav__button:hover {
  color: var(--accent);
}

.admin-layout__session {
  display: grid;
  gap: 10px;
  margin-top: 20px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: rgba(194, 65, 12, 0.06);
}

.admin-layout__session p {
  margin: 0;
  color: var(--muted);
}

.login-page {
  display: grid;
  min-height: calc(100vh - 72px);
  align-items: center;
  padding: 48px 0 72px;
}

.login-card {
  width: min(560px, 100%);
  margin: 0 auto;
  display: grid;
  gap: 18px;
  padding: 32px;
  border: 1px solid var(--border);
  border-radius: 28px;
  background: var(--surface-strong);
  box-shadow: var(--shadow);
}

.login-card__eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.78rem;
  color: var(--accent);
}

.login-card h1 {
  margin: 0;
  font-family: var(--font-space-grotesk), Arial, sans-serif;
  letter-spacing: -0.04em;
}

.login-card__description,
.login-card__session {
  margin: 0;
  color: var(--muted);
  line-height: 1.6;
}

.login-card__actions,
.login-card__links {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
```

- [ ] **Step 5: Run targeted tests, then commit the protected shell**

Run:
```bash
npm run test -- tests/lib/auth.test.js tests/app/login-actions.test.js
git add src/app/login/page.js src/app/admin/layout.js src/app/admin/page.js src/components/site-header.js src/app/globals.css
git commit -m "feat: protect admin routes with demo login"
```

Expected:
- Both auth-related test files pass.
- The commit only contains buổi 9 auth-shell changes.

Implementation note:
- During task-by-task execution, the `/admin/orders` sidebar/dashboard links are a forward reference to Task 5. A temporary 404 before Task 5 lands is expected and should not be treated as a Task 3 regression in isolation.
- The admin layout guard intentionally uses `requireAdminUser({ nextPath: "/admin" })`. Per the Next.js App Router docs, layouts do not access the current pathname server-side, so exact deep-link resume for child admin routes would require extra client-pathname or middleware plumbing and is out of scope for this course demo.

---

### Task 4: Add order-status helpers and the admin mutation action

**Files:**
- Create: `src/lib/admin-order-status.js`
- Create: `tests/lib/admin-order-status.test.js`
- Create: `src/app/admin/orders/actions.js`
- Create: `tests/app/admin-order-actions.test.js`

- [ ] **Step 1: Write failing tests for order-status parsing and admin mutations**

Create `tests/lib/admin-order-status.test.js` with this suite:

```js
import { describe, expect, it } from "vitest";
import {
  getOrderStatusLabel,
  orderStatusOptions,
  readOrderStatusFormPayload,
  updateOrderStatusSchema,
} from "../../src/lib/admin-order-status.js";

describe("admin order status helpers", () => {
  it("normalizes status values from FormData", () => {
    const formData = new FormData();
    formData.set("status", " shipping ");

    expect(readOrderStatusFormPayload(formData)).toEqual({
      status: "SHIPPING",
    });
  });

  it("accepts only supported order statuses", () => {
    expect(updateOrderStatusSchema.parse({ status: "DELIVERED" })).toEqual({
      status: "DELIVERED",
    });

    expect(() =>
      updateOrderStatusSchema.parse({ status: "RETURNED" }),
    ).toThrow();
  });

  it("returns a human label for each visible status", () => {
    expect(orderStatusOptions.map((option) => option.value)).toEqual([
      "PENDING",
      "SHIPPING",
      "DELIVERED",
      "CANCELLED",
    ]);
    expect(getOrderStatusLabel("PENDING")).toBe("Chờ xử lý");
    expect(getOrderStatusLabel("SHIPPING")).toBe("Đang giao");
  });
});
```

Create `tests/app/admin-order-actions.test.js` with this suite:

```js
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, revalidatePath, redirect, requireAdminUser } = vi.hoisted(() => ({
  db: {
    order: {
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

import { updateOrderStatusAction } from "@/app/admin/orders/actions";

function createKnownRequestError(code, message = "Prisma request failed.") {
  return new Prisma.PrismaClientKnownRequestError(message, {
    code,
    clientVersion: "test",
  });
}

function createFormData(status) {
  const formData = new FormData();
  formData.set("status", status);
  return formData;
}

function readRedirectLocation() {
  return redirect.mock.calls.at(-1)?.[0] ?? null;
}

function expectRedirectTo(location, pathname, searchParams) {
  const url = new URL(location, "http://localhost");

  expect(url.pathname).toBe(pathname);

  for (const [key, value] of Object.entries(searchParams)) {
    expect(url.searchParams.get(key)).toBe(value);
  }
}

describe("admin order actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminUser.mockResolvedValue({
      id: "stub-admin",
      role: "ADMIN",
    });
  });

  it("redirects back with an error when status input is invalid", async () => {
    await expect(
      updateOrderStatusAction("ord_1", createFormData("returned")),
    ).rejects.toThrow("REDIRECT:");

    expect(db.order.update).not.toHaveBeenCalled();
    expectRedirectTo(
      readRedirectLocation(),
      "/admin/orders/ord_1",
      {
        error:
          'Invalid option: expected one of "PENDING"|"SHIPPING"|"DELIVERED"|"CANCELLED"',
      },
    );
  });

  it("updates the order, revalidates admin paths, then redirects with success", async () => {
    db.order.update.mockResolvedValue({ id: "ord_1" });

    await expect(
      updateOrderStatusAction("ord_1", createFormData("shipping")),
    ).rejects.toThrow("REDIRECT:");

    expect(db.order.update).toHaveBeenCalledWith({
      where: { id: "ord_1" },
      data: { status: "SHIPPING" },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/orders");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/orders/ord_1");
    expectRedirectTo(
      readRedirectLocation(),
      "/admin/orders/ord_1",
      {
        success: "Đã cập nhật trạng thái đơn hàng.",
      },
    );
  });

  it("redirects back with a not-found message when Prisma returns P2025", async () => {
    db.order.update.mockRejectedValue(createKnownRequestError("P2025"));

    await expect(
      updateOrderStatusAction("missing-order", createFormData("PENDING")),
    ).rejects.toThrow("REDIRECT:");

    expectRedirectTo(
      readRedirectLocation(),
      "/admin/orders/missing-order",
      {
        error: "Đơn hàng không tồn tại.",
      },
    );
  });
});
```

- [ ] **Step 2: Run the new order admin tests to verify they fail first**

Run:
```bash
npm run test -- tests/lib/admin-order-status.test.js tests/app/admin-order-actions.test.js
```

Expected:
- Vitest fails because `src/lib/admin-order-status.js` and `src/app/admin/orders/actions.js` do not exist yet.

- [ ] **Step 3: Implement the order-status helper module**

Create `src/lib/admin-order-status.js` with this code:

```js
import { z } from "zod";

export const orderStatusOptions = Object.freeze([
  { value: "PENDING", label: "Chờ xử lý" },
  { value: "SHIPPING", label: "Đang giao" },
  { value: "DELIVERED", label: "Đã giao" },
  { value: "CANCELLED", label: "Đã hủy" },
]);

const allowedStatuses = orderStatusOptions.map((option) => option.value);

export const updateOrderStatusSchema = z
  .object({
    status: z.enum(allowedStatuses),
  })
  .strict();

export function readOrderStatusFormPayload(formData) {
  const value = formData.get("status");

  return {
    status: typeof value === "string" ? value.trim().toUpperCase() : "",
  };
}

export function getOrderStatusLabel(status) {
  return (
    orderStatusOptions.find((option) => option.value === status)?.label ??
    status
  );
}
```

- [ ] **Step 4: Implement the admin order status action**

Create `src/app/admin/orders/actions.js` with this code:

```js
"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  readOrderStatusFormPayload,
  updateOrderStatusSchema,
} from "@/lib/admin-order-status";

function buildOrderDetailUrl(orderId, messageKey, message) {
  const params = new URLSearchParams({ [messageKey]: message });

  return `/admin/orders/${orderId}?${params.toString()}`;
}

export async function updateOrderStatusAction(orderId, formData) {
  await requireAdminUser({ nextPath: `/admin/orders/${orderId}` });

  const parsedPayload = updateOrderStatusSchema.safeParse(
    readOrderStatusFormPayload(formData),
  );

  if (!parsedPayload.success) {
    return redirect(
      buildOrderDetailUrl(
        orderId,
        "error",
        parsedPayload.error.issues[0]?.message ?? "Trạng thái không hợp lệ.",
      ),
    );
  }

  try {
    await db.order.update({
      where: { id: orderId },
      data: { status: parsedPayload.data.status },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return redirect(
        buildOrderDetailUrl(orderId, "error", "Đơn hàng không tồn tại."),
      );
    }

    console.error(error);
    return redirect(
      buildOrderDetailUrl(
        orderId,
        "error",
        "Không thể cập nhật trạng thái lúc này.",
      ),
    );
  }

  return redirect(
    buildOrderDetailUrl(
      orderId,
      "success",
      "Đã cập nhật trạng thái đơn hàng.",
    ),
  );
}
```

- [ ] **Step 5: Run the new order-admin tests and commit the mutation layer**

Run:
```bash
npm run test -- tests/lib/admin-order-status.test.js tests/app/admin-order-actions.test.js
git add src/lib/admin-order-status.js tests/lib/admin-order-status.test.js src/app/admin/orders/actions.js tests/app/admin-order-actions.test.js
git commit -m "feat: add admin order status actions"
```

Expected:
- Both new test files pass.
- The commit contains only order-status helper + admin action changes.

---

### Task 5: Build admin order pages and finish buổi 9 verification

**Files:**
- Create: `src/lib/admin-orders.js`
- Create: `src/app/admin/orders/page.js`
- Create: `src/app/admin/orders/[id]/page.js`
- Create: `src/components/admin-order-status-form.js`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add the admin order read layer**

Create `src/lib/admin-orders.js` with this code:

```js
import { db } from "@/lib/db";

export const adminOrderDetailInclude = Object.freeze({
  items: {
    include: {
      product: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
    },
  },
});

export async function getAdminOrders() {
  return db.order.findMany({
    select: {
      id: true,
      customerName: true,
      customerEmail: true,
      status: true,
      total: true,
      _count: {
        select: {
          items: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function getAdminOrderById(id) {
  if (!id) {
    return null;
  }

  return db.order.findUnique({
    where: { id },
    include: adminOrderDetailInclude,
  });
}
```

- [ ] **Step 2: Add the shared status form component**

Create `src/components/admin-order-status-form.js` with this code:

```js
import { orderStatusOptions } from "@/lib/admin-order-status";

export function AdminOrderStatusForm({ action, defaultStatus }) {
  return (
    <form action={action} className="admin-order-status-form">
      <label className="admin-field">
        <span>Trạng thái</span>
        <select name="status" defaultValue={defaultStatus}>
          {orderStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <button type="submit" className="button button--primary">
        Cập nhật trạng thái
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Build the order list page**

Create `src/app/admin/orders/page.js` with this code:

```js
import Link from "next/link";
import { formatVnd } from "@/lib/format-vnd";
import { getOrderStatusLabel } from "@/lib/admin-order-status";
import { getAdminOrders } from "@/lib/admin-orders";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "MiniShop Admin | Orders",
  description: "Quản trị đơn hàng cho MiniShop.",
};

export default async function AdminOrdersPage() {
  const orders = await getAdminOrders();

  return (
    <main className="admin-page">
      <section className="admin-page__hero">
        <p className="admin-page__eyebrow">Orders</p>
        <h1>Quản lý đơn hàng</h1>
        <p className="admin-page__description">
          Theo dõi ai đã mua gì, tổng tiền bao nhiêu, và chuyển trạng thái đơn.
        </p>
      </section>

      <section className="admin-order-list">
        {orders.length === 0 ? (
          <article className="admin-order-card">
            <h2>Chưa có đơn hàng nào</h2>
            <p>
              Hãy tạo một đơn qua `/checkout`, sau đó quay lại trang này để học
              luồng order admin.
            </p>
          </article>
        ) : (
          orders.map((order) => (
            <article key={order.id} className="admin-order-card">
              <div className="admin-order-card__copy">
                <p className="admin-page__eyebrow">{getOrderStatusLabel(order.status)}</p>
                <h2>{order.customerName}</h2>
                <p>{order.customerEmail}</p>
              </div>

              <dl className="admin-order-card__stats">
                <div>
                  <dt>Tổng tiền</dt>
                  <dd>{formatVnd(order.total)}</dd>
                </div>
                <div>
                  <dt>Số dòng hàng</dt>
                  <dd>{order._count.items}</dd>
                </div>
                <div>
                  <dt>Mã đơn</dt>
                  <dd>{order.id}</dd>
                </div>
              </dl>

              <div className="admin-order-card__actions">
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="button button--secondary"
                >
                  Xem chi tiết
                </Link>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Build the order detail page and final CSS**

Create `src/app/admin/orders/[id]/page.js` with this code:

```js
import { notFound } from "next/navigation";
import { AdminOrderStatusForm } from "@/components/admin-order-status-form";
import { formatVnd } from "@/lib/format-vnd";
import { getOrderStatusLabel } from "@/lib/admin-order-status";
import { getAdminOrderById } from "@/lib/admin-orders";
import { updateOrderStatusAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const orderId =
    typeof resolvedParams?.id === "string" ? resolvedParams.id.trim() : "";
  const order = await getAdminOrderById(orderId);

  if (!order) {
    notFound();
  }

  const successMessage =
    typeof resolvedSearchParams?.success === "string"
      ? resolvedSearchParams.success
      : "";
  const errorMessage =
    typeof resolvedSearchParams?.error === "string"
      ? resolvedSearchParams.error
      : "";

  return (
    <main className="admin-page">
      <section className="admin-page__hero">
        <p className="admin-page__eyebrow">Order detail</p>
        <h1>Đơn hàng {order.id}</h1>
        <p className="admin-page__description">
          Trạng thái hiện tại: {getOrderStatusLabel(order.status)}.
        </p>
        {successMessage ? (
          <p className="admin-order-banner admin-order-banner--success" role="status">
            {successMessage}
          </p>
        ) : null}
        {errorMessage ? (
          <p className="admin-order-banner admin-order-banner--error" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </section>

      <section className="admin-order-detail">
        <article className="admin-order-panel">
          <h2>Thông tin khách hàng</h2>
          <dl className="admin-order-meta">
            <div>
              <dt>Khách hàng</dt>
              <dd>{order.customerName}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{order.customerEmail}</dd>
            </div>
            <div>
              <dt>Số điện thoại</dt>
              <dd>{order.customerPhone}</dd>
            </div>
            <div>
              <dt>Địa chỉ giao hàng</dt>
              <dd>{order.shippingAddress}</dd>
            </div>
            <div>
              <dt>Tổng tiền</dt>
              <dd>{formatVnd(order.total)}</dd>
            </div>
          </dl>
        </article>

        <article className="admin-order-panel">
          <h2>Cập nhật trạng thái</h2>
          <AdminOrderStatusForm
            action={updateOrderStatusAction.bind(null, order.id)}
            defaultStatus={order.status}
          />
        </article>

        <article className="admin-order-panel admin-order-panel--full">
          <h2>Sản phẩm trong đơn</h2>
          <div className="admin-order-items">
            {order.items.map((item) => (
              <article key={item.id} className="admin-order-item">
                <div>
                  <h3>{item.product.name}</h3>
                  <p>/{item.product.slug}</p>
                </div>
                <dl>
                  <div>
                    <dt>Số lượng</dt>
                    <dd>{item.quantity}</dd>
                  </div>
                  <div>
                    <dt>Đơn giá</dt>
                    <dd>{formatVnd(item.price)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
```

Append these rules to `src/app/globals.css` after the existing admin form styles:

```css
.admin-order-list,
.admin-order-detail {
  display: grid;
  gap: 20px;
}

.admin-order-detail {
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.admin-order-card,
.admin-order-panel,
.admin-order-item {
  border: 1px solid var(--border);
  border-radius: 24px;
  background: var(--surface-strong);
  box-shadow: var(--shadow);
}

.admin-order-card,
.admin-order-panel {
  padding: 24px;
}

.admin-order-card__copy,
.admin-order-card__stats,
.admin-order-card__actions,
.admin-order-meta,
.admin-order-items,
.admin-order-status-form {
  display: grid;
  gap: 16px;
}

.admin-order-panel--full {
  grid-column: 1 / -1;
}

.admin-order-card__stats,
.admin-order-meta div,
.admin-order-item,
.admin-order-item dl {
  display: grid;
  gap: 10px;
}

.admin-order-item {
  padding: 18px;
}

.admin-order-item h3,
.admin-order-panel h2 {
  margin: 0;
  font-family: var(--font-space-grotesk), Arial, sans-serif;
}

.admin-order-item p,
.admin-order-meta dt,
.admin-order-meta dd,
.admin-order-item dt,
.admin-order-item dd {
  margin: 0;
  color: var(--muted);
}

.admin-order-banner {
  margin: 12px 0 0;
  padding: 14px 16px;
  border-radius: 16px;
}

.admin-order-banner--success {
  background: rgba(21, 128, 61, 0.12);
  color: #166534;
}

.admin-order-banner--error {
  background: rgba(127, 29, 29, 0.1);
  color: #7f1d1d;
}
```

- [ ] **Step 5: Run full buổi 9 verification, then commit**

Run:
```bash
npm run test -- tests/lib/auth.test.js tests/app/login-actions.test.js tests/lib/admin-order-status.test.js tests/app/admin-order-actions.test.js tests/lib/order-api.test.js tests/app/order-route.test.js
npm run lint
npm run build
npm run db:seed
git add src/lib/admin-orders.js src/app/admin/orders/page.js src/app/admin/orders/[id]/page.js src/components/admin-order-status-form.js src/app/globals.css
git commit -m "feat: add protected admin order management"
```

Expected:
- All listed Vitest files pass.
- `eslint` passes.
- `next build` succeeds.
- After `npm run db:seed`, the app needs one fresh checkout order before `/admin/orders` stops showing the empty state.

Manual smoke checklist while `npm run dev` is running:

- Open `/admin` in a fresh browser session and confirm it redirects to `/login?next=%2Fadmin`.
- Click `Vào bằng Customer`, then revisit `/admin` and confirm the redirect still happens.
- Click `Vào bằng Admin`, then confirm `/admin`, `/admin/products`, and `/admin/orders` are accessible.
- Create an order from `/checkout`, open `/admin/orders`, and confirm the new order appears.
- Open `/admin/orders/<id>`, change status to `SHIPPING` and `DELIVERED`, then confirm the banner and updated status both render after redirect.

---

## Self-Review

- Spec coverage: buổi 9 now maps cleanly to auth stub (`src/lib/auth.js`, `/login`), protected admin layout (`src/app/admin/layout.js`), order admin list/detail (`src/app/admin/orders/*`), and status mutation (`src/app/admin/orders/actions.js`).
- Placeholder scan: no `TODO`, `TBD`, or “handle appropriately” language remains; each task includes exact files, commands, and code.
- Type consistency: session roles use only `ADMIN` and `CUSTOMER`; order statuses use only `PENDING`, `SHIPPING`, `DELIVERED`, and `CANCELLED`; both names stay consistent across tests, helpers, actions, and pages.

Plan complete and saved to `docs/superpowers/plans/2026-05-22-minishop-buoi-9.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
