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

import {
  AUTH_COOKIE_NAME,
  ROLE_ADMIN,
  ROLE_CUSTOMER,
  getCurrentUser,
  normalizeRole,
  requireAdminUser,
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
  beforeEach(() => {
    redirectMock.mockClear();
  });

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

  it("keeps redirect targets on internal paths only", () => {
    expect(sanitizeNextPath("/admin/orders")).toBe("/admin/orders");
    expect(sanitizeNextPath("/\\\\evil.example")).toBe("/admin");
    expect(sanitizeNextPath("https://evil.example")).toBe("/admin");
    expect(sanitizeNextPath("orders")).toBe("/admin");
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
});
