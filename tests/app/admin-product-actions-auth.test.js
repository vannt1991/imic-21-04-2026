import { beforeEach, describe, expect, it, vi } from "vitest";

function createRedirectError(location) {
  return new Error(`REDIRECT:${location}`);
}

const { db, tx, revalidatePath, redirect, requireAdminUser } = vi.hoisted(() => {
  const tx = {
    category: {
      findUnique: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };

  return {
    db: {
      category: {
        findUnique: vi.fn(),
      },
      product: {
        create: vi.fn(),
        delete: vi.fn(),
      },
      $transaction: vi.fn(async (callback) => callback(tx)),
    },
    tx,
    revalidatePath: vi.fn(),
    redirect: vi.fn((location) => {
      throw createRedirectError(location);
    }),
    requireAdminUser: vi.fn(),
  };
});

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
  createProductAction,
  deleteProductAction,
  updateProductAction,
} from "@/app/admin/products/actions";

function createProductFormData() {
  const formData = new FormData();

  formData.set("name", "Test product");
  formData.set("slug", "test-product");
  formData.set("description", "Test description");
  formData.set("price", "100");
  formData.set("originalPrice", "150");
  formData.set("stock", "5");
  formData.set("categorySlug", "chairs");
  formData.set("isActive", "on");

  return formData;
}

describe("admin product action auth guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.$transaction.mockImplementation(async (callback) => callback(tx));
    db.category.findUnique.mockResolvedValue({ id: "cat_1" });
    tx.category.findUnique.mockResolvedValue({ id: "cat_1" });
    db.product.create.mockResolvedValue({ slug: "test-product" });
    tx.product.findUnique.mockResolvedValue({ slug: "old-product" });
    tx.product.update.mockResolvedValue({ slug: "test-product" });
    db.product.delete.mockResolvedValue({ slug: "old-product" });
  });

  it("guards createProductAction before any mutation", async () => {
    requireAdminUser.mockRejectedValue(
      createRedirectError("/login?next=%2Fadmin%2Fproducts%2Fnew"),
    );

    await expect(createProductAction(createProductFormData())).rejects.toThrow(
      "REDIRECT:/login?next=%2Fadmin%2Fproducts%2Fnew",
    );

    expect(requireAdminUser).toHaveBeenCalledWith({
      nextPath: "/admin/products/new",
    });
    expect(db.product.create).not.toHaveBeenCalled();
    expect(db.category.findUnique).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("guards createProductAction before validation redirects malformed payloads", async () => {
    requireAdminUser.mockRejectedValue(
      createRedirectError("/login?next=%2Fadmin%2Fproducts%2Fnew"),
    );

    await expect(createProductAction(new FormData())).rejects.toThrow(
      "REDIRECT:/login?next=%2Fadmin%2Fproducts%2Fnew",
    );

    expect(requireAdminUser).toHaveBeenCalledWith({
      nextPath: "/admin/products/new",
    });
    expect(db.product.create).not.toHaveBeenCalled();
    expect(db.category.findUnique).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("guards updateProductAction before any mutation", async () => {
    requireAdminUser.mockRejectedValue(
      createRedirectError("/login?next=%2Fadmin%2Fproducts%2Fprod_1%2Fedit"),
    );

    await expect(
      updateProductAction("prod_1", createProductFormData()),
    ).rejects.toThrow("REDIRECT:/login?next=%2Fadmin%2Fproducts%2Fprod_1%2Fedit");

    expect(requireAdminUser).toHaveBeenCalledWith({
      nextPath: "/admin/products/prod_1/edit",
    });
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(tx.product.update).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("guards deleteProductAction before any mutation", async () => {
    requireAdminUser.mockRejectedValue(
      createRedirectError("/login?next=%2Fadmin%2Fproducts"),
    );

    await expect(deleteProductAction("prod_1")).rejects.toThrow(
      "REDIRECT:/login?next=%2Fadmin%2Fproducts",
    );

    expect(requireAdminUser).toHaveBeenCalledWith({
      nextPath: "/admin/products",
    });
    expect(db.product.delete).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
