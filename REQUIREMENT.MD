Khung 10 buổi một project e-commerce hoàn chỉnh, có cả storefront, admin, database, API/backend, checkout giả lập và deploy.

Dưới đây là lộ trình 10 buổi học React + Next.js App Router cho một ứng dụng bán hàng hoàn chỉnh, có cả frontend + backend + database + admin + checkout.
Project cuối khóa đề xuất: MiniShop — ứng dụng bán giày / áo thun / mỹ phẩm / đồ công nghệ
Mình sẽ lấy ví dụ là cửa hàng bán giày sneaker, nhưng bạn có thể đổi sang sản phẩm khác rất dễ.
Next.js App Router phù hợp với kiểu project này vì có thể làm cả storefront, dashboard admin, backend API bằng Route Handlers, Server Components, Server Actions, metadata SEO và protected routes trong cùng một codebase. App Router dùng cấu trúc app/, hỗ trợ layout, routing, Server Components và Client Components. Route Handlers trong app cho phép tạo các endpoint backend như GET, POST, PUT, DELETE mà không cần tách server riêng.


Tổng quan project cuối khóa
Tên ứng dụng
MiniShop - Sneaker Store
Người dùng cuối có thể
- Xem landing page
- Xem danh sách sản phẩm
- Tìm kiếm sản phẩm
- Lọc theo danh mục, giá, trạng thái còn hàng
- Xem chi tiết sản phẩm
- Thêm sản phẩm vào giỏ hàng
- Cập nhật số lượng trong giỏ
- Xóa sản phẩm khỏi giỏ
- Checkout đơn hàng
- Xem trạng thái đơn hàng
Admin có thể
- Đăng nhập admin
- Xem dashboard
- Quản lý sản phẩm
- Tạo/sửa/xóa sản phẩm
- Quản lý danh mục
- Xem danh sách đơn hàng
- Cập nhật trạng thái đơn hàng
- Xem doanh thu cơ bản
Backend cần có
- Database
- API products
- API categories
- API cart hoặc cart local/session
- API orders
- Auth admin
- Validation
- Upload ảnh sản phẩm hoặc dùng image URL
- Protected admin routes

Tech stack khuyến nghị
Frontend:
- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui hoặc custom UI

Backend:
- Next.js Route Handlers
- Server Actions
- Prisma ORM
- PostgreSQL production
- SQLite khi học local

Auth:
- Auth.js hoặc custom admin auth đơn giản

Validation:
- Zod

Deploy:
- Vercel
- PostgreSQL: Neon / Supabase / Prisma Postgres
Prisma phù hợp vì có Prisma Client để query type-safe, Prisma Migrate để quản lý migration, và Prisma Studio để xem/sửa dữ liệu trực quan. Auth.js có thể dùng trong Server Components, Route Handlers, Middleware và API Routes của Next.js sau khi khởi tạo trong auth.ts.

Buổi 1 — Setup project + landing page bán hàng
Level: Beginner
 Mục tiêu: Tạo project Next.js, hiểu cấu trúc App Router, dựng giao diện landing page.
Kiến thức chính
- React component
- JSX
- Props
- Next.js app directory
- page.tsx
- layout.tsx
- Tailwind CSS
- Component composition
Cấu trúc ban đầu
minishop/
 app/
   layout.tsx
   page.tsx
   globals.css
 components/
   site-header.tsx
   hero-section.tsx
   product-card.tsx
Demo
Tạo project:
npx create-next-app@latest minishop
cd minishop
npm run dev
Tạo layout chính:
// app/layout.tsx
import "./globals.css";

export const metadata = {
 title: "MiniShop - Sneaker Store",
 description: "Cửa hàng sneaker hiện đại xây bằng Next.js",
};

export default function RootLayout({
 children,
}: {
 children: React.ReactNode;
}) {
 return (
   <html lang="vi">
     <body>
       <header className="border-b px-6 py-4">
         <div className="mx-auto flex max-w-6xl items-center justify-between">
           <h1 className="text-xl font-bold">MiniShop</h1>

           <nav className="flex gap-4 text-sm">
             <a href="/">Trang chủ</a>
             <a href="/products">Sản phẩm</a>
             <a href="/cart">Giỏ hàng</a>
           </nav>
         </div>
       </header>

       <main>{children}</main>
     </body>
   </html>
 );
}
Tạo landing page:
// app/page.tsx
export default function HomePage() {
 return (
   <section className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:grid-cols-2">
     <div className="space-y-6">
       <p className="text-sm font-medium uppercase text-gray-500">
         New Collection 2026
       </p>

       <h1 className="text-5xl font-bold leading-tight">
         Sneaker hiện đại cho phong cách mỗi ngày
       </h1>

       <p className="text-gray-600">
         Khám phá các mẫu sneaker mới nhất, dễ phối đồ, giá tốt và giao hàng
         nhanh toàn quốc.
       </p>

       <a
         href="/products"
         className="inline-block rounded bg-black px-5 py-3 text-white"
       >
         Xem sản phẩm
       </a>
     </div>

     <div className="rounded-3xl bg-gray-100 p-10">
       <div className="flex h-80 items-center justify-center rounded-2xl bg-white text-2xl font-bold">
         Sneaker Image
       </div>
     </div>
   </section>
 );
}
Bài tập
- Tạo component SiteHeader
- Tạo component HeroSection
- Tạo section “Sản phẩm nổi bật”
- Tạo 3 card sản phẩm tĩnh
Kết quả sau buổi 1
Có landing page đầu tiên cho cửa hàng.

