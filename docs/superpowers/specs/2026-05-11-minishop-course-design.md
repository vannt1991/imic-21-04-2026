# MiniShop Course Design

Date: 2026-05-11  
Status: Draft  
Scope: 10-buổi course project cho Next.js App Router, giữ JavaScript, build dần một e-commerce mini-shop full-stack.

## 1. Mục tiêu

Xây một project học React + Next.js theo kiểu "build while learning":

- Có storefront: landing, listing, detail, cart, checkout, order success.
- Có backend: database, REST API, order flow, admin CRUD, auth/protect route.
- Có lộ trình 10 buổi, mỗi buổi là 1 milestone độc lập.
- Có tài liệu giảng dạy đi kèm để dùng trực tiếp khi dạy hoặc tự học.

Project đích: `MiniShop` - cửa hàng sneaker demo. Có thể đổi sang áo thun, mỹ phẩm, hoặc đồ công nghệ nhưng cấu trúc giữ nguyên.

## 2. Ràng buộc

- Giữ JavaScript hiện tại, không migrate sang TypeScript trong phase này.
- Bám Next.js App Router.
- Ưu tiên chạy được trước, tối ưu sau.
- Mỗi milestone phải có output nhìn thấy được trong browser.
- Không mở rộng scope ra ngoài requirement gốc nếu chưa cần.

## 3. Kiến trúc học tập

Course được thiết kế theo 3 lớp:

1. Theory: giải thích khái niệm cốt lõi.
2. Demo: dựng phần chạy được ngay trong buổi học.
3. Practice: bài tập, mở rộng, và checklist tự kiểm tra.

Mỗi milestone đều có 5 phần:

- Mục tiêu buổi học.
- Lý thuyết cần hiểu.
- Demo code trong buổi.
- Thực hành/bài tập.
- Tiêu chí hoàn thành.

Mỗi milestone cũng nên có 1 lớp dạy phụ:

- Speaker notes: câu nói/ý chính để giảng viên dùng khi đứng lớp.
- Quick check: 2-3 câu hỏi chốt xem người học đã hiểu chưa.
- Misconception traps: các hiểu nhầm thường gặp để sửa ngay trên lớp.

## 4. Chọn giải pháp kỹ thuật

Baseline:

- Next.js App Router.
- React 19.
- JavaScript.
- Tailwind CSS nếu project hiện tại đã sẵn hoặc cài ở milestone đầu.
- Prisma cho DB.
- Zod cho validation.
- `localStorage` hoặc Context cho cart giai đoạn đầu.

Lý do:

- App Router phù hợp cho cả UI, route, server component, route handler, server action.
- JS giúp giảm ma sát ban đầu cho người học.
- Prisma giúp course có DB thật mà vẫn type-safe ở tầng query khi chuyển sang phase backend.
- Zod giúp dạy validation rõ ràng, dễ debug.

## 5. Cấu trúc cuối khóa

Target structure:

- `src/app`
- `src/components`
- `src/lib`
- `src/types`
- `prisma`
- `docs`

Route map cuối khóa:

- `/` landing
- `/products` listing
- `/products/[slug]` detail
- `/cart`
- `/checkout`
- `/order-success`
- `/login`
- `/admin`
- `/admin/products`
- `/admin/products/new`
- `/admin/products/[id]/edit`
- `/admin/orders`
- `/admin/orders/[id]`
- `/admin/categories`
- `/api/products`
- `/api/products/[id]`
- `/api/categories`
- `/api/orders`
- `/api/orders/[id]`

## 6. Teaching design

Mỗi buổi học sẽ có tài liệu giảng dạy kèm theo để người học bám được logic:

- Kiến thức chính.
- Từ khóa cần nhớ.
- Mẫu code tối thiểu.
- Lỗi thường gặp.
- Bài tập về nhà.
- Tiêu chí pass.

Nguyên tắc biên soạn:

- Giải thích từ đơn giản đến phức tạp.
- Mỗi concept chỉ gắn 1 ví dụ chính.
- Ưu tiên mô tả data flow hơn là chỉ liệt kê code.
- Nếu có phần khó, viết “vì sao” trước “làm thế nào”.

## 7. Milestone 1 - Buổi 1: Setup + Landing Page

### Mục tiêu

Tạo nền tảng project, hiểu App Router, dựng landing page bán hàng.

### Lý thuyết

- React component là gì: 1 hàm nhận input và trả về UI.
- JSX là gì: viết UI bằng cú pháp gần HTML trong JS.
- Server Component là gì: component render ở server, không có state/event browser.
- App Router là gì: hệ routing theo folder trong `app/`.
- `layout.js` là khung chung, `page.js` là nội dung riêng của route.
- Composition là gì: ghép component nhỏ thành trang lớn.
- Vì sao landing page cần hero, CTA, featured products để dẫn người xem đi tiếp.

