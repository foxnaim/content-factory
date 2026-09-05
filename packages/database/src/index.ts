import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { contentFactoryPrisma?: PrismaClient };

export const prisma = globalForPrisma.contentFactoryPrisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
});

if (process.env.NODE_ENV !== "production") globalForPrisma.contentFactoryPrisma = prisma;

export * from "@prisma/client";