Buổi 2 — Product listing bằng React component
Level: Beginner
 Mục tiêu: Hiển thị danh sách sản phẩm bằng component, props, map, conditional rendering.
Kiến thức chính
- Props
- TypeScript type
- Array map
- Conditional rendering
- Product card
- Badge giảm giá / hết hàng
Data mẫu
// lib/mock-products.ts
export type Product = {
 id: string;
 name: string;
 slug: string;
 price: number;
 originalPrice?: number;
 image: string;
 category: string;
 inStock: boolean;
};

export const products: Product[] = [
 {
   id: "1",
   name: "Air Runner Basic",
   slug: "air-runner-basic",
   price: 1290000,
   originalPrice: 1590000,
   image: "/placeholder-shoe.png",
   category: "Running",
   inStock: true,
 },
 {
   id: "2",
   name: "Street Flex Pro",
   slug: "street-flex-pro",
   price: 1890000,
   image: "/placeholder-shoe.png",
   category: "Lifestyle",
   inStock: true,
 },
 {
   id: "3",
   name: "Court Classic White",
   slug: "court-classic-white",
   price: 990000,
   image: "/placeholder-shoe.png",
   category: "Classic",
   inStock: false,
 },
];
Product card
// components/product-card.tsx
import Link from "next/link";
import type { Product } from "@/lib/mock-products";

type ProductCardProps = {
 product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
 return (
   <Link
     href={`/products/${product.slug}`}
     className="group rounded-2xl border p-4 transition hover:shadow-md"
   >
     <div className="mb-4 flex h-52 items-center justify-center rounded-xl bg-gray-100">
       <span className="text-sm text-gray-500">Product Image</span>
     </div>

     <div className="space-y-2">
       <p className="text-xs uppercase text-gray-500">{product.category}</p>

       <h2 className="font-semibold group-hover:underline">
         {product.name}
       </h2>

       <div className="flex items-center gap-2">
         <p className="font-bold">{product.price.toLocaleString("vi-VN")}đ</p>

         {product.originalPrice && (
           <p className="text-sm text-gray-400 line-through">
             {product.originalPrice.toLocaleString("vi-VN")}đ
           </p>
         )}
       </div>

       {!product.inStock && (
         <span className="inline-block rounded bg-gray-200 px-2 py-1 text-xs">
           Hết hàng
         </span>
       )}
     </div>
   </Link>
 );
}
Product listing page
// app/products/page.tsx
import { ProductCard } from "@/components/product-card";
import { products } from "@/lib/mock-products";

export default function ProductsPage() {
 return (
   <div className="mx-auto max-w-6xl px-6 py-10">
     <h1 className="mb-6 text-3xl font-bold">Tất cả sản phẩm</h1>

     <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
       {products.map((product) => (
         <ProductCard key={product.id} product={product} />
       ))}
     </div>
   </div>
 );
}
Bài tập
- Thêm format tiền VND bằng helper function
- Thêm badge “Sale” nếu có originalPrice
- Thêm trạng thái “Còn hàng” / “Hết hàng”
- Tạo section sản phẩm nổi bật ở homepage
Kết quả sau buổi 2
Có trang danh sách sản phẩm tĩnh hoàn chỉnh.

Buổi 3 — Routing sản phẩm + trang chi tiết sản phẩm
Level: Beginner → Intermediate
 Mục tiêu: Làm dynamic route /products/[slug].
Kiến thức chính
- Dynamic route
- params
- notFound()
- Link navigation
- Product detail page
- SEO metadata theo sản phẩm
Next.js App Router hỗ trợ routing bằng folder trong app, dynamic segment như [slug], layout lồng nhau và các route đặc biệt như loading.tsx, error.tsx, not-found.tsx.
Helper lấy sản phẩm
// lib/products.ts
import { products } from "./mock-products";

export function getProductBySlug(slug: string) {
 return products.find((product) => product.slug === slug);
}
Trang chi tiết
// app/products/[slug]/page.tsx
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/products";

type ProductDetailPageProps = {
 params: Promise<{
   slug: string;
 }>;
};

