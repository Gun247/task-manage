import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import path from "node:path";

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const dbPath = databaseUrl.replace("file:", "");
const resolvedPath = path.isAbsolute(dbPath)
  ? dbPath
  : path.join(process.cwd(), dbPath.replace(/^\.\//, ""));

const adapter = new PrismaBetterSqlite3({ url: resolvedPath });
const prisma = new PrismaClient({ adapter });

async function main() {
  const defaultProject = await prisma.project.upsert({
    where: { name: "FWF Task Manager" },
    update: {
      description: "Foreigner Worker Fund",
      color: "#1E3A5F",
      sortOrder: 0,
    },
    create: {
      name: "FWF Task Manager",
      description: "Foreigner Worker Fund",
      color: "#1E3A5F",
      sortOrder: 0,
    },
  });

  const priorities = [
    { label: "P0", color: "#EF4444", sortOrder: 0 },
    { label: "P1", color: "#F97316", sortOrder: 1 },
    { label: "P2", color: "#6B7280", sortOrder: 2 },
  ];

  for (const priority of priorities) {
    await prisma.priority.upsert({
      where: { label: priority.label },
      update: priority,
      create: priority,
    });
  }

  const statuses = [
    { name: "Backlog", color: "#6B7280", sortOrder: 0 },
    { name: "In Progress", color: "#3B82F6", sortOrder: 1 },
    { name: "Done", color: "#1E3A5F", sortOrder: 2 },
    { name: "UAT", color: "#F97316", sortOrder: 3 },
    { name: "PRD", color: "#22C55E", sortOrder: 4 },
  ];

  for (const status of statuses) {
    await prisma.status.upsert({
      where: { name: status.name },
      update: { color: status.color },
      create: status,
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
