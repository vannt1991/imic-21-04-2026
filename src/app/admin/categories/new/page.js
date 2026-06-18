import { AdminCategoryForm } from "@/components/admin-category-form";
import { requireAdminUser } from "@/lib/auth";
import { createCategoryAction } from "../actions";

export const metadata = {
  title: "MiniShop Admin | New Category",
  description: "Tạo category mới cho MiniShop.",
};

function readStringParam(params, key) {
  return typeof params?.[key] === "string" ? params[key] : "";
}

export default async function NewAdminCategoryPage({ searchParams }) {
  await requireAdminUser({ nextPath: "/admin/categories/new" });
  const params = await searchParams;
  const errorMessage = readStringParam(params, "error");

  return (
    <AdminCategoryForm
      action={createCategoryAction}
      initialValues={{
        name: readStringParam(params, "name"),
        slug: readStringParam(params, "slug"),
      }}
      title="Tạo category mới"
      description="Form này submit trực tiếp vào Server Action rồi revalidate admin list và product forms."
      submitLabel="Lưu category"
      errorMessage={errorMessage}
    />
  );
}