export default async function ProductDetailPage({
 params,
}: ProductDetailPageProps) {
 const { slug } = await params;
 const product = getProductBySlug(slug);

 if (!product) {
   notFound();
 }

 return (
   <div className="mx-auto grid max-w-6xl gap-10 px-6 py-10 md:grid-cols-2">
     <div className="flex h-[420px] items-center justify-center rounded-3xl bg-gray-100">
       Product Image
     </div>

     <div className="space-y-5">
       <p className="text-sm uppercase text-gray-500">{product.category}</p>

       <h1 className="text-4xl font-bold">{product.name}</h1>

       <p className="text-2xl font-bold">
         {product.price.toLocaleString("vi-VN")}đ
       </p>

       <p className="text-gray-600">
         Một đôi sneaker nhẹ, êm, dễ phối đồ và phù hợp cho sử dụng hằng ngày.
       </p>

       <button
         disabled={!product.inStock}
         className="rounded bg-black px-5 py-3 text-white disabled:bg-gray-300"
       >
         {product.inStock ? "Thêm vào giỏ hàng" : "Hết hàng"}
       </button>
     </div>
   </div>
 );
}
Bài tập
- Tạo not-found.tsx cho sản phẩm không tồn tại
- Thêm phần mô tả chi tiết
- Thêm section “Sản phẩm liên quan”
- Tạo metadata động theo tên sản phẩm
Kết quả sau buổi 3
Có flow: landing → danh sách sản phẩm → chi tiết sản phẩm.

Buổi 4 — Giỏ hàng phía frontend
Level: Intermediate
 Mục tiêu: Làm cart bằng Client Component, state, localStorage hoặc Context.
Kiến thức chính
- "use client"
- useState
- useEffect
- Context API
- localStorage
- Add to cart
- Update quantity
- Remove item
Trong Next.js App Router, Server Components là mặc định; Client Components cần dùng khi có state, event handler, browser API như localStorage.
Cart type
// types/cart.ts
export type CartItem = {
 productId: string;
 name: string;
 price: number;
 image: string;
 quantity: number;
};
Cart provider
// components/cart-provider.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { CartItem } from "@/types/cart";

type CartContextValue = {
 items: CartItem[];
 addItem: (item: Omit<CartItem, "quantity">) => void;
 removeItem: (productId: string) => void;
 updateQuantity: (productId: string, quantity: number) => void;
 total: number;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
 const [items, setItems] = useState<CartItem[]>([]);

 useEffect(() => {
   const raw = localStorage.getItem("minishop-cart");
   if (raw) {
     setItems(JSON.parse(raw));
   }
 }, []);

 useEffect(() => {
   localStorage.setItem("minishop-cart", JSON.stringify(items));
 }, [items]);

 function addItem(item: Omit<CartItem, "quantity">) {
   setItems((currentItems) => {
     const existingItem = currentItems.find(
       (cartItem) => cartItem.productId === item.productId
     );

     if (existingItem) {
       return currentItems.map((cartItem) =>
         cartItem.productId === item.productId
           ? { ...cartItem, quantity: cartItem.quantity + 1 }
           : cartItem
       );
     }

     return [...currentItems, { ...item, quantity: 1 }];
   });
 }

 function removeItem(productId: string) {
   setItems((currentItems) =>
     currentItems.filter((item) => item.productId !== productId)
   );
 }

 function updateQuantity(productId: string, quantity: number) {
   if (quantity <= 0) {
     removeItem(productId);
     return;
   }

   setItems((currentItems) =>
     currentItems.map((item) =>
       item.productId === productId ? { ...item, quantity } : item
     )
   );
 }

 const total = items.reduce(
   (sum, item) => sum + item.price * item.quantity,
   0
 );

 return (
   <CartContext.Provider
     value={{ items, addItem, removeItem, updateQuantity, total }}
   >
     {children}
   </CartContext.Provider>
 );
}

export function useCart() {
 const value = useContext(CartContext);

 if (!value) {
   throw new Error("useCart must be used inside CartProvider");
 }

 return value;
}
Bài tập
- Bọc CartProvider trong layout
- Tạo nút AddToCartButton
- Tạo trang /cart
- Tính tổng tiền
- Cập nhật số lượng
- Xóa sản phẩm khỏi giỏ
Kết quả sau buổi 4
Có giỏ hàng frontend hoạt động.

Buổi 5 — Database schema cho e-commerce
Level: Intermediate
 Mục tiêu: Thiết kế database thật cho sản phẩm, danh mục, user, order.
Kiến thức chính
- Database design
- Prisma schema
- Relation
- Migration
- Seed data
- Query database trong Server Component
Database model đề xuất
// prisma/schema.prisma
model User {
 id        String   @id @default(cuid())
 name      String?
 email     String   @unique
 role      String   @default("CUSTOMER")
 orders    Order[]
 createdAt DateTime @default(now())
 updatedAt DateTime @updatedAt
}

