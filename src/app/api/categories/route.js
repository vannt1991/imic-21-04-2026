import { db } from "@/lib/db";
import { handleRouteError } from "@/lib/api-response";

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