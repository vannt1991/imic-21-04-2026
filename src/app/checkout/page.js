import { CheckoutPageContent } from "@/components/checkout-page-content";
import { requireAuthenticatedUser } from "@/lib/auth";

export const metadata = {
  title: "MiniShop | Checkout",
  description: "Nhập thông tin khách hàng và gửi đơn hàng từ giỏ hàng hiện tại.",
};

export default async function CheckoutPage() {
  const currentUser = await requireAuthenticatedUser({
    nextPath: "/checkout",
  });

  return <CheckoutPageContent currentUser={currentUser} />;
}