model Category {
 id        String    @id @default(cuid())
 name      String
 slug      String    @unique
 products  Product[]
 createdAt DateTime  @default(now())
 updatedAt DateTime  @updatedAt
}

model Product {
 id          String      @id @default(cuid())
 name        String
 slug        String      @unique
 description String?
 price       Int
 image       String?
 stock       Int         @default(0)
 isFeatured  Boolean     @default(false)
 isActive    Boolean     @default(true)
 categoryId  String
 category    Category    @relation(fields: [categoryId], references: [id])
 orderItems  OrderItem[]
 createdAt   DateTime    @default(now())
 updatedAt   DateTime    @updatedAt
}

model Order {
 id              String      @id @default(cuid())
 userId          String?
 user            User?       @relation(fields: [userId], references: [id])
 customerName    String
 customerEmail   String
 customerPhone   String
 shippingAddress String
 status          String      @default("PENDING")
 total           Int
 items           OrderItem[]
 createdAt       DateTime    @default(now())
 updatedAt       DateTime    @updatedAt
}

model OrderItem {
 id        String  @id @default(cuid())
 orderId   String
 order     Order   @relation(fields: [orderId], references: [id])
 productId String
 product   Product @relation(fields: [productId], references: [id])
 quantity  Int
 price     Int
}
Prisma client
// lib/db.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
 prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
 globalForPrisma.prisma = db;
}
Bài tập
- Cài Prisma
- Tạo schema
- Chạy migration
- Tạo seed data 10 sản phẩm, 3 danh mục
- Đổi trang /products từ mock data sang database
Kết quả sau buổi 5
App đã có database thật.

Buổi 6 — Backend API với Route Handlers
Level: Intermediate
 Mục tiêu: Xây backend REST API trong Next.js.
Kiến thức chính
- Route Handlers
- GET /api/products
- POST /api/products
- GET /api/products/[id]
- PATCH /api/products/[id]
- DELETE /api/products/[id]
- Request body
- Response JSON
- Validation với Zod
Route Handlers dùng Web Request và Response API, nằm trong app directory và là cách tạo request handler trong App Router.
API lấy danh sách sản phẩm
// app/api/products/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
 const products = await db.product.findMany({
   where: {
     isActive: true,
   },
   include: {
     category: true,
   },
   orderBy: {
     createdAt: "desc",
   },
 });

 return NextResponse.json({ products });
}
API tạo sản phẩm
// app/api/products/route.ts
import { z } from "zod";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const createProductSchema = z.object({
 name: z.string().min(3),
 slug: z.string().min(3),
 description: z.string().optional(),
 price: z.number().int().positive(),
 stock: z.number().int().min(0),
 categoryId: z.string().min(1),
 image: z.string().optional(),
});

export async function POST(request: Request) {
 const body = await request.json();
 const payload = createProductSchema.parse(body);

 const product = await db.product.create({
   data: payload,
 });

 return NextResponse.json({ product }, { status: 201 });
}
API chi tiết sản phẩm
// app/api/products/[id]/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type RouteContext = {
 params: Promise<{
   id: string;
 }>;
};

export async function GET(_request: Request, context: RouteContext) {
 const { id } = await context.params;

 const product = await db.product.findUnique({
   where: { id },
   include: { category: true },
 });

 if (!product) {
   return NextResponse.json(
     { message: "Product not found" },
     { status: 404 }
   );
 }

 return NextResponse.json({ product });
}
Bài tập
- Tạo API categories
- Tạo API update product
- Tạo API delete product
- Thêm try/catch trả lỗi JSON rõ ràng
- Test API bằng Postman, Thunder Client hoặc curl
Kết quả sau buổi 6
Có backend API thật cho sản phẩm và danh mục.

Buổi 7 — Admin dashboard quản lý sản phẩm
Level: Intermediate → Advanced
 Mục tiêu: Làm giao diện admin CRUD sản phẩm.
Kiến thức chính
- Admin layout
- Server Component đọc data
- Form tạo sản phẩm
- Server Actions
- revalidatePath
- redirect
- Validation
Server Actions phù hợp cho form mutation như tạo/sửa/xóa dữ liệu trên server mà không nhất thiết phải gọi API từ client. Next.js cũng có cấu hình bảo vệ Server Actions theo origin để giảm rủi ro CSRF khi gọi action.
Cấu trúc admin
app/
 admin/
   layout.tsx
   page.tsx
   products/
     page.tsx
     new/
       page.tsx
     [id]/
       edit/
         page.tsx
     actions.ts
   orders/
     page.tsx
Admin layout
// app/admin/layout.tsx
import Link from "next/link";

