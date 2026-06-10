import { db } from "@/lib/db";

export const adminOrderDetailInclude = Object.freeze({
  items: {
    include: {
      product: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
    },
  },
});

export async function getAdminOrders() {
  return db.order.findMany({
    select: {
      id: true,
      customerName: true,
      customerEmail: true,
      status: true,
      total: true,
      _count: {
        select: {
          items: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function getAdminOrderById(id) {
  if (!id) {
    return null;
  }

  return db.order.findUnique({
    where: { id },
    include: adminOrderDetailInclude,
  });
}
