"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { readProductFormPayload } from "@/lib/admin-product-form";
import {
  productCreateSchema,
  productUpdateSchema,
  toProductCreateData,
  toProductUpdateData,
} from "@/lib/product-api";

function getRawStringValue(formData, fieldName) {
  const value = formData.get(fieldName);

  return typeof value === "string" ? value : "";
}

function readRawProductFormValues(formData) {
  return {
    name: getRawStringValue(formData, "name"),
    slug: getRawStringValue(formData, "slug"),
    description: getRawStringValue(formData, "description"),
    price: getRawStringValue(formData, "price"),
    originalPrice: getRawStringValue(formData, "originalPrice"),
    image: getRawStringValue(formData, "image"),
    badge: getRawStringValue(formData, "badge"),
    note: getRawStringValue(formData, "note"),
    stock: getRawStringValue(formData, "stock"),
    featured: formData.has("featured"),
    isActive: formData.has("isActive"),
    categorySlug: getRawStringValue(formData, "categorySlug"),
  };
}

async function resolveCategoryId(categorySlug, client = db) {
  const category = await client.category.findUnique({
    where: { slug: categorySlug },
    select: { id: true },
  });

  if (!category) {
    throw new Error("Category not found.");
  }

  return category.id;
}

function revalidateProductPaths(nextSlug, previousSlug = null) {
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin/products");

  if (previousSlug) {
    revalidatePath(`/products/${previousSlug}`);
  }

  if (nextSlug) {
    revalidatePath(`/products/${nextSlug}`);
  }
}

function redirectToCreateForm(errorMessage, values = null) {
  redirect(buildCreateFormUrl(errorMessage, values));
}

function redirectToEditForm(productId, errorMessage, values = null) {
  redirect(buildEditFormUrl(productId, errorMessage, values));
}

function appendFormValue(searchParams, fieldName, value) {
  if (value === null || value === undefined) {
    return;
  }

  searchParams.set(fieldName, String(value));
}

function appendProductFormValues(searchParams, values) {
  appendFormValue(searchParams, "name", values.name);
  appendFormValue(searchParams, "slug", values.slug);
  appendFormValue(searchParams, "description", values.description);
  appendFormValue(searchParams, "price", values.price);
  appendFormValue(searchParams, "originalPrice", values.originalPrice);
  appendFormValue(searchParams, "image", values.image);
  appendFormValue(searchParams, "badge", values.badge);
  appendFormValue(searchParams, "note", values.note);
  appendFormValue(searchParams, "stock", values.stock);
  appendFormValue(searchParams, "featured", values.featured);
  appendFormValue(searchParams, "isActive", values.isActive);
  appendFormValue(searchParams, "categorySlug", values.categorySlug);
}

function buildFormUrl(pathname, errorMessage, values = null) {
  const searchParams = new URLSearchParams({ error: errorMessage });

  if (values) {
    appendProductFormValues(searchParams, values);
  }

  return `${pathname}?${searchParams.toString()}`;
}

function buildCreateFormUrl(errorMessage, values = null) {
  return buildFormUrl("/admin/products/new", errorMessage, values);
}

function buildEditFormUrl(productId, errorMessage, values = null) {
  return buildFormUrl(
    `/admin/products/${productId}/edit`,
    errorMessage,
    values,
  );
}

function buildAdminProductsUrl(errorMessage = "") {
  if (!errorMessage) {
    return "/admin/products";
  }

  const searchParams = new URLSearchParams({ error: errorMessage });

  return `/admin/products?${searchParams.toString()}`;
}

export async function createProductAction(formData) {
  await requireAdminUser({ nextPath: "/admin/products/new" });

  const rawValues = readRawProductFormValues(formData);
  const parsedPayload = productCreateSchema.safeParse(
    readProductFormPayload(formData),
  );

  if (!parsedPayload.success) {
    redirectToCreateForm(
      parsedPayload.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.",
      rawValues,
    );
  }

  let redirectUrl = null;

  try {
    const categoryId = await resolveCategoryId(parsedPayload.data.categorySlug);
    const product = await db.product.create({
      data: toProductCreateData(parsedPayload.data, categoryId),
    });

    revalidateProductPaths(product.slug);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      redirectUrl = buildCreateFormUrl(
        "Slug đã tồn tại. Vui lòng chọn slug khác.",
        rawValues,
      );
    } else if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      redirectUrl = buildCreateFormUrl(
        "Category không còn tồn tại. Vui lòng chọn lại.",
        rawValues,
      );
    } else if (
      error instanceof Error &&
      error.message === "Category not found."
    ) {
      redirectUrl = buildCreateFormUrl(
        "Category không còn tồn tại. Vui lòng chọn lại.",
        rawValues,
      );
    } else {
      console.error(error);
      redirectUrl = buildCreateFormUrl(
        "Không thể tạo sản phẩm lúc này. Vui lòng thử lại.",
        rawValues,
      );
    }
  }

  if (redirectUrl) {
    redirect(redirectUrl);
  }

  redirect("/admin/products");
}

export async function updateProductAction(productId, formData) {
  await requireAdminUser({ nextPath: `/admin/products/${productId}/edit` });

  const rawValues = readRawProductFormValues(formData);
  const parsedPayload = productUpdateSchema.safeParse(
    readProductFormPayload(formData),
  );

  if (!parsedPayload.success) {
    redirectToEditForm(
      productId,
      parsedPayload.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.",
      rawValues,
    );
  }

  let redirectUrl = null;

  try {
    const updateResult = await db.$transaction(async (tx) => {
      const existingProduct = await tx.product.findUnique({
        where: { id: productId },
        select: { slug: true },
      });

      if (!existingProduct) {
        return null;
      }

      const categoryId = await resolveCategoryId(parsedPayload.data.categorySlug, tx);
      const product = await tx.product.update({
        where: { id: productId },
        data: toProductUpdateData(parsedPayload.data, categoryId),
        select: { slug: true },
      });

      return {
        previousSlug: existingProduct.slug,
        nextSlug: product.slug,
      };
    });

    if (updateResult) {
      revalidateProductPaths(updateResult.nextSlug, updateResult.previousSlug);
    }

    if (!updateResult) {
      redirect("/admin/products");
    }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      redirectUrl = buildEditFormUrl(
        productId,
        "Slug đã tồn tại. Vui lòng chọn slug khác.",
        rawValues,
      );
    } else if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      redirectUrl = buildEditFormUrl(
        productId,
        "Category không còn tồn tại. Vui lòng chọn lại.",
        rawValues,
      );
    } else if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      redirect("/admin/products");
    } else if (
      error instanceof Error &&
      error.message === "Category not found."
    ) {
      redirectUrl = buildEditFormUrl(
        productId,
        "Category không còn tồn tại. Vui lòng chọn lại.",
        rawValues,
      );
    } else {
      console.error(error);
      redirectUrl = buildEditFormUrl(
        productId,
        "Không thể cập nhật sản phẩm lúc này. Vui lòng thử lại.",
        rawValues,
      );
    }
  }

  if (redirectUrl) {
    redirect(redirectUrl);
  }

  redirect("/admin/products");
}

export async function deleteProductAction(productId) {
  await requireAdminUser({ nextPath: "/admin/products" });

  try {
    const deletedProduct = await db.product.delete({
      where: { id: productId },
      select: { slug: true },
    });

    revalidateProductPaths(null, deletedProduct.slug);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      redirect("/admin/products");
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      redirect(
        buildAdminProductsUrl(
          "Không thể xóa sản phẩm đã được dùng trong đơn hàng.",
        ),
      );
    }

    throw error;
  }

  redirect("/admin/products");
}
