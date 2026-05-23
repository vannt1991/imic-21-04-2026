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
    expectRedirectTo(readRedirectLocation(), "/admin/orders/ord_1", {
      error:
        'Invalid option: expected one of "PENDING"|"SHIPPING"|"DELIVERED"|"CANCELLED"',
    });
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
    expectRedirectTo(readRedirectLocation(), "/admin/orders/ord_1", {
      success: "Đã cập nhật trạng thái đơn hàng.",
    });
  });

  it("redirects back with a not-found message when Prisma returns P2025", async () => {
    db.order.update.mockRejectedValue(createKnownRequestError("P2025"));

    await expect(
      updateOrderStatusAction("missing-order", createFormData("PENDING")),
    ).rejects.toThrow("REDIRECT:");

    expectRedirectTo(readRedirectLocation(), "/admin/orders/missing-order", {
      error: "Đơn hàng không tồn tại.",
    });
  });
});
