import { PrismaClient } from "@prisma/client";
import { assertEnv } from "@/lib/env";

const globalForPrisma = globalThis;
let prismaClient;

function isDevelopmentLikeEnvironment() {
  return process.env.NODE_ENV !== "production";
}

function createPrismaClient() {
  assertEnv(["DATABASE_URL"], { label: "Prisma client" });
  const client = new PrismaClient();

  return client;
}

function getDbClient() {
  if (prismaClient) {
    return prismaClient;
  }

  if (isDevelopmentLikeEnvironment() && globalForPrisma.prisma) {
    prismaClient = globalForPrisma.prisma;
    return prismaClient;
  }

  prismaClient = createPrismaClient();

  if (isDevelopmentLikeEnvironment()) {
    globalForPrisma.prisma = prismaClient;
  }

  return prismaClient;
}

export const db = new Proxy(
  {},
  {
    get(_target, property, receiver) {
      const client = getDbClient();
      const value = Reflect.get(client, property, receiver);

      return typeof value === "function" ? value.bind(client) : value;
    },
    set(_target, property, value, receiver) {
      const client = getDbClient();
      return Reflect.set(client, property, value, receiver);
    },
    has(_target, property) {
      const client = getDbClient();
      return property in client;
    },
    ownKeys() {
      return Reflect.ownKeys(getDbClient());
    },
    getOwnPropertyDescriptor(_target, property) {
      const client = getDbClient();
      const descriptor = Object.getOwnPropertyDescriptor(client, property);

      if (descriptor) {
        return descriptor;
      }

      return {
        configurable: true,
        enumerable: true,
        writable: true,
        value: undefined,
      };
    },
  },
);
