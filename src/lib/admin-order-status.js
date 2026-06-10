import { z } from "zod";

export const orderStatusOptions = Object.freeze([
  { value: "PENDING", label: "Chờ xử lý" },
  { value: "SHIPPING", label: "Đang giao" },
  { value: "DELIVERED", label: "Đã giao" },
  { value: "CANCELLED", label: "Đã hủy" },
]);

const allowedStatuses = orderStatusOptions.map((option) => option.value);

export const updateOrderStatusSchema = z
  .object({
    status: z.enum(allowedStatuses),
  })
  .strict();

export function readOrderStatusFormPayload(formData) {
  const value = formData.get("status");

  return {
    status: typeof value === "string" ? value.trim().toUpperCase() : "",
  };
}

export function getOrderStatusLabel(status) {
  return (
    orderStatusOptions.find((option) => option.value === status)?.label ??
    status
  );
}
