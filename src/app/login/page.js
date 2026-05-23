import Link from "next/link";
import {
  loginAsAdminAction,
  loginAsCustomerAction,
} from "@/app/login/actions";
import { getCurrentUser, sanitizeNextPath } from "@/lib/auth";

export const metadata = {
  title: "MiniShop | Login",
  description: "Demo login page for MiniShop admin access control.",
};

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const currentUser = await getCurrentUser();
  const nextPath = sanitizeNextPath(
    typeof params?.next === "string" ? params.next : "/admin",
  );

  return (
    <main className="login-page site-shell">
      <section className="login-card">
        <p className="login-card__eyebrow">Demo auth stub</p>
        <h1>Đăng nhập để thử quyền truy cập</h1>
        <p className="login-card__description">
          Buổi 9 chưa dùng provider thật. Chọn một role để học authentication,
          authorization, và server-side guard.
        </p>

        {currentUser ? (
          <p className="login-card__session" role="status">
            Phiên hiện tại: <strong>{currentUser.name}</strong> ({currentUser.role})
          </p>
        ) : null}

        <div className="login-card__actions">
          <form action={loginAsAdminAction}>
            <input type="hidden" name="next" value={nextPath} />
            <button type="submit" className="button button--primary">
              Vào bằng Admin
            </button>
          </form>

          <form action={loginAsCustomerAction}>
            <input type="hidden" name="next" value={nextPath} />
            <button type="submit" className="button button--secondary">
              Vào bằng Customer
            </button>
          </form>
        </div>

        <div className="login-card__links">
          <Link href="/">Về storefront</Link>
          <Link href="/products">Xem catalog</Link>
        </div>
      </section>
    </main>
  );
}
