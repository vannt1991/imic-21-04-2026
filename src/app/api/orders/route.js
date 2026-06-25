import { handleRouteError, jsonError } from "@/lib/api-response";
import { requireAuthenticatedApiUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  buildOrderDraft,
  createOrderSchema,
  InsufficientStockError,
  MissingProductsError,
  orderApiInclude,
  toOrderApiModel,
} from "@/lib/order-api";

const productLookupSelect = Object.freeze({
  id: true,
  slug: true,
  name: true,
  price: true,
  stock: true,
  isActive: true,
});

function getUniqueSlugs(items) {
  return [...new Set(items.map((item) => item.slug))];
}

async function assertReservation(tx, reservation) {
  const result = await tx.product.updateMany({
    where: {
      id: reservation.productId,
      stock: { gte: reservation.quantity },
      isActive: true,
    },
    data: {
      stock: { decrement: reservation.quantity },
    },
  });

  if (result.count === 1) {
    return;
  }

  const product = await tx.product.findUnique({
    where: { id: reservation.productId },
    select: {
      id: true,
      slug: true,
      stock: true,
      isActive: true,
    },
  });

  if (!product || !product.isActive) {
    throw new MissingProductsError([reservation.slug]);
  }

  throw new InsufficientStockError([
    {
      slug: reservation.slug,
      requestedQuantity: reservation.quantity,
      availableStock: product.stock,
    },
  ]);
}

export async function POST(request) {
  try {
    const user = await requireAuthenticatedApiUser();

    if (user instanceof Response) {
      return user;
    }

    const payload = createOrderSchema.parse(await request.json());
    const slugs = getUniqueSlugs(payload.items);
    const products = await db.product.findMany({
      where: {
        slug: {
          in: slugs,
        },
      },
      select: productLookupSelect,
    });
    const draft = buildOrderDraft(payload, products);

    const order = await db.$transaction(async (tx) => {
      for (const reservation of draft.stockReservations) {
        await assertReservation(tx, reservation);
      }

      return tx.order.create({
        data: {
          userId: user.id,
          ...draft.customer,
          status: "PENDING",
          total: draft.total,
          items: {
            create: draft.orderItems,
          },
        },
        include: orderApiInclude,
      });
    });

    return Response.json(toOrderApiModel(order), { status: 201 });
  } catch (error) {
    if (error instanceof MissingProductsError) {
      return jsonError(error.message, 404, { slugs: error.slugs });
    }

    if (error instanceof InsufficientStockError) {
      return jsonError(error.message, 409, error.items);
    }

    return handleRouteError(error, {
      treatJsonSyntaxErrorAsBadRequest: true,
    });
  }
}