export default function AdminLayout({
 children,
}: {
 children: React.ReactNode;
}) {
 return (
   <div className="grid min-h-screen grid-cols-[240px_1fr]">
     <aside className="border-r p-6">
       <h1 className="mb-6 text-xl font-bold">MiniShop Admin</h1>

       <nav className="space-y-3 text-sm">
         <Link className="block" href="/admin">
           Dashboard
         </Link>
         <Link className="block" href="/admin/products">
           Products
         </Link>
         <Link className="block" href="/admin/orders">
           Orders
         </Link>
       </nav>
     </aside>

     <main className="p-8">{children}</main>
   </div>
 );
}
Server Action tạo product
// app/admin/products/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";

const productSchema = z.object({
 name: z.string().min(3, "Tên sản phẩm phải có ít nhất 3 ký tự"),
 slug: z.string().min(3, "Slug phải có ít nhất 3 ký tự"),
 price: z.coerce.number().int().positive("Giá phải lớn hơn 0"),
 stock: z.coerce.number().int().min(0, "Tồn kho không được âm"),
 categoryId: z.string().min(1, "Vui lòng chọn danh mục"),
 description: z.string().optional(),
 image: z.string().optional(),
});

export async function createProduct(formData: FormData) {
 const payload = productSchema.parse({
   name: formData.get("name"),
   slug: formData.get("slug"),
   price: formData.get("price"),
   stock: formData.get("stock"),
   categoryId: formData.get("categoryId"),
   description: formData.get("description"),
   image: formData.get("image"),
 });

 await db.product.create({
   data: payload,
 });

 revalidatePath("/admin/products");
 revalidatePath("/products");

 redirect("/admin/products");
}
Form tạo product
// app/admin/products/new/page.tsx
import { createProduct } from "../actions";
import { db } from "@/lib/db";

export default async function NewProductPage() {
 const categories = await db.category.findMany();

 return (
   <div className="max-w-2xl space-y-6">
     <h1 className="text-2xl font-bold">Tạo sản phẩm mới</h1>

     <form action={createProduct} className="space-y-4">
       <input
         name="name"
         className="w-full rounded border px-3 py-2"
         placeholder="Tên sản phẩm"
       />

       <input
         name="slug"
         className="w-full rounded border px-3 py-2"
         placeholder="slug-san-pham"
       />

       <textarea
         name="description"
         className="w-full rounded border px-3 py-2"
         placeholder="Mô tả"
       />

       <input
         name="price"
         type="number"
         className="w-full rounded border px-3 py-2"
         placeholder="Giá"
       />

       <input
         name="stock"
         type="number"
         className="w-full rounded border px-3 py-2"
         placeholder="Tồn kho"
       />

       <select name="categoryId" className="w-full rounded border px-3 py-2">
         <option value="">Chọn danh mục</option>
         {categories.map((category) => (
           <option key={category.id} value={category.id}>
             {category.name}
           </option>
         ))}
       </select>

       <input
         name="image"
         className="w-full rounded border px-3 py-2"
         placeholder="Image URL"
       />

       <button className="rounded bg-black px-4 py-2 text-white">
         Lưu sản phẩm
       </button>
     </form>
   </div>
 );
}
Bài tập
- Tạo bảng danh sách sản phẩm trong admin
- Tạo edit product
- Tạo delete product
- Thêm confirm trước khi xóa
- Tạo quản lý category
Kết quả sau buổi 7
Admin có thể quản lý sản phẩm.

Buổi 8 — Checkout + tạo đơn hàng
Level: Advanced
 Mục tiêu: Người dùng có thể đặt hàng, backend lưu order và order items.
Kiến thức chính
- Checkout form
- Validate thông tin khách hàng
- Tạo order
- Tạo order items
- Tính total phía server
- Giảm tồn kho
- Transaction
Checkout page
// app/checkout/page.tsx
export default function CheckoutPage() {
 return (
   <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 md:grid-cols-[1fr_360px]">
     <form className="space-y-4">
       <h1 className="text-2xl font-bold">Thông tin giao hàng</h1>

       <input
         name="customerName"
         className="w-full rounded border px-3 py-2"
         placeholder="Họ và tên"
       />

       <input
         name="customerEmail"
         type="email"
         className="w-full rounded border px-3 py-2"
         placeholder="Email"
       />

       <input
         name="customerPhone"
         className="w-full rounded border px-3 py-2"
         placeholder="Số điện thoại"
       />

       <textarea
         name="shippingAddress"
         className="w-full rounded border px-3 py-2"
         placeholder="Địa chỉ giao hàng"
       />

       <button className="rounded bg-black px-5 py-3 text-white">
         Đặt hàng
       </button>
     </form>

     <aside className="rounded-2xl border p-5">
       <h2 className="mb-4 font-semibold">Tóm tắt đơn hàng</h2>
       <p className="text-sm text-gray-600">
         Danh sách sản phẩm sẽ lấy từ giỏ hàng.
       </p>
     </aside>
   </div>
 );
}
API tạo order
Vì giỏ hàng đang nằm ở client/localStorage, checkout có thể gửi payload lên API:
// app/api/orders/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const orderSchema = z.object({
 customerName: z.string().min(2),
 customerEmail: z.string().email(),
 customerPhone: z.string().min(8),
 shippingAddress: z.string().min(10),
 items: z.array(
   z.object({
     productId: z.string(),
     quantity: z.number().int().positive(),
   })
 ),
});

