import Link from "next/link";
import { loginAction } from "@/app/login/actions";
import { getCurrentUser, sanitizeNextPath } from "@/lib/auth";

export const metadata = {
  title: "MiniShop | Login",
  description: "Email/password login page for MiniShop session auth.",
};

function readStringParam(params, key) {
  return typeof params?.[key] === "string" ? params[key] : "";
}

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const currentUser = await getCurrentUser();
  const nextPath = sanitizeNextPath(readStringParam(params, "next") || "/admin");
  const errorMessage = readStringParam(params, "error");
  const email = readStringParam(params, "email");

  return (
    <main className="login-page site-shell">
      <section className="login-card">
        <p className="login-card__eyebrow">Real session auth</p>
        <h1>Đăng nhập bằng tài khoản thật</h1>
        <p className="login-card__description">
          Buổi 11 dùng user trong database, hash password, và session cookie
          phía server thay cho role cookie stub.
        </p>

        {currentUser ? (
          <p className="login-card__session" role="status">
            Phiên hiện tại: <strong>{currentUser.name ?? currentUser.email}</strong>{" "}
            ({currentUser.role})
          </p>
        ) : null}

        {errorMessage ? (
          <p className="login-card__session" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <form action={loginAction} className="login-form">
          <input type="hidden" name="next" value={nextPath} />

          <label className="login-field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              defaultValue={email}
              required
              autoComplete="email"
            />
          </label>

          <label className="login-field">
            <span>Mật khẩu</span>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
            />
          </label>

          <button type="submit" className="button button--primary">
            Đăng nhập
          </button>
        </form>

        <div className="login-card__hint">
          <p>Tài khoản seed để demo:</p>
          <p>admin@minishop.local / admin123</p>
          <p>customer@minishop.local / customer123</p>
        </div>

        <div className="login-card__links">
          <Link href="/">Về storefront</Link>
          <Link href="/products">Xem catalog</Link>
        </div>
      </section>
    </main>
  );
}
