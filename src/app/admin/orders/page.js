import Link from "next/link";
import { formatVnd } from "@/lib/format-vnd";
import { getOrderStatusLabel } from "@/lib/admin-order-status";
import { getAdminOrders } from "@/lib/admin-orders";
import { requireAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "MiniShop Admin | Orders",
  description: "Quản trị đơn hàng cho MiniShop.",
};

export default async function AdminOrdersPage() {
  await requireAdminUser({ nextPath: "/admin/orders" });
  const orders = await getAdminOrders();

  return (
    <main className="admin-page">
      <section className="admin-page__hero">
        <p className="admin-page__eyebrow">Orders</p>
        <h1>Quản lý đơn hàng</h1>
        <p className="admin-page__description">
          Theo dõi ai đã mua gì, tổng tiền bao nhiêu, và chuyển trạng thái đơn.
        </p>
      </section>

      <section className="admin-order-list">
        {orders.length === 0 ? (
          <article className="admin-order-card">
            <h2>Chưa có đơn hàng nào</h2>
            <p>
              Hãy tạo một đơn qua `/checkout`, sau đó quay lại trang này để học
              luồng order admin.
            </p>
          </article>
        ) : (
          orders.map((order) => (
            <article key={order.id} className="admin-order-card">
              <div className="admin-order-card__copy">
                <p className="admin-page__eyebrow">
                  {getOrderStatusLabel(order.status)}
                </p>
                <h2>{order.customerName}</h2>
                <p>{order.customerEmail}</p>
              </div>

              <dl className="admin-order-card__stats">
                <div>
                  <dt>Tổng tiền</dt>
                  <dd>{formatVnd(order.total)}</dd>
                </div>
                <div>
                  <dt>Số dòng hàng</dt>
                  <dd>{order._count.items}</dd>
                </div>
                <div>
                  <dt>Mã đơn</dt>
                  <dd>{order.id}</dd>
                </div>
              </dl>

              <div className="admin-order-card__actions">
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="button button--secondary"
                >
                  Xem chi tiết
                </Link>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
