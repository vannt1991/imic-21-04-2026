import { db } from "@/lib/db";

const adminCategorySelect = {
  id: true,
  name: true,
  slug: true,
  _count: {
    select: {
      products: true,
    },
  },
};

export async function getAdminCategories() {
  return db.category.findMany({
    select: adminCategorySelect,
    orderBy: { name: "asc" },
  });
}

export async function getAdminCategoryById(id) {
  if (!id) {
    return null;
  }

  return db.category.findUnique({
    where: { id },
    select: adminCategorySelect,
  });
}
