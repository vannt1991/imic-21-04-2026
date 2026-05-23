import { describe, expect, it } from "vitest";
import {
  getOrderStatusLabel,
  orderStatusOptions,
  readOrderStatusFormPayload,
  updateOrderStatusSchema,
} from "../../src/lib/admin-order-status.js";

describe("admin order status helpers", () => {
  it("normalizes status values from FormData", () => {
    const formData = new FormData();
    formData.set("status", " shipping ");

    expect(readOrderStatusFormPayload(formData)).toEqual({
      status: "SHIPPING",
    });
  });

  it("accepts only supported order statuses", () => {
    expect(updateOrderStatusSchema.parse({ status: "DELIVERED" })).toEqual({
      status: "DELIVERED",
    });

    expect(() =>
      updateOrderStatusSchema.parse({ status: "RETURNED" }),
    ).toThrow();
  });

  it("returns a human label for each visible status", () => {
    expect(orderStatusOptions.map((option) => option.value)).toEqual([
      "PENDING",
      "SHIPPING",
      "DELIVERED",
      "CANCELLED",
    ]);
    expect(getOrderStatusLabel("PENDING")).toBe("Chờ xử lý");
    expect(getOrderStatusLabel("SHIPPING")).toBe("Đang giao");
  });
});