### Mini code demo

```jsx
function Greeting({ name }) {
  return <h1>Xin chào {name}</h1>;
}
```

### Code demo gắn với lý thuyết

- `component`: nhận `props` rồi trả UI.

```jsx
function SiteHeader() {
  return <header>MiniShop</header>;
}
```

- `layout.js`: bọc toàn bộ app.

```jsx
export default function RootLayout({ children }) {
  return <html><body>{children}</body></html>;
}
```

- `page.js`: nội dung riêng của route.

```jsx
export default function HomePage() {
  return <main>Landing page</main>;
}
```

### Demo

- Sửa root layout.
- Tạo header, hero, featured section.
- Dựng homepage với nội dung tĩnh.

### Thực hành

- Tách `SiteHeader`.
- Tách `HeroSection`.
- Tạo `FeaturedProducts`.
- Dựng 3 card sản phẩm tĩnh.

### Bài tập

- Thay brand theo ý muốn.
- Chỉnh content hero.
- Làm nav link hoạt động.

### Tiêu chí hoàn thành

- Vào `/` thấy landing page có cấu trúc rõ.
- Có header, hero, CTA, featured products.

### Lesson outline

1. Warm-up: hỏi “1 landing page tốt cần gì để người dùng không thoát ngay?”
2. Concept 1: React component là gì, render ra UI thế nào.
3. Concept 2: `layout.js` và `page.js` trong App Router.
4. Demo: sửa root layout, tạo header, hero, featured section.
5. Checkpoint: giải thích lại luồng render từ layout xuống page.
6. Practice: tách `SiteHeader`, `HeroSection`, `FeaturedProducts`.
7. Review: chỉ ra những phần còn tĩnh và những phần có thể data hóa ở buổi sau.

### Speaker notes

- Mở bài bằng câu hỏi: nếu landing page chỉ có chữ và nút bấm, người dùng có ở lại không?
- Nói component như “viên gạch UI” để người học hình dung đây không phải khái niệm trừu tượng.
- Khi giảng `layout.js`, nhấn mạnh nó là khung bao quanh nhiều trang, giống “vỏ ngoài” của app.
- Khi giảng `page.js`, nói đây là phần nội dung thay đổi theo từng route.
- Dừng lại ở điểm: buổi này chưa cần dữ liệu động, mục tiêu là học cách ghép UI thành trang hoàn chỉnh.
- Nếu học viên hỏi “sao chưa dùng state”, giải thích: chưa cần, vì đây là nền tảng render tĩnh.

## 8. Milestone 2 - Buổi 2: Product Listing Tĩnh

### Mục tiêu

Hiển thị danh sách sản phẩm bằng component, props, map, conditional rendering.

### Lý thuyết

- Props là gì: cách truyền data từ component cha xuống component con.
- Array `map()` là gì: lặp qua mảng để sinh ra nhiều phần tử UI.
- Conditional rendering là gì: render có điều kiện theo data.
- Data model sản phẩm tối thiểu gồm gì: tên, giá, slug, ảnh, trạng thái.
- Vì sao nên tách helper format tiền: tránh lặp logic và giữ UI sạch.
- Badge sale và hết hàng là cách dùng UI để thể hiện trạng thái của data.

### Mini code demo

```jsx
{products.map((product) => (
  <ProductCard key={product.id} product={product} />
))}
```

### Code demo gắn với lý thuyết

- `props`: cha truyền `product` xuống card.

```jsx
function ProductCard({ product }) {
  return <h2>{product.name}</h2>;
}
```

- `conditional rendering`: sale / hết hàng.

```jsx
{product.originalPrice ? <span>Sale</span> : null}
{!product.inStock ? <span>Hết hàng</span> : null}
```

- format tiền: tách helper riêng.

```jsx
function formatVnd(value) {
  return new Intl.NumberFormat("vi-VN").format(value) + "đ";
}
```

### Demo

- Tạo mock data.
- Tạo `ProductCard`.
- Tạo `/products`.

### Thực hành

- Format tiền VND.
- Badge sale nếu có `originalPrice`.
- Badge trạng thái còn hàng/hết hàng.
- Tạo featured products từ cùng data.

### Bài tập

- Thêm filter giả lập bằng state tĩnh.
- Đổi theme card.

### Tiêu chí hoàn thành

- `/products` render đúng danh sách.
- Card hiển thị giá, sale, stock state đúng.

### Lesson outline

1. Warm-up: hỏi “render nhiều sản phẩm bằng cách viết tay hay loop sẽ tốt hơn?”
2. Concept 1: props truyền data từ đâu sang đâu.
3. Concept 2: `map()` biến mảng thành danh sách UI như thế nào.
4. Concept 3: conditional rendering cho sale và hết hàng.
5. Demo: tạo mock data, `ProductCard`, `/products`.
6. Checkpoint: test 1 sản phẩm có sale và 1 sản phẩm hết hàng.
7. Practice: format tiền VND, thêm featured section dùng chung data.
8. Review: nhắc lại khi nào nên tách helper format tiền.

