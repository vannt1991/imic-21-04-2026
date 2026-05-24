import { expect, test } from "@playwright/test";

test("anonymous users are redirected to login before admin", async ({
  page,
}) => {
  await page.goto("/admin");

  await expect(page).toHaveURL(/\/login\?next=%2Fadmin$/);
  await expect(
    page.getByRole("heading", { name: "Đăng nhập bằng tài khoản thật" }),
  ).toBeVisible();
});

test("admin can log in and reach the dashboard", async ({ page }) => {
  await page.goto("/login?next=/admin");
  await page.getByLabel("Email").fill("admin@minishop.local");
  await page.getByLabel("Mật khẩu").fill("admin123");
  await page.getByRole("button", { name: "Đăng nhập" }).click();

  await expect(page).toHaveURL("/admin");
  await expect(
    page.getByRole("heading", {
      name: "Quản lý MiniShop bằng route guard phía server",
    }),
  ).toBeVisible();
});

test("catalog search and checkout happy path still work", async ({ page }) => {
  await page.goto("/products?q=air");

  await expect(
    page.getByRole("heading", { name: "Air Runner Basic" }),
  ).toBeVisible();

  await page
    .getByRole("link", { name: "Xem chi tiết Air Runner Basic" })
    .click();
  await page.getByRole("button", { name: "Thêm vào giỏ" }).click();
  await page.getByRole("link", { name: "Mở giỏ hàng" }).click();

  await expect(page).toHaveURL("/cart");
  await page.getByRole("link", { name: "Tiến hành checkout" }).click();

  await page.getByLabel("Họ tên").fill("Smoke Test");
  await page.getByLabel("Email").fill("smoke@example.com");
  await page.getByLabel("Số điện thoại").fill("0900000000");
  await page.getByLabel("Địa chỉ giao hàng").fill("123 Smoke Street");
  await page.getByRole("button", { name: "Đặt hàng" }).click();

  await expect(page).toHaveURL(/\/order-success\?orderId=/);
  await expect(page.getByText("Mã tham chiếu từ URL")).toBeVisible();
});
