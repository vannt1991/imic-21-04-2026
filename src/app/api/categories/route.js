import { handleRouteError } from "@/lib/api-response";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const categories = await db.category.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
      },
      orderBy: { name: "asc" },
    });

    return Response.json(categories);
  } catch (error) {
    return handleRouteError(error);
  }
}
