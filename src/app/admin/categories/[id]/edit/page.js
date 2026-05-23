import { notFound } from "next/navigation";
import { AdminCategoryForm } from "@/components/admin-category-form";
import { getAdminCategoryById } from "@/lib/admin-categories";
import { toCategoryFormValues } from "@/lib/category-api";
import { requireAdminUser } from "@/lib/auth";
import { updateCategoryAction } from "../../actions";

export const metadata = {
  title: "MiniShop Admin | Edit Category",
  description: "Chỉnh sửa category trong MiniShop admin.",
};

function readStringParam(params, key) {
  return typeof params?.[key] === "string" ? params[key] : "";
}

export default async function EditAdminCategoryPage({ params, searchParams }) {
  const { id } = await params;
  await requireAdminUser({ nextPath: `/admin/categories/${id}/edit` });
  const resolvedSearchParams = await searchParams;
  const category = await getAdminCategoryById(id);

  if (!category) {
    notFound();
  }

  const errorMessage = readStringParam(resolvedSearchParams, "error");
  const hasRecoveredValues =
    typeof resolvedSearchParams?.name === "string" ||
    typeof resolvedSearchParams?.slug === "string";

  return (
    <AdminCategoryForm
      action={updateCategoryAction.bind(null, category.id)}
      initialValues={
        hasRecoveredValues
          ? {
              name: readStringParam(resolvedSearchParams, "name"),
              slug: readStringParam(resolvedSearchParams, "slug"),
            }
          : toCategoryFormValues(category)
      }
      title={`Sửa: ${category.name}`}
      description="Sau khi lưu, admin category list và product forms sẽ được revalidate."
      submitLabel="Cập nhật category"
      errorMessage={errorMessage}
    />
  );
}
