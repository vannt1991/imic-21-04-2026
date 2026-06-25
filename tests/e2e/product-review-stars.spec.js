import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

test.afterAll(async () => {
  await db.$disconnect();
});

test("eligible customer can preview stars before click and then publish the review", async ({
  page,
}) => {
  const user = await db.user.findUnique({
    where: { email: "customer@minishop.local" },
  });
  const product = await db.product.findUnique({
    where: { slug: "air-runner-basic" },
  });

  await db.order.create({
    data: {
      customerName: "MiniShop Customer",
      customerEmail: "customer@minishop.local",
      customerPhone: "0900000000",
      shippingAddress: "123 Review Street",
      userId: user.id,
      total: product.price,
      items: {
        create: [
          {
            productId: product.id,
            quantity: 1,
            price: product.price,
          },
        ],
      },
    },
  });

  await db.productReview.upsert({
    where: {
      userId_productId: {
        userId: user.id,
        productId: product.id,
      },
    },
    update: {
      rating: 5,
      comment: "hang tot, moi nguoi nen mua nhe!",
    },
    create: {
      productId: product.id,
      userId: user.id,
      rating: 5,
      comment: "hang tot, moi nguoi nen mua nhe!",
    },
  });

  await page.goto("/login?next=/products/air-runner-basic");
  await page.getByLabel("Email").fill("customer@minishop.local");
  await page.getByLabel("Mật khẩu").fill("customer123");
  await page.getByRole("button", { name: "Đăng nhập" }).click();

  await expect(page).toHaveURL("/products/air-runner-basic");

  const star3 = page.getByRole("button", { name: "Chon 3 sao" });
  const star4 = page.getByRole("button", { name: "Chon 4 sao" });

  await star3.hover();
  await expect(page.getByText("3 sao", { exact: true })).toBeVisible();

  await star4.click();
  await expect(page.getByText("4 sao", { exact: true })).toBeVisible();

  await page
    .getByLabel("Binh luan")
    .fill("Mang di hoc on, de phoi do va di rat em chan.");
  await page.getByRole("button", { name: "Gui danh gia" }).click();

  await expect(page.getByText("Da cap nhat danh gia cua ban.")).toBeVisible();
  await expect(page.getByText("4/5", { exact: true })).toBeVisible();
  await expect(page.getByText("4 sao", { exact: true })).toBeVisible();
});
