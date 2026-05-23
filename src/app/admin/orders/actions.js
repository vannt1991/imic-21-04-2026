"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  readOrderStatusFormPayload,
  updateOrderStatusSchema,
} from "@/lib/admin-order-status";

function buildOrderDetailUrl(orderId, messageKey, message) {
  const params = new URLSearchParams({ [messageKey]: message });

  return `/admin/orders/${orderId}?${params.toString()}`;
}

export async function updateOrderStatusAction(orderId, formData) {
  await requireAdminUser({ nextPath: `/admin/orders/${orderId}` });

  const parsedPayload = updateOrderStatusSchema.safeParse(
    readOrderStatusFormPayload(formData),
  );

  if (!parsedPayload.success) {
    return redirect(
      buildOrderDetailUrl(
        orderId,
        "error",
        parsedPayload.error.issues[0]?.message ?? "Trạng thái không hợp lệ.",
      ),
    );
  }

  try {
    await db.order.update({
      where: { id: orderId },
      data: { status: parsedPayload.data.status },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return redirect(
        buildOrderDetailUrl(orderId, "error", "Đơn hàng không tồn tại."),
      );
    }

    console.error(error);
    return redirect(
      buildOrderDetailUrl(
        orderId,
        "error",
        "Không thể cập nhật trạng thái lúc này.",
      ),
    );
  }

  return redirect(
    buildOrderDetailUrl(
      orderId,
      "success",
      "Đã cập nhật trạng thái đơn hàng.",
    ),
  );
}
