import { readFileSync } from "node:fs";
import net from "node:net";

const LOCAL_DATABASE_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const DEFAULT_POSTGRES_PORT = 5432;
const BUILD_DATABASE_TIMEOUT_MS = 1500;

function readRepoLocalEnvFile() {
  try {
    return readFileSync(new URL("../.env", import.meta.url), "utf8");
  } catch {
    return "";
  }
}

function readEnvAssignment(envFileContents, name) {
  const match = envFileContents.match(
    new RegExp(`^\\s*${name}\\s*=\\s*(.+)\\s*$`, "m"),
  );

  if (!match) {
    return "";
  }

  const rawValue = match[1].trim();

  if (
    (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
    (rawValue.startsWith("'") && rawValue.endsWith("'"))
  ) {
    return rawValue.slice(1, -1).trim();
  }

  return rawValue;
}

export function resolveBuildDatabaseUrl({
  envObject = process.env,
  envFileContents = readRepoLocalEnvFile(),
} = {}) {
  const envValue =
    typeof envObject.DATABASE_URL === "string"
      ? envObject.DATABASE_URL.trim()
      : "";

  if (envValue) {
    return envValue;
  }

  return readEnvAssignment(envFileContents, "DATABASE_URL");
}

export function getDatabaseConnectionTarget(databaseUrl) {
  const url = new URL(databaseUrl);

  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error(
      `Unsupported DATABASE_URL protocol for build check: ${url.protocol}`,
    );
  }

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : DEFAULT_POSTGRES_PORT,
    protocol: url.protocol,
  };
}

export function probeTcpPort({ host, port, timeoutMs = BUILD_DATABASE_TIMEOUT_MS }) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });

    function cleanup() {
      socket.removeAllListeners();
      socket.destroy();
    }

    socket.setTimeout(timeoutMs);

    socket.once("connect", () => {
      cleanup();
      resolve();
    });

    socket.once("timeout", () => {
      cleanup();
      reject(new Error(`Timed out connecting to ${host}:${port}`));
    });

    socket.once("error", (error) => {
      cleanup();
      reject(error);
    });
  });
}

function createBuildDatabaseError({ host, port }) {
  const isLocalDatabase = LOCAL_DATABASE_HOSTS.has(host);

  if (isLocalDatabase) {
    return new Error(
      `Build database is unreachable at ${host}:${port}. Start local Postgres first with \`npm run db:up\`. If Docker Desktop/OrbStack is stopped, start it before retrying build.`,
    );
  }

  return new Error(
    `Build database is unreachable at ${host}:${port}. Ensure the Postgres instance behind DATABASE_URL is running and reachable before retrying build.`,
  );
}

export async function assertBuildDatabaseReady({
  envObject = process.env,
  envFileContents = readRepoLocalEnvFile(),
  probe = probeTcpPort,
} = {}) {
  const databaseUrl = resolveBuildDatabaseUrl({ envObject, envFileContents });

  if (!databaseUrl) {
    throw new Error("Build prerequisites is missing required env vars: DATABASE_URL");
  }

  const target = getDatabaseConnectionTarget(databaseUrl);

  try {
    await probe(target);
  } catch {
    throw createBuildDatabaseError(target);
  }
}
