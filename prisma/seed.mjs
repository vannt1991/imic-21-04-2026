import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/passwords.js";

if (!process.env.DATABASE_URL) {
  const envPath = path.resolve(".env");
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, "utf8");
    const match = envFile.match(/^DATABASE_URL=(["']?)(.+)\1$/m);
    if (match) {
      process.env.DATABASE_URL = match[2];
    }
  }
}

const db = new PrismaClient();

const categories = [
  { slug: "running", name: "Running" },
  { slug: "lifestyle", name: "Lifestyle" },
  { slug: "outdoor", name: "Outdoor" },
];

const products = [
  {
    slug: "air-runner-basic",
    name: "Air Runner Basic",
    categorySlug: "running",
    description: "Mẫu sneaker gọn nhẹ, phù hợp cho buổi học đầu tiên.",
    price: 1290000,
    originalPrice: 1490000,
    image: null,
    badge: "Bestseller",
    note: "Dễ phối đồ",
    stock: 12,
    featured: true,
    isActive: true,
  },
  {
    slug: "street-flex-pro",
    name: "Street Flex Pro",
    categorySlug: "lifestyle",
    description: "Thiết kế nổi bật hơn, hợp với phong cách streetwear.",
    price: 1890000,
    originalPrice: null,
    image: null,
    badge: "New",
    note: "Phối outfit nhanh",
    stock: 9,
    featured: true,
    isActive: true,
  },
  {
    slug: "court-classic-white",
    name: "Court Classic White",
    categorySlug: "lifestyle",
    description: "Một đôi basic sạch, đơn giản, dễ dùng hằng ngày.",
    price: 990000,
    originalPrice: 1190000,
    image: null,
    badge: "Sale",
    note: "Giá dễ tiếp cận",
    stock: 16,
    featured: true,
    isActive: true,
  },
  {
    slug: "trail-guard-mid",
    name: "Trail Guard Mid",
    categorySlug: "outdoor",
    description: "Bản mid-top chắc chân cho những buổi đi bộ cuối tuần.",
    price: 1590000,
    originalPrice: null,
    image: null,
    badge: "Sold out",
    note: "Hết hàng tạm thời",
    stock: 0,
    featured: false,
    isActive: true,
  },
  {
    slug: "sprint-core-grey",
    name: "Sprint Core Grey",
    categorySlug: "running",
    description: "Dòng chạy bộ cơ bản cho học viên cần một ví dụ mới.",
    price: 1190000,
    originalPrice: null,
    image: null,
    badge: "Core",
    note: "Nhẹ, dễ dùng",
    stock: 11,
    featured: false,
    isActive: true,
  },
  {
    slug: "urban-flow-black",
    name: "Urban Flow Black",
    categorySlug: "lifestyle",
    description: "Tông đen tối giản cho layout sản phẩm thêm đa dạng.",
    price: 1390000,
    originalPrice: 1690000,
    image: null,
    badge: "Sale",
    note: "Phối nhanh với mọi outfit",
    stock: 8,
    featured: false,
    isActive: true,
  },
  {
    slug: "trail-peak-olive",
    name: "Trail Peak Olive",
    categorySlug: "outdoor",
    description: "Mẫu outdoor để demo category khác với lifestyle/running.",
    price: 1790000,
    originalPrice: null,
    image: null,
    badge: "Trail",
    note: "Đế bám tốt",
    stock: 6,
    featured: false,
    isActive: true,
  },
  {
    slug: "retro-court-navy",
    name: "Retro Court Navy",
    categorySlug: "lifestyle",
    description: "Phong cách retro, hợp để minh họa product detail.",
    price: 1490000,
    originalPrice: 1790000,
    image: null,
    badge: "Retro",
    note: "Phối đồ cổ điển",
    stock: 7,
    featured: false,
    isActive: true,
  },
  {
    slug: "flex-knit-sand",
    name: "Flex Knit Sand",
    categorySlug: "running",
    description: "Upper knit mềm, nhẹ, hợp demo material khác nhau.",
    price: 1590000,
    originalPrice: null,
    image: null,
    badge: "Knit",
    note: "Thoáng khí",
    stock: 10,
    featured: false,
    isActive: true,
  },
  {
    slug: "metro-lace-white",
    name: "Metro Lace White",
    categorySlug: "lifestyle",
    description: "Một sản phẩm trắng cơ bản để lấp đầy catalog seed.",
    price: 1090000,
    originalPrice: null,
    image: null,
    badge: "Basic",
    note: "Dễ phối, dễ dạy",
    stock: 14,
    featured: false,
    isActive: true,
  },
];

const users = [
  {
    name: "MiniShop Admin",
    email: "admin@minishop.local",
    password: "admin123",
    role: "ADMIN",
  },
  {
    name: "MiniShop Customer",
    email: "customer@minishop.local",
    password: "customer123",
    role: "CUSTOMER",
  },
];

async function main() {
  await db.session.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.product.deleteMany();
  await db.category.deleteMany();
  await db.user.deleteMany();

  await db.category.createMany({ data: categories });

  const categoryRows = await db.category.findMany({
    select: { id: true, slug: true },
  });
  const categoryMap = new Map(
    categoryRows.map((category) => [category.slug, category.id]),
  );

  await db.product.createMany({
    data: products.map(({ categorySlug, ...product }) => ({
      ...product,
      categoryId: categoryMap.get(categorySlug),
    })),
  });

  await db.user.createMany({
    data: await Promise.all(
      users.map(async ({ password, ...user }) => ({
        ...user,
        passwordHash: await hashPassword(password),
      })),
    ),
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