export async function POST(request: Request) {
 const body = await request.json();
 const payload = orderSchema.parse(body);

 const productIds = payload.items.map((item) => item.productId);

 const products = await db.product.findMany({
   where: {
     id: {
       in: productIds,
     },
     isActive: true,
   },
 });

 const total = payload.items.reduce((sum, item) => {
   const product = products.find((p) => p.id === item.productId);

   if (!product) {
     throw new Error("Product not found");
   }

   if (product.stock < item.quantity) {
     throw new Error(`Product ${product.name} is out of stock`);
   }

   return sum + product.price * item.quantity;
 }, 0);

 const order = await db.$transaction(async (tx) => {
   const createdOrder = await tx.order.create({
     data: {
       customerName: payload.customerName,
       customerEmail: payload.customerEmail,
       customerPhone: payload.customerPhone,
       shippingAddress: payload.shippingAddress,
       total,
       items: {
         create: payload.items.map((item) => {
           const product = products.find((p) => p.id === item.productId)!;

           return {
             productId: item.productId,
             quantity: item.quantity,
             price: product.price,
           };
         }),
       },
     },
     include: {
       items: true,
     },
   });

   for (const item of payload.items) {
     await tx.product.update({
       where: { id: item.productId },
       data: {
         stock: {
           decrement: item.quantity,
         },
       },
     });
   }

   return createdOrder;
 });

 return NextResponse.json({ order }, { status: 201 });
}
Bài tập
- Kết nối checkout form với cart context
- Gửi order lên /api/orders
- Sau khi đặt hàng thành công, clear cart
- Redirect sang /order-success
- Hiển thị mã đơn hàng
- Validate hết hàng phía server
Kết quả sau buổi 8
Người dùng có thể đặt hàng, backend lưu đơn hàng.

Buổi 9 — Auth admin + protected routes + quản lý đơn hàng
Level: Advanced
 Mục tiêu: Bảo vệ trang admin và quản lý đơn hàng.
Kiến thức chính
- Authentication
- Authorization
- Role admin/customer
- Protected layout
- Middleware hoặc server-side guard
- Update order status
Next.js docs chia authentication thành các phần như xác thực người dùng, quản lý session và authorization để bảo vệ tài nguyên. Auth.js hỗ trợ nhiều provider, session và có thể dùng với nhiều loại database.
Auth giả lập cho giai đoạn học
// lib/auth.ts
export async function getCurrentUser() {
 return {
   id: "admin_1",
   name: "Admin",
   email: "admin@minishop.test",
   role: "ADMIN",
 };
}

export async function requireAdmin() {
 const user = await getCurrentUser();

 if (!user || user.role !== "ADMIN") {
   throw new Error("Unauthorized");
 }

 return user;
}
Protect admin layout
// app/admin/layout.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminLayout({
 children,
}: {
 children: React.ReactNode;
}) {
 const user = await getCurrentUser();

 if (!user || user.role !== "ADMIN") {
   redirect("/login");
 }

 return (
   <div className="grid min-h-screen grid-cols-[240px_1fr]">
     <aside className="border-r p-6">
       <h1 className="mb-6 text-xl font-bold">MiniShop Admin</h1>

       <nav className="space-y-3 text-sm">
         <Link className="block" href="/admin">
           Dashboard
         </Link>
         <Link className="block" href="/admin/products">
           Products
         </Link>
         <Link className="block" href="/admin/orders">
           Orders
         </Link>
       </nav>
     </aside>

     <main className="p-8">{children}</main>
   </div>
 );
}
Admin order page
// app/admin/orders/page.tsx
import { db } from "@/lib/db";

