import { db } from "@/lib/db";
import { handleRouteError, jsonError } from "@/lib/api-response";
import {
  productUpdateSchema,
  toProductApiModel,
  toProductUpdateData,
} from "@/lib/product-api";

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const product = await db.product.findUnique({
      where: { id: id },
      include: {
        category: true,
      },
    });

    if (!product) {
      return jsonError("Product not found", 404);
    }

    return Response.json({
      product: toProductApiModel(product),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const product = await db.product.findUnique({
      where: { id: id },
    });

    if (!product) {
      return jsonError("Product not found", 404);
    }

    const payload = productUpdateSchema.parse(await request.json());
    let categoryId;
    if (payload.categorySlug) {
      const category = await db.category.findUnique({
        where: { slug: payload.categorySlug },
        select: { id: true },
      });

      if (!category) {
        return jsonError("Category not found", 400);
      }
      categoryId = category.id;
    }

    const updatedProduct = await db.product.update({
      where: { id: id },
      data: toProductUpdateData(payload, categoryId),
      include: {
        category: true,
      },
    });

    return Response.json({
      product: toProductApiModel(updatedProduct),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    const product = await db.product.findUnique({
      where: { id: id },
    });

    if (!product) {
      return jsonError("Product not found", 404);
    }

    await db.product.delete({
      where: { id: id },
    });

    return Response.json(
      {
        deleted: true,
        id,
        message: "Product deleted successfully",
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
