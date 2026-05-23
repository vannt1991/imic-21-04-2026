"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  categoryCreateSchema,
  categoryUpdateSchema,
  readCategoryFormPayload,
} from "@/lib/category-api";

function getRawStringValue(formData, fieldName) {
  const value = formData.get(fieldName);

  return typeof value === "string" ? value : "";
}

function readRawCategoryFormValues(formData) {
  return {
    name: getRawStringValue(formData, "name"),
    slug: getRawStringValue(formData, "slug"),
  };
}

function appendFormValue(searchParams, fieldName, value) {
  if (value === null || value === undefined) {
    return;
  }

  searchParams.set(fieldName, String(value));
}

function appendCategoryFormValues(searchParams, values) {
  appendFormValue(searchParams, "name", values.name);
  appendFormValue(searchParams, "slug", values.slug);
}

function buildFormUrl(pathname, errorMessage, values = null) {
  const searchParams = new URLSearchParams({ error: errorMessage });

  if (values) {
    appendCategoryFormValues(searchParams, values);
  }

  return `${pathname}?${searchParams.toString()}`;
}

function buildCreateFormUrl(errorMessage, values = null) {
  return buildFormUrl("/admin/categories/new", errorMessage, values);
}

function buildEditFormUrl(categoryId, errorMessage, values = null) {
  return buildFormUrl(
    `/admin/categories/${categoryId}/edit`,
    errorMessage,
    values,
  );
}

function buildAdminCategoriesUrl(errorMessage = "") {
  if (!errorMessage) {
    return "/admin/categories";
  }

  const searchParams = new URLSearchParams({ error: errorMessage });

  return `/admin/categories?${searchParams.toString()}`;
}

const missingCategoryMessage = "Category không tồn tại.";

function revalidateCategoryPaths() {
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
}

export async function createCategoryAction(formData) {
  await requireAdminUser({ nextPath: "/admin/categories/new" });

  const rawValues = readRawCategoryFormValues(formData);
  const parsedPayload = categoryCreateSchema.safeParse(
    readCategoryFormPayload(formData),
  );

  if (!parsedPayload.success) {
    redirectToCreateForm(
      parsedPayload.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.",
      rawValues,
    );
  }

  try {
    await db.category.create({
      data: parsedPayload.data,
    });

    revalidateCategoryPaths();
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      redirectToCreateForm("Slug đã tồn tại. Vui lòng chọn slug khác.", rawValues);
    }

    console.error(error);
    redirectToCreateForm(
      "Không thể tạo category lúc này. Vui lòng thử lại.",
      rawValues,
    );
  }

  redirect("/admin/categories");
}

export async function updateCategoryAction(categoryId, formData) {
  await requireAdminUser({ nextPath: `/admin/categories/${categoryId}/edit` });

  const rawValues = readRawCategoryFormValues(formData);
  const parsedPayload = categoryUpdateSchema.safeParse(
    readCategoryFormPayload(formData),
  );

  if (!parsedPayload.success) {
    redirectToEditForm(
      categoryId,
      parsedPayload.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.",
      rawValues,
    );
  }

  try {
    await db.category.update({
      where: { id: categoryId },
      data: parsedPayload.data,
    });

    revalidateCategoryPaths();
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      redirectToEditForm(
        categoryId,
        "Slug đã tồn tại. Vui lòng chọn slug khác.",
        rawValues,
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      redirect(buildAdminCategoriesUrl(missingCategoryMessage));
    }

    console.error(error);
    redirectToEditForm(
      categoryId,
      "Không thể cập nhật category lúc này. Vui lòng thử lại.",
      rawValues,
    );
  }

  redirect("/admin/categories");
}

export async function deleteCategoryAction(categoryId) {
  await requireAdminUser({ nextPath: "/admin/categories" });

  const category = await db.category.findUnique({
    where: { id: categoryId },
    select: {
      id: true,
      _count: {
        select: {
          products: true,
        },
      },
    },
  });

  if (!category) {
    redirect(buildAdminCategoriesUrl(missingCategoryMessage));
  }

  if (category._count.products > 0) {
    redirect(
      buildAdminCategoriesUrl("Không thể xóa category đang có sản phẩm."),
    );
  }

  try {
    await db.category.delete({
      where: { id: categoryId },
    });

    revalidateCategoryPaths();
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      redirect(buildAdminCategoriesUrl(missingCategoryMessage));
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      redirect(
        buildAdminCategoriesUrl("Không thể xóa category đang có sản phẩm."),
      );
    }

    throw error;
  }

  redirect("/admin/categories");
}

function redirectToCreateForm(errorMessage, values = null) {
  redirect(buildCreateFormUrl(errorMessage, values));
}

function redirectToEditForm(categoryId, errorMessage, values = null) {
  redirect(buildEditFormUrl(categoryId, errorMessage, values));
}