### Speaker notes

- Dẫn vào bằng việc cho học viên nhìn 3 sản phẩm tĩnh, sau đó hỏi: có cách nào viết ít code hơn không?
- Giải thích props là luồng dữ liệu một chiều từ cha xuống con, không phải “biến toàn cục”.
- Khi nói `map()`, nhấn mạnh mục tiêu là sinh UI từ data, không copy-paste card.
- Với conditional rendering, dùng ví dụ sale/hết hàng để học viên thấy UI đổi theo data.
- Chốt bằng thông điệp: khi list tăng từ 3 lên 30 sản phẩm, cách này vẫn giữ code gọn.
- Nếu lớp yếu, nhắc lại format tiền là logic helper chứ không nên viết lặp trong JSX.

## 9. Milestone 3 - Buổi 3: Dynamic Route + Product Detail

### Mục tiêu

Làm trang chi tiết sản phẩm bằng dynamic route.

### Lý thuyết

- Route động là gì: 1 folder dùng biến thay cho tên cố định.
- `[slug]` là gì: phần URL đại diện cho từng sản phẩm.
- `params` là gì: object chứa tham số route hiện tại.
- Vì sao cần `notFound()`: tránh hiển thị trang sai khi data không tồn tại.
- Metadata là gì: title/description cho SEO và preview link.
- SEO cơ bản là gì: giúp trang có title rõ và dễ hiểu với công cụ tìm kiếm.

### Mini code demo

```jsx
export default function Page({ params }) {
  return <h1>Slug: {params.slug}</h1>;
}
```

### Code demo gắn với lý thuyết

- route động: lấy `slug` từ URL.

```jsx
// /products/[slug]/page.js
export default function ProductPage({ params }) {
  return <div>{params.slug}</div>;
}
```

- `notFound()`: chặn slug sai.

```jsx
import { notFound } from "next/navigation";

if (!product) notFound();
```

- metadata động: title theo sản phẩm.

```jsx
export async function generateMetadata({ params }) {
  return { title: `MiniShop - ${params.slug}` };
}
```

### Demo

- Tạo helper `getProductBySlug`.
- Tạo `/products/[slug]`.
- Tạo trang `not-found`.

### Thực hành

- Thêm mô tả chi tiết.
- Thêm sản phẩm liên quan.
- Thêm metadata theo tên sản phẩm.

### Bài tập

- Làm breadcrumb.
- Hiển thị rating giả lập.

### Tiêu chí hoàn thành

- Click từ listing sang detail được.
- Link sai slug trả về not found.

### Lesson outline

1. Warm-up: hỏi “làm sao 1 URL có thể đại diện cho 1 sản phẩm cụ thể?”
2. Concept 1: dynamic route `[slug]` là gì.
3. Concept 2: `params` lấy dữ liệu route như thế nào.
4. Concept 3: `notFound()` xử lý case data không có.
5. Demo: tạo helper `getProductBySlug`, dựng detail page.
6. Checkpoint: thử một slug đúng và một slug sai.
7. Practice: thêm mô tả chi tiết, related products, metadata động.
8. Review: nhấn mạnh detail page là bước nối từ listing sang mua hàng.

### Speaker notes

- Mở bằng câu chuyện URL: mỗi sản phẩm phải có một địa chỉ riêng để share/link/SEO.
- Giải thích `slug` là bản đọc được của tên sản phẩm, không phải id kỹ thuật.
- Khi giảng `params`, nói đây là “gói thông tin” Next đưa cho route hiện tại.
- `notFound()` nên được nói như một nhánh kết thúc hợp lệ, không phải lỗi bất thường.
- Chốt lý do metadata động: title đúng tên sản phẩm giúp preview link và SEO rõ hơn.
- Nếu học viên hỏi “có cần DB mới làm được không”, trả lời: chưa cần, buổi này vẫn có thể lấy mock data để học routing.

## 10. Milestone 4 - Buổi 4: Cart Frontend

### Mục tiêu

Làm giỏ hàng trên client bằng state + context + localStorage.

### Lý thuyết

- Cart là gì: nơi giữ danh sách sản phẩm người dùng muốn mua.
- Vì sao cart cần Client Component: cần state, click handler, `localStorage`.
- `useState` là gì: giữ dữ liệu thay đổi trong component.
- `useEffect` là gì: chạy side effect sau khi render.
- Context API là gì: chia sẻ state cho nhiều component không cần truyền props nhiều tầng.
- `localStorage` là gì: bộ nhớ trên trình duyệt, tồn tại sau khi refresh.
- Phân biệt data server và data browser: server lo data gốc, browser lo tương tác tạm thời.

