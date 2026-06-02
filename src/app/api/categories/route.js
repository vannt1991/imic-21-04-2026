import { db } from "@/lib/db";
import { handleRouteError } from "@/lib/api-response";
import {
  categoryCreateSchema,
  toCategoryCreateData,
  toCategoryApiModel,
} from "@/lib/category-api";

export async function GET() {
  try {
    const categories = await db.category.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    });

    return Response.json({ categories });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request) {
  try {
    const payload = categoryCreateSchema.parse(await request.json());

    const newCategory = await db.category.create({
      data: toCategoryCreateData(payload),
    });

    return Response.json(
      {
        category: toCategoryApiModel(newCategory),
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}