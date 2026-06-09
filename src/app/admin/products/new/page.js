import { AdminProductForm } from "@/components/admin-product-form";
import { getAdminCategories } from "@/lib/admin-products";
import { createProductAction } from "../actions";

export const metadata = {
  title: "MiniShop Admin | New Product",
  description: "Tạo sản phẩm mới cho MiniShop.",
};

function readStringParam(params, key) {
  return typeof params?.[key] === "string" ? params[key] : "";
}

function readBooleanParam(params, key, fallback) {
  if (typeof params?.[key] !== "string") {
    return fallback;
  }

  return params[key] === "true";
}

export default async function NewAdminProductPage({ searchParams }) {
  const categories = await getAdminCategories();
  const params = await searchParams;
  const errorMessage = readStringParam(params, "error");
  const hasCategories = categories.length > 0;
  const initialValues = {
    name: readStringParam(params, "name"),
    slug: readStringParam(params, "slug"),
    description: readStringParam(params, "description"),
    price: readStringParam(params, "price"),
    originalPrice: readStringParam(params, "originalPrice"),
    image: readStringParam(params, "image"),
    badge: readStringParam(params, "badge"),
    note: readStringParam(params, "note"),
    stock: readStringParam(params, "stock"),
    featured: readBooleanParam(params, "featured", false),
    isActive: readBooleanParam(params, "isActive", true),
    categorySlug: readStringParam(params, "categorySlug"),
  };

  return (
    <AdminProductForm
      action={createProductAction}
      categories={categories}
      initialValues={initialValues}
      title="Tạo sản phẩm mới"
      description={
        hasCategories
          ? "Form này submit trực tiếp vào Server Action rồi revalidate storefront và admin list."
          : "Cần có ít nhất một category trước khi tạo sản phẩm mới."
      }
      submitLabel={hasCategories ? "Lưu sản phẩm" : "Chưa thể tạo sản phẩm"}
      errorMessage={
        errorMessage ||
        (!hasCategories
          ? "Không có category khả dụng. Hãy tạo hoặc seed category trước."
          : "")
      }
      submitDisabled={!hasCategories}
    />
  );
}