### Mini code demo

```jsx
const [count, setCount] = useState(0);

useEffect(() => {
  localStorage.setItem("count", String(count));
}, [count]);
```

### Code demo gắn với lý thuyết

- `useState`: giữ cart items.

```jsx
const [items, setItems] = useState([]);
```

- Context: share cart state.

```jsx
const CartContext = createContext(null);
```

- localStorage: persist sau refresh.

```jsx
useEffect(() => {
  localStorage.setItem("cart", JSON.stringify(items));
}, [items]);
```

- add/update/remove: thao tác cơ bản của cart.

```jsx
setItems((current) => [...current, newItem]);
```

### Demo

- Tạo `CartProvider`.
- Tạo `AddToCartButton`.
- Tạo `/cart`.

### Thực hành

- Add/update/remove item.
- Tính tổng tiền.
- Empty state.

### Bài tập

- Thêm nút clear cart.
- Thêm shipping fee giả lập.

### Tiêu chí hoàn thành

- Cart không mất khi reload.
- Tổng tiền và số lượng cập nhật đúng.

### Lesson outline

1. Warm-up: hỏi “giỏ hàng nên sống ở đâu: server, state hay browser?”
2. Concept 1: vì sao cart cần Client Component.
3. Concept 2: `useState` và `useEffect` dùng cho state/persist ra sao.
4. Concept 3: Context API giúp tránh prop drilling như thế nào.
5. Demo: tạo `CartProvider`, `AddToCartButton`, `/cart`.
6. Checkpoint: reload trang và kiểm tra cart còn hay mất.
7. Practice: add/update/remove, total, empty state.
8. Review: phân biệt data tạm thời ở browser với data thật ở server.

### Speaker notes

- Bắt đầu bằng việc hỏi học viên: “Nếu refresh trang mà cart mất, chuyện gì xảy ra với UX?”
- Giải thích rất rõ Server Component và Client Component bằng browser interaction.
- Khi nói `useEffect`, nhấn mạnh đây là chỗ đồng bộ side effect sau render, không phải chỗ tính UI.
- Context API nên được mô tả là “trạm phát state chung” để tránh truyền props qua nhiều tầng.
- Với localStorage, nói đây là lưu tạm ở browser, dùng cho học chứ chưa phải source of truth cuối cùng.
- Chốt: cart buổi này là bản frontend, chưa có backend checkout.

## 11. Milestone 5 - Buổi 5: Database + Prisma

### Mục tiêu

Thiết kế database thật cho product/category/order/user.

### Lý thuyết

- Database là gì: nơi lưu dữ liệu có cấu trúc lâu dài.
- Entity là gì: 1 đối tượng chính như Product, Order, Category.
- Relation là gì: mối liên kết giữa các bảng.
- Foreign key là gì: cột dùng để tham chiếu sang bảng khác.
- One-to-many và many-to-one là gì: 1 danh mục có nhiều sản phẩm, 1 sản phẩm thuộc 1 danh mục.
- Seed là gì: dữ liệu mẫu để dev/test nhanh.
- Prisma Client là gì: lớp query DB bằng JS an toàn hơn SQL thô.
- Migration là gì: lịch sử thay đổi schema.
- Prisma Studio là gì: UI để xem/sửa data trực quan.

### Mini code demo

```prisma
model Product {
  id   String @id @default(cuid())
  name String
}
```

### Code demo gắn với lý thuyết

- entity + relation trong schema.

```prisma
model Category {
  id       String    @id @default(cuid())
  name     String
  products Product[]
}
```

- `db` singleton: tránh tạo nhiều Prisma Client.

```js
import { PrismaClient } from "@prisma/client";

export const db = globalThis.prisma ?? new PrismaClient();
```

- seed: đổ data mẫu.

```js
await db.product.createMany({ data: productsSeed });
```

### Demo

- Cài Prisma.
- Tạo schema.
- Chạy migration.
- Seed danh mục và sản phẩm.

### Thực hành

- Đổi `/products` từ mock data sang database.
- Tạo helper db client.

### Bài tập

- Tạo 10 product thật.
- Tạo 3 category.

### Tiêu chí hoàn thành

- Có DB chạy local.
- Trang products đọc từ DB.

### Lesson outline

1. Warm-up: hỏi “vì sao mock data không đủ khi app bắt đầu có order thật?”
2. Concept 1: database là gì, entity là gì.
3. Concept 2: relation và foreign key là gì.
4. Concept 3: seed/migration/Prisma Client/Studio khác nhau thế nào.
5. Demo: cài Prisma, viết schema, chạy migration, seed data.
6. Checkpoint: mở Prisma Studio và đọc dữ liệu vừa seed.
7. Practice: đổi `/products` từ mock sang DB.
8. Review: chốt mối liên hệ giữa category, product, order.

