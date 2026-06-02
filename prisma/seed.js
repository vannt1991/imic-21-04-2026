import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const categories = [
  { slug: "running", name: "Running" },
  { slug: "lifestyle", name: "Lifestyle" },
  { slug: "outdoor", name: "Outdoor" },
];

const products = [
  {
    name: "Nike Air Zoom Pegasus 39",
    slug: "nike-air-zoom-pegasus-39",
    description:
      "Đôi giày chạy bộ đa năng với thiết kế thoáng khí và đệm êm ái, phù hợp cho cả người mới bắt đầu và vận động viên chuyên nghiệp.",
    badge: "Best seller",
    originalPrice: 2500000,
    price: 2000000,
    image: null,
    note: "Đây là sản phẩm bán chạy nhất của chúng tôi, được nhiều khách hàng yêu thích vì sự thoải mái và độ bền cao.",
    stock: 10,
    featured: true,
    categorySlug: "running",
  },
  {
    name: "Adidas Ultraboost 22",
    slug: "adidas-ultraboost-22",
    description:
      "Đôi giày chạy bộ cao cấp với công nghệ Boost mang lại sự phản hồi năng lượng tuyệt vời và thiết kế thời trang.",
    badge: "New arrival",
    originalPrice: 3000000,
    price: 2800000,
    image: null,
    note: "Sản phẩm mới ra mắt với thiết kế hiện đại và công nghệ tiên tiến, mang đến trải nghiệm chạy bộ tuyệt vời.",
    stock: 15,
    featured: true,
    categorySlug: "running",
  },
  {
    name: "Salomon Speedcross 5",
    slug: "salomon-speedcross-5",
    description:
      "Đôi giày chạy trail với độ bám tuyệt vời và thiết kế chắc chắn, lý tưởng cho những địa hình khó khăn.",
    badge: "Top rated",
    originalPrice: 3500000,
    price: 3200000,
    image: null,
    note: "Được đánh giá cao bởi cộng đồng chạy trail, sản phẩm này mang lại sự ổn định và độ bám vượt trội trên mọi địa hình.",
    stock: 8,
    featured: true,
    categorySlug: "outdoor",
  },
  {
    name: "Puma RS-X3",
    slug: "puma-rs-x3",
    description:
      "Đôi giày lifestyle với thiết kế retro và màu sắc nổi bật, phù hợp cho những ai yêu thích phong cách thời trang đường phố.",
    badge: "On sale",
    originalPrice: 2000000,
    price: 1500000,
    image: null,
    note: "Sản phẩm đang được giảm giá, là lựa chọn hoàn hảo cho những ai muốn sở hữu một đôi giày thời trang với mức giá hợp lý.",
    stock: 20,
    featured: false,
    categorySlug: "lifestyle",
  },
  {
    name: "New Balance 990v5",
    slug: "new-balance-990v5",
    description:
      "Đôi giày lifestyle với thiết kế cổ điển và chất liệu cao cấp, mang lại sự thoải mái và phong cách vượt thời gian.",
    badge: null,
    originalPrice: 2500000,
    price: 2500000,
    image: null,
    note: "Sản phẩm này là biểu tượng của sự kết hợp giữa phong cách cổ điển và chất lượng cao, phù hợp cho những ai yêu thích sự đơn giản nhưng tinh tế.",
    stock: 12,
    featured: false,
    categorySlug: "lifestyle",
  },
];

async function main() {
  console.log("Cleaning database...");
  db.orderItem.deleteMany();
  db.order.deleteMany();
  db.product.deleteMany();
  db.category.deleteMany();
  db.user.deleteMany();

  console.log("Seeding database...");
  for (const category of categories) {
    await db.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
  }

  for (const product of products) {
    const categorySlug = product.categorySlug;
    delete product.categorySlug;
    await db.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: {
        ...product,
        category: {
          connect: { slug: categorySlug },
        },
      },
    });
  }

  console.log("Database seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    db.$disconnect();
  });
