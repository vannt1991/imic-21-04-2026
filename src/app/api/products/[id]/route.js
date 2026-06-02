import { Prisma } from "@prisma/client";
import { handleProductRouteError, jsonError } from "@/lib/api-response";
import { db } from "@/lib/db";
import {
  originalPriceInvariantMessage,
  productUpdateSchema,
  toProductApiModel,
  toProductUpdateData,
} from "@/lib/product-api";

function isForeignKeyConstraintError(error) {
  return error?.code === "P2003";
}

async function getRouteId(paramsPromise) {
  const params = await paramsPromise;
  const id = typeof params?.id === "string" ? params.id.trim() : "";

  if (!id) {
    return null;
  }

  return id;
}

export async function GET(_request, { params }) {
  try {
    const id = await getRouteId(params);

    if (!id) {
      return jsonError("Product id is required.", 400);
    }

    const product = await db.product.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!product) {
      return jsonError("Product not found.", 404);
    }

    return Response.json(toProductApiModel(product));
  } catch (error) {
    return handleProductRouteError(error);
  }
}

export async function PATCH(request, { params }) {
  try {
    const id = await getRouteId(params);

    if (!id) {
      return jsonError("Product id is required.", 400);
    }

    const payload = productUpdateSchema.parse(await request.json());
    const existingProduct = await db.product.findUnique({
      where: { id },
      select: { id: true, price: true, originalPrice: true },
    });

    if (!existingProduct) {
      return jsonError("Product not found.", 404);
    }

    const effectivePrice = payload.price ?? existingProduct.price;
    const effectiveOriginalPrice =
      payload.originalPrice !== undefined
        ? payload.originalPrice
        : existingProduct.originalPrice;

    if (
      effectiveOriginalPrice !== null &&
      effectiveOriginalPrice <= effectivePrice
    ) {
      return jsonError(originalPriceInvariantMessage, 400);
    }

    let categoryId;

    if (payload.categorySlug !== undefined) {
      const category = await db.category.findUnique({
        where: { slug: payload.categorySlug },
        select: { id: true },
      });

      if (!category) {
        return jsonError("Category not found.", 404);
      }

      categoryId = category.id;
    }

    const product = await db.product.update({
      where: { id },
      data: toProductUpdateData(payload, categoryId),
      include: { category: true },
    });

    return Response.json(toProductApiModel(product));
  } catch (error) {
    if (isForeignKeyConstraintError(error)) {
      return jsonError("Category not found.", 404);
    }

    return handleProductRouteError(error);
  }
}

export async function DELETE(_request, { params }) {
  try {
    const id = await getRouteId(params);

    if (!id) {
      return jsonError("Product id is required.", 400);
    }

    await db.product.delete({
      where: { id },
    });

    return Response.json({ deleted: true, id });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return jsonError(
        "Product cannot be deleted because it is used in orders.",
        409,
      );
    }

    return handleProductRouteError(error);
  }
}
