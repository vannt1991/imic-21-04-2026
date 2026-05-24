import { afterEach, describe, expect, it } from "vitest";
import { resolveLocalE2EDatabaseUrl } from "../../playwright.config.mjs";

const DEFAULT_DSN =
  "postgresql://postgres:postgres@localhost:5432/minishop?schema=public";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("resolveLocalE2EDatabaseUrl", () => {
  it("prefers repo-local .env DATABASE_URL over shell DATABASE_URL", () => {
    process.env.DATABASE_URL = "postgresql://external:external@remote:5432/remote?schema=public";

    expect(
      resolveLocalE2EDatabaseUrl({
        envFileContents:
          'DATABASE_URL="postgresql://local:local@127.0.0.1:5433/minishop_local?schema=public"',
      }),
    ).toBe(
      "postgresql://local:local@127.0.0.1:5433/minishop_local?schema=public",
    );
  });

  it("falls back to the default local DSN when .env has no DATABASE_URL", () => {
    process.env.DATABASE_URL = "postgresql://external:external@remote:5432/remote?schema=public";

    expect(resolveLocalE2EDatabaseUrl({ envFileContents: 'AUTH_SECRET="x"' })).toBe(
      DEFAULT_DSN,
    );
  });
});
