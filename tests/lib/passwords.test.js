import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../../src/lib/passwords.js";

describe("password helpers", () => {
  it("hashes and verifies passwords", async () => {
    const passwordHash = await hashPassword("admin123");

    expect(passwordHash).not.toBe("admin123");
    await expect(verifyPassword("admin123", passwordHash)).resolves.toBe(true);
    await expect(verifyPassword("wrong123", passwordHash)).resolves.toBe(false);
  });

  it("returns false for malformed hash payloads", async () => {
    await expect(verifyPassword("admin123", "broken-format")).resolves.toBe(
      false,
    );
    const passwordHash = await hashPassword("admin123");
    await expect(
      verifyPassword("admin123", `${passwordHash}:extra`),
    ).resolves.toBe(false);
  });

  it("returns false for non-string passwords", async () => {
    const passwordHash = await hashPassword("admin123");

    await expect(verifyPassword(undefined, passwordHash)).resolves.toBe(false);
  });
});
