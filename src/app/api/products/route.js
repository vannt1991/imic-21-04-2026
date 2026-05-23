import {
  handleProductRouteError,
  jsonError,
} from "@/lib/api-response";
import { db } from "@/lib/db";
import {
  productCreateSchema,
  toProductApiModel,
  toProductCreateData,
} from "@/lib/product-api";
import { requireAdminApiUser } from "@/lib/auth";

function isForeignKeyConstraintError(error) {
  return error?.code === "P2003";
}

export async function GET() {
  try {
    const products = await db.product.findMany({
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });

    return Response.json(products.map(toProductApiModel));
  } catch (error) {
    return handleProductRouteError(error);
  }
}

export async function POST(request) {
  try {
    const user = await requireAdminApiUser();

    if (user instanceof Response) {
      return user;
    }

    const payload = productCreateSchema.parse(await request.json());
    const category = await db.category.findUnique({
      where: { slug: payload.categorySlug },
      select: { id: true },
    });

    if (!category) {
      return jsonError("Category not found.", 404);
    }

    const product = await db.product.create({
      data: toProductCreateData(payload, category.id),
      include: { category: true },
    });

    return Response.json(toProductApiModel(product), { status: 201 });
  } catch (error) {
    if (isForeignKeyConstraintError(error)) {
      return jsonError("Category not found.", 404);
    }

    return handleProductRouteError(error);
  }
}
