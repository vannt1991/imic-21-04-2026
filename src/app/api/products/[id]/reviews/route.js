import { revalidatePath } from "next/cache";
import { handleRouteError, jsonError } from "@/lib/api-response";
import { requireAuthenticatedApiUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  canUserReviewProduct,
  getProductReviewsForViewer,
  productReviewSchema,
  toReviewApiModel,
} from "@/lib/product-reviews";

const reviewInclude = Object.freeze({
  user: {
    select: {
      name: true,
      email: true,
    },
  },
});

export async function POST(request, { params }) {
  try {
    const user = await requireAuthenticatedApiUser();

    if (user instanceof Response) {
      return user;
    }

    const { id } = await params;
    const payload = productReviewSchema.parse(await request.json());
    const product = await db.product.findUnique({
      where: { id },
      select: {
        id: true,
        isActive: true,
        slug: true,
      },
    });

    if (!product || !product.isActive) {
      return jsonError("Product not found.", 404);
    }

    const eligible = await canUserReviewProduct({
      userId: user.id,
      productId: product.id,
    });

    if (!eligible) {
      return jsonError(
        "You must purchase this product before reviewing it.",
        403,
      );
    }

    const existingReview = await db.productReview.findUnique({
      where: {
        userId_productId: {
          userId: user.id,
          productId: product.id,
        },
      },
      include: reviewInclude,
    });

    const review = existingReview
      ? await db.productReview.update({
          where: { id: existingReview.id },
          data: {
            rating: payload.rating,
            comment: payload.comment,
          },
          include: reviewInclude,
        })
      : await db.productReview.create({
          data: {
            userId: user.id,
            productId: product.id,
            rating: payload.rating,
            comment: payload.comment,
          },
          include: reviewInclude,
        });

    const reviewData = await getProductReviewsForViewer({
      productId: product.id,
      userId: user.id,
    });

    revalidatePath(`/products/${product.slug}`);

    return Response.json(
      {
        review: toReviewApiModel(review),
        reviewSummary: reviewData.reviewSummary,
      },
      { status: existingReview ? 200 : 201 },
    );
  } catch (error) {
    return handleRouteError(error, {
      treatJsonSyntaxErrorAsBadRequest: true,
    });
  }
}
