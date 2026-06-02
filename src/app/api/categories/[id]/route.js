import { db } from "@/lib/db";
import { handleRouteError, jsonError } from "@/lib/api-response";
import {
  categoryUpdateSchema,
  toCategoryApiModel,
  toCategoryUpdateData,
} from "@/lib/category-api";

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const category = await db.category.findUnique({
      where: { id: id },
    });

    if (!category) {
      return jsonError("Category not found", 404);
    }

    return Response.json({
      category: toCategoryApiModel(category),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const category = await db.category.findUnique({
      where: { id: id },
    });

    if (!category) {
      return jsonError("Category not found", 404);
    }

    const payload = categoryUpdateSchema.parse(await request.json());

    const updatedCategory = await db.category.update({
      where: { id: id },
      data: toCategoryUpdateData(payload),
    });

    return Response.json({
      category: toCategoryApiModel(updatedCategory),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    const category = await db.category.findUnique({
      where: { id: id },
    });

    if (!category) {
      return jsonError("Category not found", 404);
    }

    await db.category.delete({
      where: { id: id },
    });

    return Response.json(
      {
        deleted: true,
        id,
        message: "Category deleted successfully",
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