### Speaker notes

- Mở bằng lý do thực tế: mock data không giữ được khi app cần CRUD và order thật.
- Giảng entity là “bảng/đối tượng chính”, relation là “cách chúng nối với nhau”.
- Khi nói foreign key, dùng ví dụ đơn giản: product phải biết nó thuộc category nào.
- Tách rõ migration và seed: migration đổi cấu trúc, seed đổ dữ liệu mẫu.
- Khi demo Prisma Studio, nhấn mạnh đây là cách nhìn DB gần giống bảng tính để học viên dễ hình dung.
- Chốt: từ buổi này trở đi, dữ liệu không còn nằm trong file JS tĩnh nữa.

## 12. Milestone 6 - Buổi 6: REST API

### Mục tiêu

Viết backend API trong Next.js bằng Route Handlers.

### Lý thuyết

- API là gì: giao diện để frontend hoặc client khác gửi/nhận data.
- Route Handler là gì: file xử lý request ở ngay trong App Router.
- Request/Response Web API là gì: chuẩn nhận input và trả output của HTTP.
- Status code là gì: mã thể hiện kết quả như 200, 201, 400, 404, 500.
- Validation là gì: kiểm tra input trước khi ghi DB.
- Error response nhất quán là gì: mọi lỗi trả cùng cấu trúc để dễ xử lý.
- Vì sao không tin input từ client: dữ liệu có thể sai, thiếu, hoặc bị sửa.

### Mini code demo

```js
export async function GET() {
  return Response.json({ ok: true });
}
```

### Code demo gắn với lý thuyết

- GET list.

```js
export async function GET() {
  const products = await db.product.findMany();
  return Response.json({ products });
}
```

- POST create.

```js
export async function POST(request) {
  const body = await request.json();
  const product = await db.product.create({ data: body });
  return Response.json({ product }, { status: 201 });
}
```

- validation before DB.

```js
const payload = schema.parse(await request.json());
```

### Demo

- `GET /api/products`
- `POST /api/products`
- `GET /api/products/[id]`

### Thực hành

- `PATCH /api/products/[id]`
- `DELETE /api/products/[id]`
- `GET /api/categories`

### Bài tập

- Test bằng curl/Postman/Thunder Client.
- Thêm try/catch chuẩn JSON.

### Tiêu chí hoàn thành

- API CRUD product hoạt động.
- Error case trả JSON rõ.

### Lesson outline

1. Warm-up: hỏi “frontend có thể gọi thẳng DB không?”
2. Concept 1: API là gì, route handler là gì.
3. Concept 2: request/response, status code, validation.
4. Concept 3: vì sao error response phải nhất quán.
5. Demo: viết GET/POST/GET by id cho products.
6. Checkpoint: test một request lỗi để xem JSON trả về.
7. Practice: PATCH, DELETE, categories, try/catch chuẩn.
8. Review: nhấn mạnh validation phải xảy ra trước khi ghi DB.

### Speaker notes

- Bắt đầu bằng câu hỏi: “Nếu 2 frontend khác nhau cùng dùng dữ liệu, có nên copy DB logic vào UI không?”
- Giải thích API như “quầy giao dịch”, client gửi yêu cầu, server trả kết quả.
- Status code nên được giảng bằng ví dụ đời thực: 200 là ổn, 201 là tạo mới, 404 là không thấy.
- Khi nói validation, nhấn mạnh: sai input phải bị chặn trước khi đụng DB.
- Cho học viên thấy 1 error JSON chuẩn để hiểu vì sao frontend dễ xử lý hơn khi API thống nhất format.
- Chốt: route handler là cách Next cho phép viết backend ngay trong app.

## 13. Milestone 7 - Buổi 7: Admin Product CRUD

### Mục tiêu

Làm admin dashboard quản lý sản phẩm.

### Lý thuyết

- Admin dashboard là gì: khu vực quản trị dành cho người có quyền.
- Server Component đọc data vì gì: render dữ liệu sẵn ở server, nhẹ cho browser.
- Server Action là gì: function chạy ở server để xử lý form/mutation.
- Mutation là gì: thao tác làm thay đổi dữ liệu như create/update/delete.
- `revalidatePath()` là gì: báo Next render lại route đã cache.
- `redirect()` là gì: chuyển hướng sau khi thao tác xong.
- Form trên server là gì: form submit trực tiếp vào action thay vì gọi API bằng tay.

### Mini code demo

```js
"use server";

export async function createProduct(formData) {}
```

### Code demo gắn với lý thuyết

- Server Action: mutate ở server.

```js
"use server";

export async function createProduct(formData) {
  await db.product.create({ data: { name: formData.get("name") } });
}
```

