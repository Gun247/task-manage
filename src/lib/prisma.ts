import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";
import path from "node:path";

function resolveDatabasePath(databaseUrl: string) {
  const dbPath = databaseUrl.replace("file:", "");
  if (path.isAbsolute(dbPath)) {
    return dbPath;
  }

  return path.join(process.cwd(), dbPath.replace(/^\.\//, ""));
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
  const adapter = new PrismaBetterSqlite3({
    url: resolveDatabasePath(databaseUrl),
  });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
