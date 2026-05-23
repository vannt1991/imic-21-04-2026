import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookies, db, redirect, setAuthSession, clearAuthSession } = vi.hoisted(
  () => ({
    cookies: vi.fn(),
    db: {
      user: {
        findUnique: vi.fn(),
      },
    },
    redirect: vi.fn(),
    setAuthSession: vi.fn(),
    clearAuthSession: vi.fn(),
  }),
);

vi.mock("@/lib/db", () => ({
  db,
}));

vi.mock("next/headers", () => ({
  cookies,
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
      "/login?error=Email+ho%E1%BA%B7c+m%E1%BA%ADt+kh%E1%BA%A9u+kh%C3%B4ng+%C4%91%C3%BAng.&next=%2Fadmin&email=admin%40minishop.local",
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
