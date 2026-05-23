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
