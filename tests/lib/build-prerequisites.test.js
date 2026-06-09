import { describe, expect, it, vi } from "vitest";
import {
  assertBuildDatabaseReady,
  getDatabaseConnectionTarget,
  resolveBuildDatabaseUrl,
} from "../../scripts/build-prerequisites.mjs";

describe("build prerequisites", () => {
  it("reads host and port from a postgres DATABASE_URL", () => {
    expect(
      getDatabaseConnectionTarget(
        "postgresql://postgres:postgres@localhost:5432/minishop?schema=public",
      ),
    ).toEqual({
      host: "localhost",
      port: 5432,
      protocol: "postgresql:",
    });
  });

  it("throws a clear error when the local build database is unreachable", async () => {
    const probe = vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED"));

    await expect(
      assertBuildDatabaseReady({
        envObject: {
          DATABASE_URL:
            "postgresql://postgres:postgres@localhost:5432/minishop?schema=public",
        },
        probe,
      }),
    ).rejects.toThrowError(
      "Build database is unreachable at localhost:5432. Start local Postgres first with `npm run db:up`.",
    );

    expect(probe).toHaveBeenCalledWith({
      host: "localhost",
      port: 5432,
      protocol: "postgresql:",
    });
  });

  it("prefers repo-local .env DATABASE_URL over an empty process env", () => {
    expect(
      resolveBuildDatabaseUrl({
        envObject: {},
        envFileContents:
          'DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/minishop?schema=public"',
      }),
    ).toBe(
      "postgresql://postgres:postgres@127.0.0.1:5433/minishop?schema=public",
    );
  });
});
