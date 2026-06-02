import { db } from "@/lib/db";
import { handleRouteError, jsonError } from "@/lib/api-response";
import { toProductApiModel, toProductCreateData } from "@/lib/product-api";

export async function GET() {
  try {
    const products = await db.product.findMany({
      where: { isActive: true },
      include: {
        category: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json({
      products: products.map(toProductApiModel),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request) {
  try {
    const payload = productCreateSchema.parse(await request.json());
    const category = await db.category.findUnique({
      where: { slug: payload.categorySlug },
      select: { id: true },
    });

    if (!category) {
      return jsonError("Category not found", 400);
    }
    const newProduct = await db.product.create({
      data: toProductCreateData(payload, category.id),
    });

    return Response.json(
      {
        product: toProductApiModel(newProduct),
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