- `revalidatePath`: refresh list.

```js
revalidatePath("/admin/products");
revalidatePath("/products");
```

- `redirect`: đi sang trang list sau lưu.

```js
redirect("/admin/products");
```

### Demo

- `admin/layout.js`.
- `admin/products/page.js`.
- `admin/products/new/page.js`.
- `admin/products/actions.js`.

### Thực hành

- Tạo edit form.
- Tạo delete action.
- Confirm trước khi xóa.
- Tạo quản lý category nếu còn thời gian.

### Bài tập

- Bảng products có search đơn giản.
- Hiển thị stock alert.

### Tiêu chí hoàn thành

- Admin tạo/sửa/xóa product được.
- Sau mutation, UI refresh đúng.

### Lesson outline

1. Warm-up: hỏi “vì sao admin CRUD nên làm bằng server action thay vì state local?”
2. Concept 1: admin dashboard là gì.
3. Concept 2: Server Component vs Server Action.
4. Concept 3: `revalidatePath()` và `redirect()` dùng khi nào.
5. Demo: layout admin, list products, form create.
6. Checkpoint: tạo 1 sản phẩm và xem trang list có refresh không.
7. Practice: edit, delete, confirm xóa, category management.
8. Review: chốt khái niệm mutation và invalidation.

### Speaker notes

- Dẫn dắt rằng admin là nơi thay đổi dữ liệu, nên phải ưu tiên luồng server.
- Giải thích Server Action như “form handler ở server” để học viên thấy gần với HTML form truyền thống.
- Với `revalidatePath`, nói đây là cơ chế bắt Next load lại dữ liệu cũ đã bị cache.
- Với `redirect`, nói đây là chốt flow sau khi lưu xong để người dùng không đứng ở trang form cũ.
- Khi demo CRUD, liên tục nhắc: thay đổi ở admin phải phản ánh ngay ở listing.
- Nếu học viên lẫn lộn, nói rõ đây chưa phải auth thật, chỉ là tầng quản trị dữ liệu.

## 14. Milestone 8 - Buổi 8: Checkout + Order

### Mục tiêu

Cho phép đặt hàng và lưu order/order items.

### Lý thuyết

- Checkout flow là gì: bước từ giỏ hàng sang tạo đơn hàng.
- Order là gì: bản ghi xác nhận khách đặt mua hàng.
- Order item là gì: từng dòng sản phẩm trong 1 đơn.
- Tính total ở server vì sao: client có thể sửa dữ liệu giá.
- Transaction là gì: nhóm thao tác phải thành công hoặc thất bại cùng nhau.
- Giảm tồn kho khi tạo order là gì: đảm bảo stock phản ánh đúng số đã bán.
- Vì sao không tin total từ client: total có thể bị chỉnh trên browser.

### Mini code demo

```js
const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
```

### Code demo gắn với lý thuyết

- order total tính từ items.

```js
const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
```

- order + items tạo cùng lúc.

```js
await db.$transaction(async (tx) => {
  const order = await tx.order.create({ data: { total } });
  await tx.orderItem.createMany({ data: items });
  return order;
});
```

- stock decrement.

```js
await tx.product.update({
  where: { id: item.productId },
  data: { stock: { decrement: item.quantity } },
});
```

### Demo

- Tạo `/checkout`.
- Gửi payload từ cart lên API order.
- Tạo order + order items.

### Thực hành

- Validate customer info.
- Clear cart sau khi đặt thành công.
- Redirect sang `/order-success`.

### Bài tập

- Hiển thị mã đơn hàng.
- Hiển thị lỗi hết hàng.

### Tiêu chí hoàn thành

- Order được lưu DB.
- Inventory giảm đúng.

### Lesson outline

1. Warm-up: hỏi “tại sao checkout phải kiểm soát ở server?”
2. Concept 1: checkout flow gồm những bước nào.
3. Concept 2: order, order item, total.
4. Concept 3: transaction và stock decrement.
5. Demo: form checkout, API order, lưu order + items.
6. Checkpoint: thử đặt hàng với số lượng vượt tồn kho.
7. Practice: connect cart, clear cart, redirect success.
8. Review: nhấn mạnh total do server tính, client chỉ gửi intent.

### Speaker notes

- Mở bằng luận điểm quan trọng nhất: giá tiền và stock không được tin từ client.
- Giảng checkout flow như chuỗi bước: nhập thông tin → kiểm tra cart → tính total → lưu order → trừ stock.
- Khi nói transaction, nhấn mạnh đây là “all-or-nothing”, không có chuyện lưu nửa chừng.
- Dùng ví dụ hết hàng để học viên thấy tại sao server phải là nơi quyết định cuối cùng.
- Nếu học viên hỏi “có thể tạo order từ cart local không”, trả lời là có payload, nhưng total và stock vẫn phải kiểm tra ở server.
- Chốt: đây là buổi biến app từ “xem hàng” thành “bán hàng”.