export default async function AdminOrdersPage() {
 const orders = await db.order.findMany({
   include: {
     items: {
       include: {
         product: true,
       },
     },
   },
   orderBy: {
     createdAt: "desc",
   },
 });

 return (
   <div className="space-y-6">
     <h1 className="text-2xl font-bold">Đơn hàng</h1>

     <div className="overflow-hidden rounded-2xl border">
       <table className="w-full text-sm">
         <thead className="bg-gray-50 text-left">
           <tr>
             <th className="p-3">Khách hàng</th>
             <th className="p-3">Tổng tiền</th>
             <th className="p-3">Trạng thái</th>
             <th className="p-3">Ngày tạo</th>
           </tr>
         </thead>

         <tbody>
           {orders.map((order) => (
             <tr key={order.id} className="border-t">
               <td className="p-3">
                 <p className="font-medium">{order.customerName}</p>
                 <p className="text-gray-500">{order.customerEmail}</p>
               </td>
               <td className="p-3">
                 {order.total.toLocaleString("vi-VN")}đ
               </td>
               <td className="p-3">{order.status}</td>
               <td className="p-3">
                 {order.createdAt.toLocaleDateString("vi-VN")}
               </td>
             </tr>
           ))}
         </tbody>
       </table>
     </div>
   </div>
 );
}
Bài tập
- Tạo trang chi tiết đơn hàng
- Tạo action updateOrderStatus
- Các trạng thái: PENDING, PAID, SHIPPING, COMPLETED, CANCELLED
- Chỉ admin được cập nhật trạng thái
- Tạo trang /login
- Nâng cấp auth giả lập sang Auth.js hoặc Clerk
Kết quả sau buổi 9
Admin được bảo vệ và có thể quản lý đơn hàng.

Buổi 10 — Search/filter/pagination, SEO, deploy production
Level: Advanced
 Mục tiêu: Hoàn thiện app thành sản phẩm có thể deploy.
Kiến thức chính
- Search params
- Product filtering
- Pagination
- Metadata SEO
- Loading UI
- Error UI
- Empty state
- Build production
- Deploy
Filter sản phẩm bằng URL
Ví dụ URL:
/products?q=air&category=running&minPrice=500000&maxPrice=2000000&page=1
Product page có search/filter
// app/products/page.tsx
import { db } from "@/lib/db";
import { ProductCard } from "@/components/product-card";

type ProductsPageProps = {
 searchParams: Promise<{
   q?: string;
   category?: string;
   minPrice?: string;
   maxPrice?: string;
   page?: string;
 }>;
};

export default async function ProductsPage({
 searchParams,
}: ProductsPageProps) {
 const params = await searchParams;

 const page = Number(params.page || 1);
 const pageSize = 9;

 const products = await db.product.findMany({
   where: {
     isActive: true,
     name: params.q
       ? {
           contains: params.q,
           mode: "insensitive",
         }
       : undefined,
     category: params.category
       ? {
           slug: params.category,
         }
       : undefined,
     price: {
       gte: params.minPrice ? Number(params.minPrice) : undefined,
       lte: params.maxPrice ? Number(params.maxPrice) : undefined,
     },
   },
   include: {
     category: true,
   },
   orderBy: {
     createdAt: "desc",
   },
   skip: (page - 1) * pageSize,
   take: pageSize,
 });

 return (
   <div className="mx-auto max-w-6xl px-6 py-10">
     <div className="mb-8 flex items-end justify-between">
       <div>
         <h1 className="text-3xl font-bold">Sản phẩm</h1>
         <p className="text-gray-600">
           Tìm đôi sneaker phù hợp với phong cách của bạn.
         </p>
       </div>
     </div>

     {products.length === 0 ? (
       <div className="rounded-2xl border p-10 text-center">
         Không tìm thấy sản phẩm phù hợp.
       </div>
     ) : (
       <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
         {products.map((product) => (
           <ProductCard key={product.id} product={product} />
         ))}
       </div>
     )}
   </div>
 );
}
Production checklist
Frontend:
✅ Landing page
✅ Product listing
✅ Product detail
✅ Cart
✅ Checkout
✅ Order success
✅ Search/filter/pagination
✅ Responsive UI
✅ Loading UI
✅ Error UI
✅ Empty state

Backend:
✅ Database schema
✅ Product API
✅ Category API
✅ Order API
✅ Admin product CRUD
✅ Admin order management
✅ Validation
✅ Transaction khi tạo order
✅ Protected admin route

Production:
✅ Metadata SEO
✅ Environment variables
✅ Build thành công
✅ Seed data
✅ Deploy
✅ README
Bài tập cuối khóa
- Hoàn thiện UI responsive
- Thêm loading.tsx cho products/admin/orders
- Thêm error.tsx
- Thêm not-found.tsx
- Deploy lên Vercel
- Dùng PostgreSQL production
- Viết README
Kết quả sau buổi 10
Bạn có một ứng dụng bán hàng full-stack hoàn chỉnh.

Cấu trúc thư mục cuối khóa
minishop/
 app/
   layout.tsx
   page.tsx
   globals.css

   products/
     page.tsx
     loading.tsx
     [slug]/
       page.tsx
       not-found.tsx

   cart/
     page.tsx

   checkout/
     page.tsx

   order-success/
     page.tsx

   login/
     page.tsx

   admin/
     layout.tsx
     page.tsx

     products/
       page.tsx
       actions.ts
       new/
         page.tsx
       [id]/
         edit/
           page.tsx

     categories/
       page.tsx
       actions.ts

     orders/
       page.tsx
       [id]/
         page.tsx
       actions.ts

   api/
     products/
       route.ts
       [id]/
         route.ts

     categories/
       route.ts

     orders/
       route.ts
       [id]/
         route.ts

 components/
   site-header.tsx
   site-footer.tsx
   product-card.tsx
   product-grid.tsx
   product-filter.tsx
   add-to-cart-button.tsx
   cart-provider.tsx
   cart-item-row.tsx
   checkout-form.tsx
   admin-sidebar.tsx
   admin-product-form.tsx
   order-status-badge.tsx

 lib/
   db.ts
   auth.ts
   money.ts
   slug.ts
   validations.ts
   products.ts
   orders.ts

 types/
   cart.ts
   product.ts
   order.ts

 prisma/
   schema.prisma
   seed.ts

