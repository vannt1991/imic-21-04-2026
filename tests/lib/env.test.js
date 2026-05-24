import { afterEach, describe, expect, it } from "vitest";
import {
  assertEnv,
  getMissingEnvNames,
  isProductionEnvironment,
  readRequiredEnv,
} from "../../src/lib/env.js";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("env helpers", () => {
  it("lists missing env names in declaration order", () => {
    process.env.DATABASE_URL = "";
    delete process.env.AUTH_SECRET;

    expect(getMissingEnvNames(["DATABASE_URL", "AUTH_SECRET"])).toEqual([
      "DATABASE_URL",
      "AUTH_SECRET",
    ]);
  });

  it("throws a labeled error when required env vars are missing", () => {
    delete process.env.DATABASE_URL;

    expect(() =>
      assertEnv(["DATABASE_URL"], { label: "Prisma client" }),
    ).toThrowError("Prisma client is missing required env vars: DATABASE_URL");
  });

  it("returns the test fallback only in test mode", () => {
    process.env.NODE_ENV = "test";
    delete process.env.AUTH_SECRET;

    expect(
      readRequiredEnv("AUTH_SECRET", { fallbackInTest: "test-auth-secret" }),
    ).toBe("test-auth-secret");
  });

  it("detects production strictly from NODE_ENV", () => {
    expect(isProductionEnvironment("production")).toBe(true);
    expect(isProductionEnvironment("development")).toBe(false);
  });
});
