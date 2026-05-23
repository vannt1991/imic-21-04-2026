import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

function createRedirectError(location) {
  return new Error(`REDIRECT:${location}`);
}

function createKnownRequestError(code, message = "Prisma request failed.") {
  return new Prisma.PrismaClientKnownRequestError(message, {
    code,
    clientVersion: "test",
  });
}

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
    throw createRedirectError(location);
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

function createCategoryFormData() {
  const formData = new FormData();
  formData.set("name", "  Running  ");
  formData.set("slug", " running ");
  return formData;
}

function readRedirectLocation() {
  return redirect.mock.calls.at(-1)?.[0] ?? null;
}

function expectRedirectTo(location, pathname, searchParams = {}) {
  const url = new URL(location, "http://localhost");

  expect(url.pathname).toBe(pathname);

  for (const [key, value] of Object.entries(searchParams)) {
    expect(url.searchParams.get(key)).toBe(value);
  }
}

describe("admin category actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminUser.mockResolvedValue({
      id: "admin_1",
      role: "ADMIN",
    });
  });

  it("creates a category, revalidates, then redirects to the list", async () => {
    db.category.create.mockResolvedValue({
      id: "cat_1",
      slug: "running",
    });

    await expect(createCategoryAction(createCategoryFormData())).rejects.toThrow(
      "REDIRECT:/admin/categories",
    );

    expect(requireAdminUser).toHaveBeenCalledWith({
      nextPath: "/admin/categories/new",
    });
    expect(db.category.create).toHaveBeenCalledWith({
      data: {
        name: "Running",
        slug: "running",
      },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/categories");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/products");
  });

  it("redirects back to the create form when the slug already exists", async () => {
    db.category.create.mockRejectedValue(createKnownRequestError("P2002"));

    await expect(createCategoryAction(createCategoryFormData())).rejects.toThrow(
      "REDIRECT:",
    );

    expectRedirectTo(readRedirectLocation(), "/admin/categories/new", {
      error: "Slug đã tồn tại. Vui lòng chọn slug khác.",
      name: "  Running  ",
      slug: " running ",
    });
  });

  it("updates a category, revalidates, then redirects to the list", async () => {
    db.category.update.mockResolvedValue({
      id: "cat_1",
      slug: "lifestyle",
    });

    const formData = new FormData();
    formData.set("name", "  Lifestyle  ");
    formData.set("slug", " lifestyle ");

    await expect(updateCategoryAction("cat_1", formData)).rejects.toThrow(
      "REDIRECT:/admin/categories",
    );

    expect(requireAdminUser).toHaveBeenCalledWith({
      nextPath: "/admin/categories/cat_1/edit",
    });
    expect(db.category.update).toHaveBeenCalledWith({
      where: { id: "cat_1" },
      data: {
        name: "Lifestyle",
        slug: "lifestyle",
      },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/categories");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/products");
  });

  it("redirects to the list with an error when update hits a missing category", async () => {
    db.category.update.mockRejectedValue(createKnownRequestError("P2025"));

    await expect(
      updateCategoryAction("missing-cat", createCategoryFormData()),
    ).rejects.toThrow("REDIRECT:");

    expectRedirectTo(readRedirectLocation(), "/admin/categories", {
      error: "Category không tồn tại.",
    });
  });

  it("blocks delete when the category still has products", async () => {
    db.category.findUnique.mockResolvedValue({
      id: "cat_1",
      _count: {
        products: 2,
      },
    });

    await expect(deleteCategoryAction("cat_1")).rejects.toThrow("REDIRECT:");

    expect(requireAdminUser).toHaveBeenCalledWith({
      nextPath: "/admin/categories",
    });
    expect(db.category.delete).not.toHaveBeenCalled();
    expectRedirectTo(readRedirectLocation(), "/admin/categories", {
      error: "Không thể xóa category đang có sản phẩm.",
    });
  });

  it("redirects to the list with an error when delete cannot find the category before delete", async () => {
    db.category.findUnique.mockResolvedValue(null);

    await expect(deleteCategoryAction("missing-cat")).rejects.toThrow(
      "REDIRECT:",
    );

    expect(db.category.delete).not.toHaveBeenCalled();
    expectRedirectTo(readRedirectLocation(), "/admin/categories", {
      error: "Category không tồn tại.",
    });
  });

  it("deletes the category when no products reference it", async () => {
    db.category.findUnique.mockResolvedValue({
      id: "cat_1",
      _count: {
        products: 0,
      },
    });
    db.category.delete.mockResolvedValue({
      id: "cat_1",
    });

    await expect(deleteCategoryAction("cat_1")).rejects.toThrow(
      "REDIRECT:/admin/categories",
    );

    expect(db.category.delete).toHaveBeenCalledWith({
      where: { id: "cat_1" },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/categories");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/products");
  });

  it("redirects to the list with an error when delete loses a race with another delete", async () => {
    db.category.findUnique.mockResolvedValue({
      id: "cat_1",
      _count: {
        products: 0,
      },
    });
    db.category.delete.mockRejectedValue(createKnownRequestError("P2025"));

    await expect(deleteCategoryAction("cat_1")).rejects.toThrow("REDIRECT:");

    expectRedirectTo(readRedirectLocation(), "/admin/categories", {
      error: "Category không tồn tại.",
    });
  });
});
