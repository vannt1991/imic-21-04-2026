import { db } from "@/lib/db";

const categorySelect = {
  id: true,
  slug: true,
  name: true,
};

export async function getAdminProducts() {
  return db.product.findMany({
    include: {
      category: {
        select: categorySelect,
      },
    },
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
  });
}

export async function getAdminProductById(id) {
  if (!id) {
    return null;
  }

  return db.product.findUnique({
    where: { id },
    include: {
      category: {
        select: categorySelect,
      },
    },
  });
}