Roadmap tính năng theo từng giai đoạn
Giai đoạn 1 — Storefront cơ bản
Buổi 1:
- Landing page
- Header
- Hero
- Featured products

Buổi 2:
- Product card
- Product listing
- Product status

Buổi 3:
- Product detail
- Dynamic route
- notFound
Giai đoạn 2 — Shopping flow
Buổi 4:
- Cart context
- Add to cart
- Update quantity
- Remove item

Buổi 8:
- Checkout
- Create order
- Clear cart
- Order success
Giai đoạn 3 — Backend/admin
Buổi 5:
- Database
- Prisma schema
- Seed data

Buổi 6:
- REST API
- Route handlers
- Validation

Buổi 7:
- Admin dashboard
- Product CRUD
- Category CRUD

Buổi 9:
- Auth admin
- Protected routes
- Order management
Giai đoạn 4 — Production
Buổi 10:
- Search
- Filter
- Pagination
- SEO
- Loading/error UI
- Deploy

Thứ tự học khuyến nghị
1. React component
2. Props
3. List rendering
4. Conditional rendering
5. Client Component
6. Cart state
7. Next.js routing
8. Dynamic route
9. Server Component
10. Database
11. Route Handlers
12. Server Actions
13. Admin CRUD
14. Checkout/order transaction
15. Auth/protected routes
16. Search/filter/pagination
17. SEO/deploy

Database entities cần hiểu
User:
- Đại diện người dùng hoặc admin

Category:
- Danh mục sản phẩm

Product:
- Sản phẩm bán trên shop

Order:
- Đơn hàng

OrderItem:
- Dòng sản phẩm trong đơn hàng
Quan hệ chính:
Category 1 - n Product
User 1 - n Order
Order 1 - n OrderItem
Product 1 - n OrderItem

API endpoints nên có
Products:
GET    /api/products
POST   /api/products
GET    /api/products/:id
PATCH  /api/products/:id
DELETE /api/products/:id

Categories:
GET    /api/categories
POST   /api/categories
PATCH  /api/categories/:id
DELETE /api/categories/:id

Orders:
GET    /api/orders
POST   /api/orders
GET    /api/orders/:id
PATCH  /api/orders/:id/status

Server Actions nên có
Product actions:
- createProduct
- updateProduct
- deleteProduct

Category actions:
- createCategory
- updateCategory
- deleteCategory

Order actions:
- updateOrderStatus
- cancelOrder
Dùng Route Handlers khi cần endpoint backend public/private để client hoặc bên thứ ba gọi. Dùng Server Actions khi xử lý form trực tiếp trong Next.js, ví dụ form tạo sản phẩm trong admin.

Bài tốt nghiệp cuối khóa
Tên project
MiniShop - Full-stack E-commerce App
Yêu cầu frontend
✅ Landing page
✅ Header/footer
✅ Product listing
✅ Product detail
✅ Search product
✅ Filter category
✅ Filter price
✅ Cart
✅ Checkout
✅ Order success
✅ Responsive mobile/tablet/desktop
Yêu cầu backend
✅ Database thật
✅ Product CRUD
✅ Category CRUD
✅ Order creation
✅ Order management
✅ Server-side validation
✅ Transaction khi tạo order
✅ Tồn kho giảm sau khi đặt hàng
✅ Admin protected route
Yêu cầu admin
✅ Login admin
✅ Dashboard overview
✅ Quản lý sản phẩm
✅ Quản lý danh mục
✅ Quản lý đơn hàng
✅ Cập nhật trạng thái đơn hàng
Yêu cầu production
✅ Metadata SEO
✅ loading.tsx
✅ error.tsx
✅ not-found.tsx
✅ Environment variables
✅ Build không lỗi
✅ Deploy được
✅ README rõ ràng

Gợi ý chia thời lượng mỗi buổi
Mỗi buổi khoảng 2–3 tiếng:
30 phút: lý thuyết
60–90 phút: live coding
30–45 phút: bài tập
15 phút: review code
Sau 10 buổi, người học sẽ có một project đủ dùng để đưa vào portfolio: một website bán hàng full-stack với frontend, backend, database, admin và checkout flow hoàn chỉnh.

