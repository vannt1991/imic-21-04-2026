import { describe, expect, it, vi } from "vitest";
import {
  buildReviewSummary,
  canUserReviewProduct,
  productReviewSchema,
  toReviewApiModel,
} from "../../src/lib/product-reviews.js";

describe("product reviews helpers", () => {
  it("validates and trims review input", () => {
    expect(
      productReviewSchema.parse({
        rating: 5,
        comment: "  Rat em va di hoc hang ngay rat on  ",
      }),
    ).toEqual({
      rating: 5,
      comment: "Rat em va di hoc hang ngay rat on",
    });
  });

  it("rejects ratings outside 1..5 and short comments", () => {
    expect(() =>
      productReviewSchema.parse({ rating: 0, comment: "ngan" }),
    ).toThrow();
    expect(() =>
      productReviewSchema.parse({ rating: 6, comment: "binh luan hop le" }),
    ).toThrow();
  });

  it("builds average rating and count from review rows", () => {
    expect(
      buildReviewSummary([{ rating: 5 }, { rating: 4 }, { rating: 3 }]),
    ).toEqual({
      averageRating: 4,
      reviewCount: 3,
    });
  });

  it("normalizes a review record for API output", () => {
    expect(
      toReviewApiModel({
        id: "rev_1",
        rating: 4,
        comment: "Rat de di hoc.",
        createdAt: new Date("2026-06-25T09:00:00.000Z"),
        updatedAt: new Date("2026-06-25T10:00:00.000Z"),
        user: {
          name: null,
          email: "customer@minishop.local",
        },
      }),
    ).toEqual({
      id: "rev_1",
      rating: 4,
      comment: "Rat de di hoc.",
      reviewerName: "Khach hang MiniShop",
      createdAt: "2026-06-25T09:00:00.000Z",
      updatedAt: "2026-06-25T10:00:00.000Z",
    });
  });

  it("treats non-cancelled matching orders as review-eligible", async () => {
    const client = {
      order: {
        count: vi.fn().mockResolvedValue(1),
      },
    };

    await expect(
      canUserReviewProduct({
        userId: "user_customer",
        productId: "prod_1",
        client,
      }),
    ).resolves.toBe(true);

    expect(client.order.count).toHaveBeenCalledWith({
      where: {
        userId: "user_customer",
        status: { not: "CANCELLED" },
        items: {
          some: {
            productId: "prod_1",
          },
        },
      },
    });
  });
});
