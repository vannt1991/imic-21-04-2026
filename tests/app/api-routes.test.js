import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { db } = vi.hoisted(() => ({
  db: {
    category: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    product: {
      create: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const { requireAdminApiUser } = vi.hoisted(() => ({
  requireAdminApiUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db,
}));

vi.mock("@/lib/auth", () => ({
  requireAdminApiUser,
}));

import { requireAdminApiUser as requireAdminApiUserMock } from "@/lib/auth";
import { GET as getCategories } from "@/app/api/categories/route";
import { GET as getProduct, PATCH as patchProduct, DELETE as deleteProduct } from "@/app/api/products/[id]/route";
import { GET as getProducts, POST as createProduct } from "@/app/api/products/route";

function createKnownRequestError(code, message = "Prisma request failed.") {
  return new Prisma.PrismaClientKnownRequestError(message, {
    code,
    clientVersion: "test",
  });
}

function createProductRecord(overrides = {}) {
  return {
    id: "prod_1",
    slug: "air-runner",
    name: "Air Runner",
    description: "Daily trainer.",
    price: 1290000,
    originalPrice: null,
    image: null,
    badge: null,
    note: null,
    stock: 8,
    featured: false,
    isActive: true,
    createdAt: new Date("2026-05-16T09:00:00.000Z"),
    updatedAt: new Date("2026-05-16T10:00:00.000Z"),
    category: {
      id: "cat_running",
      slug: "running",
      name: "Running",
    },
    ...overrides,
  };
}

async function readJson(response) {
  return response.json();
}

describe("app api routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireAdminApiUser.mockResolvedValue({ id: "user_admin", role: "ADMIN" });
  });

  it("GET /api/categories returns category list shape", async () => {
    db.category.findMany.mockResolvedValue([
      { id: "cat_1", slug: "running", name: "Running" },
      { id: "cat_2", slug: "lifestyle", name: "Lifestyle" },
    ]);

    const response = await getCategories();

    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual([
      { id: "cat_1", slug: "running", name: "Running" },
      { id: "cat_2", slug: "lifestyle", name: "Lifestyle" },
    ]);
    expect(db.category.findMany).toHaveBeenCalledWith({
      select: {
        id: true,
        slug: true,
        name: true,
      },
      orderBy: { name: "asc" },
    });
  });

  it("POST /api/products rejects invalid bodies with error envelope", async () => {
    const response = await createProduct(
      new Request("http://localhost/api/products", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(400);
    expect(await readJson(response)).toEqual({
      error: {
        message: "Validation failed.",
        details: expect.arrayContaining([
          { path: "name", message: "Invalid input: expected string, received undefined" },
          { path: "categorySlug", message: "Invalid input: expected string, received undefined" },
        ]),
      },
    });
    expect(db.category.findUnique).not.toHaveBeenCalled();
    expect(db.product.create).not.toHaveBeenCalled();
  });

  it("POST /api/products returns 401 for anonymous requests", async () => {
    requireAdminApiUser.mockResolvedValue(
      Response.json(
        { error: { message: "Authentication required." } },
        { status: 401 },
      ),
    );

    const response = await createProduct(
      new Request("http://localhost/api/products", {
        method: "POST",
        body: JSON.stringify({
          name: "API Runner",
          slug: "api-runner",
          description: "Temporary product for route testing.",
          price: 990000,
          stock: 4,
          categorySlug: "running",
        }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(401);
    expect(await readJson(response)).toEqual({
      error: { message: "Authentication required." },
    });
    expect(requireAdminApiUserMock).toHaveBeenCalledTimes(1);
    expect(db.category.findUnique).not.toHaveBeenCalled();
    expect(db.product.create).not.toHaveBeenCalled();
  });

  it("GET /api/products returns product array shape", async () => {
    db.product.findMany.mockResolvedValue([
      createProductRecord(),
      createProductRecord({
        id: "prod_2",
        slug: "street-flex",
        name: "Street Flex",
        category: {
          id: "cat_lifestyle",
          slug: "lifestyle",
          name: "Lifestyle",
        },
      }),
    ]);

    const response = await getProducts();

    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual([
      {
        id: "prod_1",
        slug: "air-runner",
        name: "Air Runner",
        description: "Daily trainer.",
        price: 1290000,
        originalPrice: null,
        image: null,
        badge: null,
        note: null,
        stock: 8,
        featured: false,
        isActive: true,
        category: {
          id: "cat_running",
          slug: "running",
          name: "Running",
        },
        createdAt: "2026-05-16T09:00:00.000Z",
        updatedAt: "2026-05-16T10:00:00.000Z",
      },
      {
        id: "prod_2",
        slug: "street-flex",
        name: "Street Flex",
        description: "Daily trainer.",
        price: 1290000,
        originalPrice: null,
        image: null,
        badge: null,
        note: null,
        stock: 8,
        featured: false,
        isActive: true,
        category: {
          id: "cat_lifestyle",
          slug: "lifestyle",
          name: "Lifestyle",
        },
        createdAt: "2026-05-16T09:00:00.000Z",
        updatedAt: "2026-05-16T10:00:00.000Z",
      },
    ]);
    expect(db.product.findMany).toHaveBeenCalledWith({
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });
  });

  it("POST /api/products returns created product shape", async () => {
    db.category.findUnique.mockResolvedValue({ id: "cat_running" });
    db.product.create.mockResolvedValue(
      createProductRecord({
        slug: "api-runner",
        name: "API Runner",
        description: "Temporary product for route testing.",
        price: 990000,
        stock: 4,
      }),
    );

    const response = await createProduct(
      new Request("http://localhost/api/products", {
        method: "POST",
        body: JSON.stringify({
          name: "API Runner",
          slug: "api-runner",
          description: "Temporary product for route testing.",
          price: 990000,
          stock: 4,
          categorySlug: "running",
        }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(201);
    expect(await readJson(response)).toEqual({
      id: "prod_1",
      slug: "api-runner",
      name: "API Runner",
      description: "Temporary product for route testing.",
      price: 990000,
      originalPrice: null,
      image: null,
      badge: null,
      note: null,
      stock: 4,
      featured: false,
      isActive: true,
      category: {
        id: "cat_running",
        slug: "running",
        name: "Running",
      },
      createdAt: "2026-05-16T09:00:00.000Z",
      updatedAt: "2026-05-16T10:00:00.000Z",
    });
  });

  it("POST /api/products returns 404 when category lookup misses", async () => {
    db.category.findUnique.mockResolvedValue(null);

    const response = await createProduct(
      new Request("http://localhost/api/products", {
        method: "POST",
        body: JSON.stringify({
          name: "Air Runner",
          slug: "air-runner",
          description: "Daily trainer.",
          price: 1290000,
          stock: 8,
          categorySlug: "running",
        }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(404);
    expect(await readJson(response)).toEqual({
      error: { message: "Category not found." },
    });
    expect(db.product.create).not.toHaveBeenCalled();
  });

  it("POST /api/products maps P2003 during create to category 404", async () => {
    db.category.findUnique.mockResolvedValue({ id: "cat_running" });
    db.product.create.mockRejectedValue(createKnownRequestError("P2003"));

    const response = await createProduct(
      new Request("http://localhost/api/products", {
        method: "POST",
        body: JSON.stringify({
          name: "Air Runner",
          slug: "air-runner",
          description: "Daily trainer.",
          price: 1290000,
          stock: 8,
          categorySlug: "running",
        }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(404);
    expect(await readJson(response)).toEqual({
      error: { message: "Category not found." },
    });
  });

  it("GET /api/products/[id] returns 404 when product is missing", async () => {
    db.product.findUnique.mockResolvedValue(null);

    const response = await getProduct(undefined, {
      params: Promise.resolve({ id: "prod_missing" }),
    });

    expect(response.status).toBe(404);
    expect(await readJson(response)).toEqual({
      error: { message: "Product not found." },
    });
  });

  it("GET /api/products/[id] returns product shape", async () => {
    db.product.findUnique.mockResolvedValue(
      createProductRecord({
        id: "prod_9",
        slug: "court-classic",
        name: "Court Classic",
      }),
    );

    const response = await getProduct(undefined, {
      params: Promise.resolve({ id: "prod_9" }),
    });

    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual({
      id: "prod_9",
      slug: "court-classic",
      name: "Court Classic",
      description: "Daily trainer.",
      price: 1290000,
      originalPrice: null,
      image: null,
      badge: null,
      note: null,
      stock: 8,
      featured: false,
      isActive: true,
      category: {
        id: "cat_running",
        slug: "running",
        name: "Running",
      },
      createdAt: "2026-05-16T09:00:00.000Z",
      updatedAt: "2026-05-16T10:00:00.000Z",
    });
  });

  it("PATCH /api/products/[id] returns missing product before category lookup", async () => {
    db.product.findUnique.mockResolvedValue(null);

    const response = await patchProduct(
      new Request("http://localhost/api/products/prod_missing", {
        method: "PATCH",
        body: JSON.stringify({ categorySlug: "running" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "prod_missing" }) },
    );

    expect(response.status).toBe(404);
    expect(await readJson(response)).toEqual({
      error: { message: "Product not found." },
    });
    expect(db.category.findUnique).not.toHaveBeenCalled();
  });

  it("PATCH /api/products/[id] maps P2003 during update to category 404", async () => {
    db.product.findUnique.mockResolvedValue({ id: "prod_1" });
    db.category.findUnique.mockResolvedValue({ id: "cat_running" });
    db.product.update.mockRejectedValue(createKnownRequestError("P2003"));

    const response = await patchProduct(
      new Request("http://localhost/api/products/prod_1", {
        method: "PATCH",
        body: JSON.stringify({ categorySlug: "running" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "prod_1" }) },
    );

    expect(response.status).toBe(404);
    expect(await readJson(response)).toEqual({
      error: { message: "Category not found." },
    });
  });

  it("PATCH /api/products/[id] returns 403 for non-admin users", async () => {
    requireAdminApiUser.mockResolvedValue(
      Response.json({ error: { message: "Forbidden." } }, { status: 403 }),
    );

    const response = await patchProduct(
      new Request("http://localhost/api/products/prod_1", {
        method: "PATCH",
        body: JSON.stringify({ name: "Air Runner Pro" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "prod_1" }) },
    );

    expect(response.status).toBe(403);
    expect(await readJson(response)).toEqual({
      error: { message: "Forbidden." },
    });
    expect(requireAdminApiUserMock).toHaveBeenCalledTimes(1);
    expect(db.product.findUnique).not.toHaveBeenCalled();
    expect(db.category.findUnique).not.toHaveBeenCalled();
    expect(db.product.update).not.toHaveBeenCalled();
  });

  it("PATCH /api/products/[id] returns 400 when originalPrice is not greater than existing price", async () => {
    db.product.findUnique.mockResolvedValue({ id: "prod_1", price: 1290000 });

    const response = await patchProduct(
      new Request("http://localhost/api/products/prod_1", {
        method: "PATCH",
        body: JSON.stringify({ originalPrice: 1290000 }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "prod_1" }) },
    );

    expect(response.status).toBe(400);
    expect(await readJson(response)).toEqual({
      error: {
        message: "Original price must be greater than price.",
      },
    });
    expect(db.category.findUnique).not.toHaveBeenCalled();
    expect(db.product.update).not.toHaveBeenCalled();
  });

  it("PATCH /api/products/[id] returns updated product shape", async () => {
    db.product.findUnique
      .mockResolvedValueOnce({
        id: "prod_1",
        price: 1290000,
        originalPrice: null,
      })
      .mockResolvedValueOnce(
        createProductRecord({
          id: "prod_1",
          slug: "air-runner-pro",
          name: "Air Runner Pro",
          price: 1490000,
          originalPrice: 1790000,
        }),
      );
    db.product.update.mockResolvedValue(
      createProductRecord({
        id: "prod_1",
        slug: "air-runner-pro",
        name: "Air Runner Pro",
        price: 1490000,
        originalPrice: 1790000,
      }),
    );

    const response = await patchProduct(
      new Request("http://localhost/api/products/prod_1", {
        method: "PATCH",
        body: JSON.stringify({
          name: "Air Runner Pro",
          slug: "air-runner-pro",
          price: 1490000,
          originalPrice: 1790000,
        }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "prod_1" }) },
    );

    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual({
      id: "prod_1",
      slug: "air-runner-pro",
      name: "Air Runner Pro",
      description: "Daily trainer.",
      price: 1490000,
      originalPrice: 1790000,
      image: null,
      badge: null,
      note: null,
      stock: 8,
      featured: false,
      isActive: true,
      category: {
        id: "cat_running",
        slug: "running",
        name: "Running",
      },
      createdAt: "2026-05-16T09:00:00.000Z",
      updatedAt: "2026-05-16T10:00:00.000Z",
    });
  });

  it("PATCH /api/products/[id] returns 400 when new price makes stored originalPrice invalid", async () => {
    db.product.findUnique.mockResolvedValue({
      id: "prod_1",
      price: 1290000,
      originalPrice: 1490000,
    });
    db.product.update.mockResolvedValue(
      createProductRecord({
        price: 1490000,
        originalPrice: 1490000,
      }),
    );

    const response = await patchProduct(
      new Request("http://localhost/api/products/prod_1", {
        method: "PATCH",
        body: JSON.stringify({ price: 1490000 }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "prod_1" }) },
    );

    expect(response.status).toBe(400);
    expect(await readJson(response)).toEqual({
      error: {
        message: "Original price must be greater than price.",
      },
    });
    expect(db.category.findUnique).not.toHaveBeenCalled();
    expect(db.product.update).not.toHaveBeenCalled();
  });

  it("DELETE /api/products/[id] maps P2003 to order-conflict 409", async () => {
    db.product.delete.mockRejectedValue(createKnownRequestError("P2003"));

    const response = await deleteProduct(undefined, {
      params: Promise.resolve({ id: "prod_1" }),
    });

    expect(response.status).toBe(409);
    expect(await readJson(response)).toEqual({
      error: {
        message: "Product cannot be deleted because it is used in orders.",
      },
    });
  });

  it("DELETE /api/products/[id] returns 401 for anonymous requests before delete", async () => {
    requireAdminApiUser.mockResolvedValue(
      Response.json(
        { error: { message: "Authentication required." } },
        { status: 401 },
      ),
    );

    const response = await deleteProduct(undefined, {
      params: Promise.resolve({ id: "prod_1" }),
    });

    expect(response.status).toBe(401);
    expect(await readJson(response)).toEqual({
      error: { message: "Authentication required." },
    });
    expect(requireAdminApiUserMock).toHaveBeenCalledTimes(1);
    expect(db.product.delete).not.toHaveBeenCalled();
  });

  it("DELETE /api/products/[id] returns deleted marker", async () => {
    db.product.delete.mockResolvedValue({ id: "prod_7" });

    const response = await deleteProduct(undefined, {
      params: Promise.resolve({ id: "prod_7" }),
    });

    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual({
      deleted: true,
      id: "prod_7",
    });
  });
});
