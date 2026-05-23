import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookiesMock, db, redirectMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  db: {
    session: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
  redirectMock: vi.fn((location) => {
    throw new Error(`REDIRECT:${location}`);
  }),
}));

vi.mock("@/lib/db", () => ({
  db,
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
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

  it("avoids cookie mutation during implicit render-path cleanup", async () => {
    process.env.AUTH_SECRET = "test-auth-secret";
    const cookieStore = createCookieStore("expired-token");

    cookiesMock.mockResolvedValue(cookieStore);
    db.session.findUnique.mockResolvedValue({
      id: "sess_1",
      expiresAt: new Date("2000-01-01T00:00:00.000Z"),
      user: {
        id: "user_1",
        role: ROLE_ADMIN,
      },
    });

    await expect(getCurrentUser()).resolves.toBe(null);
    expect(db.session.deleteMany).toHaveBeenCalledWith({
      where: { tokenHash: hashSessionToken("expired-token") },
    });
    expect(cookieStore.delete).not.toHaveBeenCalled();
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
