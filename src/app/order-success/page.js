import Link from "next/link";

export const metadata = {
  title: "MiniShop | Trạng thái đơn hàng",
  description: "Trang hiển thị trạng thái điều hướng sau checkout và mã tham chiếu nếu có.",
};

function readOrderId(params) {
  if (typeof params?.orderId !== "string") {
    return "";
  }

  return params.orderId.trim();
}

export default async function OrderSuccessPage({ searchParams }) {
  const params = await searchParams;
  const orderId = readOrderId(params);
  const hasOrderId = Boolean(orderId);
  const eyebrow = hasOrderId
    ? "Đã quay lại từ bước checkout"
    : "Chưa có mã tham chiếu";
  const title = hasOrderId
    ? "Trang này cho biết bạn đã được chuyển hướng sau khi gửi checkout."
    : "Không tìm thấy mã tham chiếu trong liên kết này.";
  const description = hasOrderId
    ? "Mã bên dưới chỉ là dữ liệu đi kèm theo URL sau bước checkout, không phải xác nhận server-side rằng đã tìm thấy hay đối chiếu được một bản ghi đơn hàng."
    : "Trang này vẫn hữu ích để quay lại storefront hoặc mở khu vực quản trị sản phẩm, nhưng hiện chưa có mã nào trong URL để tham chiếu lại bước chuyển hướng vừa rồi.";
  const statusLabel = hasOrderId ? "Mã tham chiếu từ URL" : "Trạng thái";
  const statusValue = hasOrderId
    ? orderId
    : "Chưa tìm thấy mã tham chiếu trong liên kết hiện tại.";

  return (
    <main className="success-page">
      <section className="success-page__hero">
        <div className="site-shell">
          <p className="success-page__eyebrow">{eyebrow}</p>
          <h1 className="success-page__title">{title}</h1>
          <p className="success-page__description">{description}</p>
        </div>
      </section>

      <section className="success-page__section">
        <div className="site-shell">
          <article className="success-page__card">
            <p className="success-page__badge">
              {hasOrderId
                ? "Ngữ cảnh sau checkout"
                : "Cần kiểm tra lại liên kết"}
            </p>
            <h2 className="success-page__heading">
              {hasOrderId
                ? "Đã nhận được mã tham chiếu trên URL sau khi rời bước checkout."
                : "Liên kết hiện tại chưa mang theo mã tham chiếu nào."}
            </h2>
            <p>
              {hasOrderId
                ? "Bạn có thể lưu lại mã này để đối chiếu luồng redirect trong buổi học, sau đó quay lại danh sách sản phẩm hoặc mở khu vực quản trị sản phẩm để kiểm tra dữ liệu catalog hay tồn kho nếu cần."
                : "Nếu bạn vừa hoàn tất checkout, hãy thử kiểm tra lại luồng chuyển hướng. Bạn cũng có thể quay lại danh sách sản phẩm hoặc mở khu vực quản trị sản phẩm để rà soát dữ liệu catalog hiện tại."}
            </p>

            <div className="success-page__status">
              <span>{statusLabel}</span>
              <strong>{statusValue}</strong>
            </div>

            <div className="success-page__actions">
              <Link href="/products" className="button button--primary">
                Quay lại sản phẩm
              </Link>

              <Link href="/admin/products" className="button button--secondary">
                Kiểm tra dữ liệu sản phẩm
              </Link>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