## 15. Milestone 9 - Buổi 9: Auth + Protected Admin + Orders

### Mục tiêu

Bảo vệ admin route và quản lý đơn hàng.

### Lý thuyết

- Authentication là gì: xác minh bạn là ai.
- Authorization là gì: xác định bạn được phép làm gì.
- Role-based access là gì: phân quyền theo vai trò như ADMIN/CUSTOMER.
- Server-side guard là gì: chặn truy cập từ server trước khi render trang.
- Vì sao admin layout nên check quyền: tránh lộ UI và logic quản trị.
- Tại sao không chỉ ẩn nút trong UI: ẩn UI không đồng nghĩa chặn được truy cập.

### Mini code demo

```js
if (!user || user.role !== "ADMIN") {
  redirect("/login");
}
```

### Code demo gắn với lý thuyết

- auth stub: trả user giả lập.

```js
export async function getCurrentUser() {
  return { role: "ADMIN" };
}
```

- guard trong admin layout.

```js
const user = await getCurrentUser();
if (!user || user.role !== "ADMIN") redirect("/login");
```

- update order status.

```js
await db.order.update({
  where: { id },
  data: { status: "SHIPPING" },
});
```

### Demo

- `lib/auth.js` stub.
- Protect `admin/layout.js`.
- `admin/orders/page.js`.

### Thực hành

- Tạo trang chi tiết order.
- Update order status.
- Tạo `/login`.

### Bài tập

- Thử route admin khi không đủ quyền.
- Chỉ admin mới đổi status.

### Tiêu chí hoàn thành

- Admin route được chặn.
- Order management hoạt động.

### Lesson outline

1. Warm-up: hỏi “ẩn menu admin có đủ để bảo vệ admin chưa?”
2. Concept 1: authentication vs authorization.
3. Concept 2: role-based access và server-side guard.
4. Concept 3: vì sao admin layout phải check quyền.
5. Demo: auth stub, protect layout, orders page.
6. Checkpoint: vào `/admin` khi không có quyền thì chuyện gì xảy ra?
7. Practice: detail order, update status, login page.
8. Review: nhắc lại UI hide không phải bảo mật.

### Speaker notes

- Mở bằng câu hỏi để phá nhầm tưởng: hidden UI không đồng nghĩa secure.
- Phân biệt auth và authorization rất chậm, rất basic: ai là gì, được làm gì.
- Khi giảng server-side guard, nói đây là lớp chặn trước khi render chứ không phải chỉ kiểm tra ở client.
- Dùng `redirect('/login')` như ví dụ trực quan cho luồng bảo vệ route.
- Nếu học viên chưa có provider thật, dùng auth stub để họ tập trung vào kiến trúc quyền trước.
- Chốt: đây là buổi đưa “cửa admin” vào trạng thái có kiểm soát.

## 16. Milestone 10 - Buổi 10: Search, Filter, SEO, Deploy

### Mục tiêu

Hoàn thiện app thành bản có thể deploy.

### Lý thuyết

- Search params là gì: tham số nằm trên URL để lọc/tìm kiếm.
- Pagination là gì: chia dữ liệu thành nhiều trang nhỏ.
- Metadata SEO là gì: title/description phục vụ tìm kiếm và chia sẻ link.
- Loading UI là gì: trạng thái chờ dữ liệu.
- Error UI là gì: màn hình khi có lỗi tải dữ liệu.
- Empty state là gì: màn hình khi không có kết quả.
- Build production checklist là gì: danh sách kiểm tra trước khi deploy.

### Mini code demo

```js
const page = Number(searchParams.page || 1);
```

### Code demo gắn với lý thuyết

- search params từ URL.

```jsx
export default async function ProductsPage({ searchParams }) {
  const q = searchParams.q || "";
}
```

- filter / pagination.

```js
const products = await db.product.findMany({
  where: { name: { contains: q, mode: "insensitive" } },
  skip: (page - 1) * 9,
  take: 9,
});
```

- loading / empty / error state.

```jsx
export default function Loading() {
  return <p>Loading...</p>;
}
```

### Demo

- Search/filter products bằng URL.
- Pagination.
- Loading and error states.
- Final build.

### Thực hành

- Responsive polish.
- `loading.js`, `error.js`, `not-found.js`.
- README.

### Bài tập

- Deploy lên Vercel.
- Dùng PostgreSQL production.

### Tiêu chí hoàn thành

- App chạy production build.
- Có đủ SEO và UX states cơ bản.

### Lesson outline

