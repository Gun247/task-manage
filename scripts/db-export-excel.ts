import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

config({ path: ".env.local" });
config();

function createPrisma() {
  const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
  const dbPath = databaseUrl.replace("file:", "");
  const resolvedPath = path.isAbsolute(dbPath)
    ? dbPath
    : path.join(process.cwd(), dbPath.replace(/^\.\//, ""));
  return new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: resolvedPath }),
  });
}

function resolveOutputPath() {
  const fromArg = process.argv.find((arg) => arg.startsWith("--out="));
  if (fromArg) {
    const value = fromArg.slice("--out=".length);
    return path.isAbsolute(value) ? value : path.join(process.cwd(), value);
  }
  const positional = process.argv
    .slice(2)
    .find((arg) => !arg.startsWith("--"));
  if (positional) {
    return path.isAbsolute(positional)
      ? positional
      : path.join(process.cwd(), positional);
  }
  return path.join(process.cwd(), "data", "taskDB-export.xlsx");
}

function iso(value: Date | null | undefined): string {
  return value ? value.toISOString() : "";
}

function boolCell(value: boolean): string {
  return value ? "TRUE" : "FALSE";
}

function writeSheet(
  workbook: XLSX.WorkBook,
  name: string,
  columns: string[],
  rows: Array<Record<string, string | number>>,
) {
  const data = [
    columns,
    ...rows.map((row) => columns.map((column) => row[column] ?? "")),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, sheet, name);
}

async function main() {
  const outputPath = resolveOutputPath();
  const prisma = createPrisma();

  console.log(`Reading SQLite: ${process.env.DATABASE_URL ?? "file:./dev.db"}`);
  console.log(`Writing Excel: ${outputPath}`);

  const [
    projects,
    priorities,
    statuses,
    members,
    taskTypes,
    tasks,
    histories,
    subtasks,
    taskAssignees,
    subtaskAssignees,
  ] = await Promise.all([
    prisma.project.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.priority.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.status.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.teamMember.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.taskTypeOption.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.task.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] }),
    prisma.statusHistory.findMany({ orderBy: { changedAt: "asc" } }),
    prisma.subtask.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.taskAssignee.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.subtaskAssignee.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const workbook = XLSX.utils.book_new();

  writeSheet(
    workbook,
    "Projects",
    ["id", "name", "description", "color", "sortOrder", "createdAt", "updatedAt"],
    projects.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      color: row.color,
      sortOrder: row.sortOrder,
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt),
    })),
  );

  writeSheet(
    workbook,
    "Priorities",
    ["id", "label", "color", "sortOrder", "createdAt", "updatedAt"],
    priorities.map((row) => ({
      id: row.id,
      label: row.label,
      color: row.color,
      sortOrder: row.sortOrder,
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt),
    })),
  );

  writeSheet(
    workbook,
    "Statuses",
    ["id", "name", "color", "sortOrder", "createdAt", "updatedAt"],
    statuses.map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
      sortOrder: row.sortOrder,
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt),
    })),
  );

  writeSheet(
    workbook,
    "TeamMembers",
    [
      "id",
      "name",
      "nickname",
      "email",
      "employeeId",
      "color",
      "isActive",
      "sortOrder",
      "createdAt",
      "updatedAt",
    ],
    members.map((row) => ({
      id: row.id,
      name: row.name,
      nickname: row.nickname,
      email: row.email,
      employeeId: row.employeeId,
      color: row.color,
      isActive: boolCell(row.isActive),
      sortOrder: row.sortOrder,
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt),
    })),
  );

  writeSheet(
    workbook,
    "TaskTypes",
    ["id", "name", "color", "sortOrder", "createdAt", "updatedAt"],
    taskTypes.map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
      sortOrder: row.sortOrder,
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt),
    })),
  );

  writeSheet(
    workbook,
    "Tasks",
    [
      "id",
      "name",
      "description",
      "remarks",
      "source",
      "taskType",
      "startDate",
      "endDate",
      "uatDate",
      "prdDate",
      "sortOrder",
      "projectId",
      "priorityId",
      "statusId",
      "assigneeId",
      "ownerId",
      "createdAt",
      "updatedAt",
    ],
    tasks.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      remarks: row.remarks,
      source: row.source,
      taskType: row.taskType,
      startDate: iso(row.startDate),
      endDate: iso(row.endDate),
      uatDate: iso(row.uatDate),
      prdDate: iso(row.prdDate),
      sortOrder: row.sortOrder,
      projectId: row.projectId,
      priorityId: row.priorityId,
      statusId: row.statusId,
      assigneeId: row.assigneeId ?? "",
      ownerId: row.ownerId ?? "",
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt),
    })),
  );

  writeSheet(
    workbook,
    "StatusHistories",
    [
      "id",
      "taskId",
      "fromStatusId",
      "fromStatusName",
      "toStatusId",
      "toStatusName",
      "changedAt",
      "createdAt",
      "updatedAt",
    ],
    histories.map((row) => ({
      id: row.id,
      taskId: row.taskId,
      fromStatusId: row.fromStatusId ?? "",
      fromStatusName: row.fromStatusName,
      toStatusId: row.toStatusId,
      toStatusName: row.toStatusName,
      changedAt: iso(row.changedAt),
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt),
    })),
  );

  writeSheet(
    workbook,
    "Subtasks",
    ["id", "taskId", "name", "isDone", "sortOrder", "createdAt", "updatedAt"],
    subtasks.map((row) => ({
      id: row.id,
      taskId: row.taskId,
      name: row.name,
      isDone: boolCell(row.isDone),
      sortOrder: row.sortOrder,
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt),
    })),
  );

  writeSheet(
    workbook,
    "TaskAssignees",
    ["id", "taskId", "teamMemberId", "sortOrder", "createdAt", "updatedAt"],
    taskAssignees.map((row) => ({
      id: row.id,
      taskId: row.taskId,
      teamMemberId: row.teamMemberId,
      sortOrder: row.sortOrder,
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt),
    })),
  );

  writeSheet(
    workbook,
    "SubtaskAssignees",
    ["id", "subtaskId", "teamMemberId", "sortOrder", "createdAt", "updatedAt"],
    subtaskAssignees.map((row) => ({
      id: row.id,
      subtaskId: row.subtaskId,
      teamMemberId: row.teamMemberId,
      sortOrder: row.sortOrder,
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt),
    })),
  );

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  XLSX.writeFile(workbook, outputPath);

  console.log("Export complete:");
  console.log(`  tasks: ${tasks.length}`);
  console.log(`  projects: ${projects.length}`);
  console.log(`  wrote: ${outputPath}`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
