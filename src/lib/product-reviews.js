import { z } from "zod";
import { db } from "@/lib/db";

const REVIEWER_NAME_FALLBACK = "Khach hang MiniShop";

export const productReviewSchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().min(10),
  })
  .strict();

export function buildReviewSummary(reviews) {
  if (!reviews.length) {
    return {
      averageRating: 0,
      reviewCount: 0,
    };
  }

  const total = reviews.reduce((sum, review) => sum + review.rating, 0);

  return {
    averageRating: Number((total / reviews.length).toFixed(1)),
    reviewCount: reviews.length,
  };
}

export function toReviewApiModel(review) {
  return {
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    reviewerName: review.user?.name?.trim() || REVIEWER_NAME_FALLBACK,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  };
}

export async function canUserReviewProduct({ userId, productId, client = db }) {
  if (!userId || !productId) {
    return false;
  }

  const count = await client.order.count({
    where: {
      userId,
      status: { not: "CANCELLED" },
      items: {
        some: {
          productId,
        },
      },
    },
  });

  return count > 0;
}

export async function getProductReviewsForViewer({
  productId,
  userId = null,
  client = db,
}) {
  const reviews = await client.productReview.findMany({
    where: { productId },
    orderBy: { updatedAt: "desc" },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  const existingReview = userId
    ? reviews.find((review) => review.userId === userId) ?? null
    : null;
  const hasPurchased = userId
    ? await canUserReviewProduct({ userId, productId, client })
    : false;

  return {
    reviewSummary: buildReviewSummary(reviews),
    reviews: reviews.map(toReviewApiModel),
    viewerReviewState: {
      isLoggedIn: Boolean(userId),
      hasPurchased,
      canReview: Boolean(userId) && hasPurchased,
      existingReview: existingReview
        ? {
            id: existingReview.id,
            rating: existingReview.rating,
            comment: existingReview.comment,
          }
        : null,
    },
  };
}