1. Warm-up: hỏi “khi search sản phẩm, dữ liệu nên nằm ở URL hay state nội bộ?”
2. Concept 1: search params, filter, pagination.
3. Concept 2: metadata SEO, loading/error/empty state.
4. Concept 3: checklist deploy và production readiness.
5. Demo: search/filter products, pagination, loading/error states.
6. Checkpoint: thử URL filter và xác nhận kết quả đổi theo URL.
7. Practice: responsive polish, `README`, deploy chuẩn.
8. Review: tổng kết toàn bộ flow của app từ landing đến deploy.

### Speaker notes

- Mở bằng việc cho học viên thấy URL có thể là “source of truth” cho search/filter.
- Giải thích search params là cách chia sẻ trạng thái qua link, dễ bookmark và dễ debug.
- Với loading/error/empty state, nhấn mạnh đây là phần UX bắt buộc chứ không phải trang trí.
- Khi nói metadata SEO, gắn nó với title/description khi share link lên mạng xã hội.
- Dùng checklist deploy để tổng kết: build, data, UI states, README, production DB.
- Chốt buổi này như phần “đóng gói sản phẩm”, không chỉ là thêm tính năng.

## 17. Data model cuối khóa

Entity chính:

- `User`
- `Category`
- `Product`
- `Order`
- `OrderItem`

Quan hệ:

- `Category` có nhiều `Product`.
- `Order` có nhiều `OrderItem`.
- `OrderItem` tham chiếu `Product`.
- `User` có thể liên kết `Order`.

## 18. Reusable helpers

Helpers cần có:

- `money` format VND.
- `slug` helper nếu cần tạo slug thủ công.
- `db` client singleton.
- `products` helper lấy theo slug/id.
- `auth` helper cho admin guard.
- `validation` schema cho product/order.

## 19. Teaching notes

Điểm nhấn khi dạy:

- Luôn bắt đầu bằng data flow: từ UI đi đâu, data từ đâu đến.
- Với App Router, phân biệt rõ server component và client component.
- Với cart, giải thích rõ vì sao localStorage chỉ là tạm thời.
- Với checkout, nhấn mạnh “tính total ở server”.
- Với admin, nhấn mạnh “mutation cần revalidate”.
- Với auth, nhấn mạnh “admin route không được chỉ dựa vào UI hide”.

## 20. Delivery layer

Mỗi buổi nên được trình bày theo format cố định để dễ dạy và dễ học:

1. Open question: mở bằng 1 câu hỏi nền tảng để kích hoạt tư duy.
2. Concept block: giải thích khái niệm mới bằng từ basic nhất.
3. Why block: nói rõ vì sao concept đó cần trong project.
4. Live demo: code trực tiếp một lát cắt nhỏ, chạy được ngay.
5. Checkpoint: dừng lại để người học đoán kết quả hoặc sửa lỗi.
6. Practice: giao bài ngắn, đủ để tự làm lại được.
7. Review: chốt lại bằng checklist và lỗi thường gặp.

Mẫu quick check cho mỗi buổi:

- Buổi 1: Component là gì? `layout.js` khác `page.js` thế nào?
- Buổi 2: Vì sao dùng `map()` để render list? Khi nào hiển thị badge sale?
- Buổi 3: `params.slug` lấy từ đâu? Khi nào cần `notFound()`?
- Buổi 4: Vì sao cart không nên chỉ lưu trong state thường? `localStorage` giải quyết gì?
- Buổi 5: Relation khác entity ở điểm nào? Seed dùng khi nào?
- Buổi 6: Vì sao API phải validate trước khi ghi DB? Status code 404 dùng khi nào?
- Buổi 7: Server Action khác API call truyền thống ở điểm nào? Vì sao cần `revalidatePath()`?
- Buổi 8: Tại sao total phải tính ở server? Transaction giải quyết lỗi gì?
- Buổi 9: Authentication khác authorization thế nào? Vì sao không được chỉ hide nút admin?
- Buổi 10: Search params dùng để làm gì? Empty state khác error state ra sao?

## 21. Implementation backlog

Backlog theo milestone:

1. Milestone 1: cleanup shell + landing.
2. Milestone 2: product data + card + listing.
3. Milestone 3: dynamic product detail + not found + metadata.
4. Milestone 4: cart state + provider + cart page.
5. Milestone 5: Prisma schema + seed + DB read.
6. Milestone 6: API routes + validation + errors.
7. Milestone 7: admin CRUD + server actions.
8. Milestone 8: checkout + order flow + transaction.
9. Milestone 9: auth guard + order admin.
10. Milestone 10: filter/search/SEO/deploy.

## 22. Acceptance criteria cho spec

Spec này đạt nếu:

- Chia đúng 10 milestone, mỗi milestone tương ứng 1 buổi.
- Có cả phần kỹ thuật lẫn phần giảng dạy.
- Không ép TypeScript.
- Có đủ route, data model, API, và flow giảng dạy để bắt đầu lập plan triển khai.
