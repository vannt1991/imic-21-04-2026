import { notFound } from "next/navigation";
import { AdminProductForm } from "@/components/admin-product-form";
import { toProductFormValues } from "@/lib/admin-product-form";
import {
  getAdminCategories,
  getAdminProductById,
} from "@/lib/admin-products";
import { updateProductAction } from "../../actions";

export const metadata = {
  title: "MiniShop Admin | Edit Product",
  description: "Chỉnh sửa sản phẩm trong MiniShop admin.",
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

export default async function EditAdminProductPage({ params, searchParams }) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const [product, categories] = await Promise.all([
    getAdminProductById(id),
    getAdminCategories(),
  ]);

  if (!product) {
    notFound();
  }

  const errorMessage = readStringParam(resolvedSearchParams, "error");
  const recoveredValues = {
    name: readStringParam(resolvedSearchParams, "name"),
    slug: readStringParam(resolvedSearchParams, "slug"),
    description: readStringParam(resolvedSearchParams, "description"),
    price: readStringParam(resolvedSearchParams, "price"),
    originalPrice: readStringParam(resolvedSearchParams, "originalPrice"),
    image: readStringParam(resolvedSearchParams, "image"),
    badge: readStringParam(resolvedSearchParams, "badge"),
    note: readStringParam(resolvedSearchParams, "note"),
    stock: readStringParam(resolvedSearchParams, "stock"),
    featured: readBooleanParam(resolvedSearchParams, "featured", false),
    isActive: readBooleanParam(resolvedSearchParams, "isActive", true),
    categorySlug: readStringParam(resolvedSearchParams, "categorySlug"),
  };
  const hasRecoveredValues = Object.keys(recoveredValues).some((key) => {
    const value = recoveredValues[key];

    return typeof value === "boolean" ? resolvedSearchParams?.[key] : value !== "";
  });

  return (
    <AdminProductForm
      action={updateProductAction.bind(null, product.id)}
      categories={categories}
      initialValues={
        hasRecoveredValues
          ? recoveredValues
          : toProductFormValues({
              ...product,
              categorySlug: product.category.slug,
            })
      }
      title={`Sửa: ${product.name}`}
      description="Sau khi lưu, admin list và storefront sẽ được revalidate."
      submitLabel="Cập nhật sản phẩm"
      errorMessage={errorMessage}
    />
  );
}
