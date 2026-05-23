import { notFound } from "next/navigation";
import { AdminOrderStatusForm } from "@/components/admin-order-status-form";
import { formatVnd } from "@/lib/format-vnd";
import { getOrderStatusLabel } from "@/lib/admin-order-status";
import { getAdminOrderById } from "@/lib/admin-orders";
import { requireAdminUser } from "@/lib/auth";
import { updateOrderStatusAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const orderId =
    typeof resolvedParams?.id === "string" ? resolvedParams.id.trim() : "";
  await requireAdminUser({ nextPath: `/admin/orders/${orderId}` });
  const order = await getAdminOrderById(orderId);

  if (!order) {
    notFound();
  }

  const successMessage =
    typeof resolvedSearchParams?.success === "string"
      ? resolvedSearchParams.success
      : "";
  const errorMessage =
    typeof resolvedSearchParams?.error === "string"
      ? resolvedSearchParams.error
      : "";

  return (
    <main className="admin-page">
      <section className="admin-page__hero">
        <p className="admin-page__eyebrow">Order detail</p>
        <h1>Đơn hàng {order.id}</h1>
        <p className="admin-page__description">
          Trạng thái hiện tại: {getOrderStatusLabel(order.status)}.
        </p>
        {successMessage ? (
          <p
            className="admin-order-banner admin-order-banner--success"
            role="status"
          >
            {successMessage}
          </p>
        ) : null}
        {errorMessage ? (
          <p
            className="admin-order-banner admin-order-banner--error"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}
      </section>

      <section className="admin-order-detail">
        <article className="admin-order-panel">
          <h2>Thông tin khách hàng</h2>
          <dl className="admin-order-meta">
            <div>
              <dt>Khách hàng</dt>
              <dd>{order.customerName}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{order.customerEmail}</dd>
            </div>
            <div>
              <dt>Số điện thoại</dt>
              <dd>{order.customerPhone}</dd>
            </div>
            <div>
              <dt>Địa chỉ giao hàng</dt>
              <dd>{order.shippingAddress}</dd>
            </div>
            <div>
              <dt>Tổng tiền</dt>
              <dd>{formatVnd(order.total)}</dd>
            </div>
          </dl>
        </article>

        <article className="admin-order-panel">
          <h2>Cập nhật trạng thái</h2>
          <AdminOrderStatusForm
            action={updateOrderStatusAction.bind(null, order.id)}
            defaultStatus={order.status}
          />
        </article>

        <article className="admin-order-panel admin-order-panel--full">
          <h2>Sản phẩm trong đơn</h2>
          <div className="admin-order-items">
            {order.items.map((item) => (
              <article key={item.id} className="admin-order-item">
                <div>
                  <h3>{item.product.name}</h3>
                  <p>/{item.product.slug}</p>
                </div>
                <dl>
                  <div>
                    <dt>Số lượng</dt>
                    <dd>{item.quantity}</dd>
                  </div>
                  <div>
                    <dt>Đơn giá</dt>
                    <dd>{formatVnd(item.price)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
