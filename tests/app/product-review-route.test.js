import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, requireAuthenticatedApiUser, canUserReviewProduct, revalidatePath } =
  vi.hoisted(() => ({
    db: {
      order: {
        count: vi.fn(),
      },
      product: {
        findUnique: vi.fn(),
      },
      productReview: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
      },
    },
    requireAuthenticatedApiUser: vi.fn(),
    canUserReviewProduct: vi.fn(),
    revalidatePath: vi.fn(),
  }));

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/auth", () => ({ requireAuthenticatedApiUser }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/product-reviews", async () => {
  const actual = await vi.importActual("@/lib/product-reviews");

  return {
    ...actual,
    canUserReviewProduct,
  };
});

import { POST } from "@/app/api/products/[id]/reviews/route";

async function readJson(response) {
  return response.json();
}

function createReviewRecord(overrides = {}) {
  return {
    id: "rev_1",
    userId: "user_customer",
    productId: "prod_1",
    rating: 5,
    comment: "Rat em va di hoc hang ngay rat on.",
    createdAt: new Date("2026-06-25T09:00:00.000Z"),
    updatedAt: new Date("2026-06-25T10:00:00.000Z"),
    user: {
      name: "MiniShop Customer",
      email: "customer@minishop.local",
    },
    ...overrides,
  };
}

describe("POST /api/products/[id]/reviews", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    db.order.count.mockResolvedValue(1);
  });

  it("returns 401 for anonymous requests", async () => {
    requireAuthenticatedApiUser.mockResolvedValue(
      Response.json(
        { error: { message: "Authentication required." } },
        { status: 401 },
      ),
    );

    const response = await POST(
      new Request("http://localhost/api/products/prod_1/reviews", {
        method: "POST",
        body: JSON.stringify({
          rating: 5,
          comment: "Rat em va di hoc hang ngay rat on.",
        }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "prod_1" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 403 when the user has not purchased the product", async () => {
    requireAuthenticatedApiUser.mockResolvedValue({
      id: "user_customer",
      role: "CUSTOMER",
    });
    db.product.findUnique.mockResolvedValue({
      id: "prod_1",
      isActive: true,
      slug: "air-runner-basic",
    });
    canUserReviewProduct.mockResolvedValue(false);

    const response = await POST(
      new Request("http://localhost/api/products/prod_1/reviews", {
        method: "POST",
        body: JSON.stringify({
          rating: 5,
          comment: "Rat em va di hoc hang ngay rat on.",
        }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "prod_1" }) },
    );

    expect(response.status).toBe(403);
    expect(await readJson(response)).toEqual({
      error: { message: "You must purchase this product before reviewing it." },
    });
  });

  it("creates a review for an eligible purchaser", async () => {
    requireAuthenticatedApiUser.mockResolvedValue({
      id: "user_customer",
      role: "CUSTOMER",
    });
    db.product.findUnique.mockResolvedValue({
      id: "prod_1",
      isActive: true,
      slug: "air-runner-basic",
    });
    canUserReviewProduct.mockResolvedValue(true);
    db.productReview.findUnique.mockResolvedValue(null);
    db.productReview.create.mockResolvedValue(createReviewRecord());
    db.productReview.findMany.mockResolvedValue([createReviewRecord()]);

    const response = await POST(
      new Request("http://localhost/api/products/prod_1/reviews", {
        method: "POST",
        body: JSON.stringify({
          rating: 5,
          comment: "Rat em va di hoc hang ngay rat on.",
        }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "prod_1" }) },
    );

    expect(response.status).toBe(201);
    expect(db.productReview.create).toHaveBeenCalledWith({
      data: {
        userId: "user_customer",
        productId: "prod_1",
        rating: 5,
        comment: "Rat em va di hoc hang ngay rat on.",
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/products/air-runner-basic");
  });

  it("updates the existing review on second submit", async () => {
    requireAuthenticatedApiUser.mockResolvedValue({
      id: "user_customer",
      role: "CUSTOMER",
    });
    db.product.findUnique.mockResolvedValue({
      id: "prod_1",
      isActive: true,
      slug: "air-runner-basic",
    });
    canUserReviewProduct.mockResolvedValue(true);
    db.productReview.findUnique.mockResolvedValue(createReviewRecord());
    db.productReview.update.mockResolvedValue(
      createReviewRecord({
        rating: 4,
        comment: "Da sua lai sau khi di hoc them mot tuan.",
      }),
    );
    db.productReview.findMany.mockResolvedValue([
      createReviewRecord({
        rating: 4,
        comment: "Da sua lai sau khi di hoc them mot tuan.",
      }),
    ]);

    const response = await POST(
      new Request("http://localhost/api/products/prod_1/reviews", {
        method: "POST",
        body: JSON.stringify({
          rating: 4,
          comment: "Da sua lai sau khi di hoc them mot tuan.",
        }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "prod_1" }) },
    );

    expect(response.status).toBe(200);
    expect(db.productReview.create).not.toHaveBeenCalled();
    expect(db.productReview.update).toHaveBeenCalledWith({
      where: { id: "rev_1" },
      data: {
        rating: 4,
        comment: "Da sua lai sau khi di hoc them mot tuan.",
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });
  });
});
