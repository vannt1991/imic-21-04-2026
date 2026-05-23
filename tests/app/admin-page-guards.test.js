import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { transformSync } from "esbuild";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getCurrentUser,
  requireAdminUser,
  getAdminProducts,
  getAdminProductById,
  getAdminCategories,
  getAdminCategoryById,
  getAdminOrders,
  getAdminOrderById,
  notFound,
} = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  requireAdminUser: vi.fn(),
  getAdminProducts: vi.fn(),
  getAdminProductById: vi.fn(),
  getAdminCategories: vi.fn(),
  getAdminCategoryById: vi.fn(),
  getAdminOrders: vi.fn(),
  getAdminOrderById: vi.fn(),
  notFound: vi.fn(),
}));

function loadPageModule(relativePath, mockMap) {
  const filePath = path.resolve(process.cwd(), relativePath);
  const source = readFileSync(filePath, "utf8");
  const { code } = transformSync(source, {
    loader: "jsx",
    format: "cjs",
    jsx: "automatic",
    target: "es2020",
    sourcefile: filePath,
  });
  const compiledModule = { exports: {} };
  const localRequire = (specifier) => {
    if (specifier in mockMap) {
      return mockMap[specifier];
    }

    return require(specifier);
  };

  const script = new vm.Script(`(function(require,module,exports){${code}\n})`, {
    filename: filePath,
  });

  script.runInThisContext()(
    localRequire,
    compiledModule,
    compiledModule.exports,
  );

  return compiledModule.exports;
}

function createCommonMocks() {
  return {
    "next/link": { __esModule: true, default: "a" },
    "next/navigation": { notFound },
    "@/lib/auth": {
      getCurrentUser,
      requireAdminUser,
    },
    "@/app/login/actions": {
      logoutAction: vi.fn(),
    },
    "@/lib/admin-products": {
      getAdminProducts,
      getAdminProductById,
    },
    "@/lib/admin-categories": {
      getAdminCategories,
      getAdminCategoryById,
    },
    "@/lib/admin-orders": {
      getAdminOrders,
      getAdminOrderById,
    },
    "@/lib/admin-product-form": {
      toProductFormValues: vi.fn(() => ({ name: "Existing product" })),
    },
    "@/lib/category-api": {
      toCategoryFormValues: vi.fn(() => ({ name: "Existing category" })),
    },
    "@/lib/format-vnd": {
      formatVnd: vi.fn(() => "1.000.000 đ"),
    },
    "@/lib/admin-order-status": {
      getOrderStatusLabel: vi.fn(() => "Pending"),
    },
    "@/components/delete-product-button": {
      DeleteProductButton: "delete-product-button",
    },
    "@/components/delete-category-button": {
      DeleteCategoryButton: "delete-category-button",
    },
    "@/components/admin-product-form": {
      AdminProductForm: "admin-product-form",
    },
    "@/components/admin-category-form": {
      AdminCategoryForm: "admin-category-form",
    },
    "@/components/admin-order-status-form": {
      AdminOrderStatusForm: "admin-order-status-form",
    },
  };
}

describe("admin page auth guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const adminUser = {
      id: "user_admin",
      name: "Admin",
      role: "ADMIN",
    };

    getCurrentUser.mockResolvedValue(adminUser);
    requireAdminUser.mockResolvedValue(adminUser);
    getAdminProducts.mockResolvedValue([]);
    getAdminProductById.mockResolvedValue({
      id: "prod_1",
      name: "Existing product",
      slug: "existing-product",
      description: "Existing description",
      price: 1000000,
      originalPrice: null,
      image: "",
      badge: "",
      note: "",
      stock: 3,
      featured: false,
      isActive: true,
      category: {
        slug: "running",
        name: "Running",
      },
    });
    getAdminCategories.mockResolvedValue([]);
    getAdminCategoryById.mockResolvedValue({
      id: "cat_1",
      name: "Running",
      slug: "running",
    });
    getAdminOrders.mockResolvedValue([]);
    getAdminOrderById.mockResolvedValue({
      id: "ord_1",
      status: "PENDING",
      customerName: "Ada",
      customerEmail: "ada@example.com",
      customerPhone: "0123",
      shippingAddress: "123 Test St",
      total: 1000000,
      items: [
        {
          id: "item_1",
          quantity: 1,
          price: 1000000,
          product: {
            name: "Existing product",
            slug: "existing-product",
          },
        },
      ],
    });
  });

  it("uses display-only auth in admin layout", async () => {
    const { default: AdminLayout } = loadPageModule("src/app/admin/layout.js", {
      ...createCommonMocks(),
    });

    await AdminLayout({ children: "content" });

    expect(getCurrentUser).toHaveBeenCalledTimes(1);
    expect(requireAdminUser).not.toHaveBeenCalled();
  });

  it.each([
    [
      "dashboard",
      "src/app/admin/page.js",
      { searchParams: Promise.resolve({}) },
      "/admin",
      {},
    ],
    [
      "products list",
      "src/app/admin/products/page.js",
      { searchParams: Promise.resolve({}) },
      "/admin/products",
      {
        "./actions": {
          deleteProductAction: vi.fn(),
        },
      },
    ],
    [
      "new product",
      "src/app/admin/products/new/page.js",
      { searchParams: Promise.resolve({}) },
      "/admin/products/new",
      {
        "../actions": {
          createProductAction: vi.fn(),
        },
      },
    ],
    [
      "edit product",
      "src/app/admin/products/[id]/edit/page.js",
      {
        params: Promise.resolve({ id: "prod_42" }),
        searchParams: Promise.resolve({}),
      },
      "/admin/products/prod_42/edit",
      {
        "../../actions": {
          updateProductAction: vi.fn(),
        },
      },
    ],
    [
      "orders list",
      "src/app/admin/orders/page.js",
      {},
      "/admin/orders",
      {},
    ],
    [
      "order detail",
      "src/app/admin/orders/[id]/page.js",
      {
        params: Promise.resolve({ id: "ord_42" }),
        searchParams: Promise.resolve({}),
      },
      "/admin/orders/ord_42",
      {
        "../actions": {
          updateOrderStatusAction: vi.fn(),
        },
      },
    ],
    [
      "categories list",
      "src/app/admin/categories/page.js",
      { searchParams: Promise.resolve({}) },
      "/admin/categories",
      {
        "./actions": {
          deleteCategoryAction: vi.fn(),
        },
      },
    ],
    [
      "new category",
      "src/app/admin/categories/new/page.js",
      { searchParams: Promise.resolve({}) },
      "/admin/categories/new",
      {
        "../actions": {
          createCategoryAction: vi.fn(),
        },
      },
    ],
    [
      "edit category",
      "src/app/admin/categories/[id]/edit/page.js",
      {
        params: Promise.resolve({ id: "cat_42" }),
        searchParams: Promise.resolve({}),
      },
      "/admin/categories/cat_42/edit",
      {
        "../../actions": {
          updateCategoryAction: vi.fn(),
        },
      },
    ],
  ])(
    "guards %s with exact nextPath",
    async (_label, filePath, props, nextPath, extraMocks) => {
      const { default: page } = loadPageModule(filePath, {
        ...createCommonMocks(),
        ...extraMocks,
      });

      await page(props);

      expect(requireAdminUser).toHaveBeenCalledWith({ nextPath });
    },
  );
});
