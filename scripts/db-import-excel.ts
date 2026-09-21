import { config } from "dotenv";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { getExcelFilePath } from "../src/lib/db-config";
import { ExcelTable } from "../src/lib/excel/table";
import type {
  ExcelPriority,
  ExcelProject,
  ExcelStatus,
  ExcelStatusHistory,
  ExcelSubtask,
  ExcelSubtaskAssignee,
  ExcelTask,
  ExcelTaskAssignee,
  ExcelTaskTypeOption,
  ExcelTeamMember,
} from "../src/lib/excel-repository";

config({ path: ".env.local" });
config();

const projectsTable = new ExcelTable<ExcelProject>("Projects", [
  "id",
  "name",
  "description",
  "color",
  "sortOrder",
  "createdAt",
  "updatedAt",
]);

const prioritiesTable = new ExcelTable<ExcelPriority>("Priorities", [
  "id",
  "label",
  "color",
  "sortOrder",
  "createdAt",
  "updatedAt",
]);

const statusesTable = new ExcelTable<ExcelStatus>("Statuses", [
  "id",
  "name",
  "color",
  "sortOrder",
  "createdAt",
  "updatedAt",
]);

const teamMembersTable = new ExcelTable<ExcelTeamMember>("TeamMembers", [
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
]);

const taskTypesTable = new ExcelTable<ExcelTaskTypeOption>("TaskTypes", [
  "id",
  "name",
  "color",
  "sortOrder",
  "createdAt",
  "updatedAt",
]);

const tasksTable = new ExcelTable<ExcelTask>("Tasks", [
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
]);

const statusHistoriesTable = new ExcelTable<ExcelStatusHistory>("StatusHistories", [
  "id",
  "taskId",
  "fromStatusId",
  "fromStatusName",
  "toStatusId",
  "toStatusName",
  "changedAt",
  "createdAt",
  "updatedAt",
]);

const subtasksTable = new ExcelTable<ExcelSubtask>("Subtasks", [
  "id",
  "taskId",
  "name",
  "isDone",
  "sortOrder",
  "createdAt",
  "updatedAt",
]);

const taskAssigneesTable = new ExcelTable<ExcelTaskAssignee>("TaskAssignees", [
  "id",
  "taskId",
  "teamMemberId",
  "sortOrder",
  "createdAt",
  "updatedAt",
]);

const subtaskAssigneesTable = new ExcelTable<ExcelSubtaskAssignee>(
  "SubtaskAssignees",
  [
    "id",
    "subtaskId",
    "teamMemberId",
    "sortOrder",
    "createdAt",
    "updatedAt",
  ],
);

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

function parseDate(value: string | null | undefined): Date | null {
  if (!value || !String(value).trim()) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseRequiredDate(value: string | null | undefined, fallback = new Date()): Date {
  return parseDate(value) ?? fallback;
}

function nullIfEmpty(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

async function clearSqlite(prisma: PrismaClient) {
  await prisma.subtaskAssignee.deleteMany();
  await prisma.taskAssignee.deleteMany();
  await prisma.subtask.deleteMany();
  await prisma.statusHistory.deleteMany();
  await prisma.task.deleteMany();
  await prisma.taskTypeOption.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.priority.deleteMany();
  await prisma.status.deleteMany();
  await prisma.project.deleteMany();
}

async function main() {
  const excelPath = getExcelFilePath();
  const prisma = createPrisma();

  console.log(`Reading Excel: ${excelPath}`);
  console.log(`Target SQLite: ${process.env.DATABASE_URL ?? "file:./dev.db"}`);
  console.log("Mode: replace (wipe then import)");

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
    projectsTable.getAll(),
    prioritiesTable.getAll(),
    statusesTable.getAll(),
    teamMembersTable.getAll(),
    taskTypesTable.getAll(),
    tasksTable.getAll(),
    statusHistoriesTable.getAll(),
    subtasksTable.getAll(),
    taskAssigneesTable.getAll(),
    subtaskAssigneesTable.getAll(),
  ]);

  const projectIds = new Set(projects.map((row) => row.id));
  const priorityIds = new Set(priorities.map((row) => row.id));
  const statusIds = new Set(statuses.map((row) => row.id));
  const memberIds = new Set(members.map((row) => row.id));

  const validTasks = tasks.filter(
    (task) =>
      projectIds.has(task.projectId) &&
      priorityIds.has(task.priorityId) &&
      statusIds.has(task.statusId),
  );
  const taskIds = new Set(validTasks.map((task) => task.id));

  const validHistories = histories.filter(
    (entry) =>
      taskIds.has(entry.taskId) &&
      statusIds.has(entry.toStatusId) &&
      (!nullIfEmpty(entry.fromStatusId) ||
        statusIds.has(String(entry.fromStatusId))),
  );

  const validSubtasks = subtasks.filter((row) => taskIds.has(row.taskId));
  const subtaskIds = new Set(validSubtasks.map((row) => row.id));

  const validTaskAssignees = taskAssignees.filter(
    (row) => taskIds.has(row.taskId) && memberIds.has(row.teamMemberId),
  );
  const validSubtaskAssignees = subtaskAssignees.filter(
    (row) => subtaskIds.has(row.subtaskId) && memberIds.has(row.teamMemberId),
  );

  // Always wipe then import to avoid unique/FK conflicts.
  await clearSqlite(prisma);

  if (projects.length) {
    await prisma.project.createMany({
      data: projects.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description ?? "",
        color: row.color || "#1E3A5F",
        sortOrder: Number(row.sortOrder) || 0,
        createdAt: parseRequiredDate(row.createdAt),
        updatedAt: parseRequiredDate(row.updatedAt),
      })),
    });
  }

  if (priorities.length) {
    await prisma.priority.createMany({
      data: priorities.map((row) => ({
        id: row.id,
        label: row.label,
        color: row.color,
        sortOrder: Number(row.sortOrder) || 0,
        createdAt: parseRequiredDate(row.createdAt),
        updatedAt: parseRequiredDate(row.updatedAt),
      })),
    });
  }

  if (statuses.length) {
    await prisma.status.createMany({
      data: statuses.map((row) => ({
        id: row.id,
        name: row.name,
        color: row.color,
        sortOrder: Number(row.sortOrder) || 0,
        createdAt: parseRequiredDate(row.createdAt),
        updatedAt: parseRequiredDate(row.updatedAt),
      })),
    });
  }

  if (members.length) {
    await prisma.teamMember.createMany({
      data: members.map((row) => ({
        id: row.id,
        name: row.name ?? "",
        nickname: row.nickname,
        email: row.email ?? "",
        employeeId: row.employeeId ?? "",
        color: row.color,
        isActive: Boolean(row.isActive),
        sortOrder: Number(row.sortOrder) || 0,
        createdAt: parseRequiredDate(row.createdAt),
        updatedAt: parseRequiredDate(row.updatedAt),
      })),
    });
  }

  if (taskTypes.length) {
    await prisma.taskTypeOption.createMany({
      data: taskTypes.map((row) => ({
        id: row.id,
        name: row.name,
        color: row.color,
        sortOrder: Number(row.sortOrder) || 0,
        createdAt: parseRequiredDate(row.createdAt),
        updatedAt: parseRequiredDate(row.updatedAt),
      })),
    });
  }

  if (validTasks.length) {
    await prisma.task.createMany({
      data: validTasks.map((row) => {
        const assigneeId = nullIfEmpty(row.assigneeId);
        const ownerId = nullIfEmpty(row.ownerId);
        return {
          id: row.id,
          name: row.name,
          description: row.description ?? "",
          remarks: row.remarks ?? "",
          source: row.source ?? "",
          taskType: row.taskType || "Back End",
          startDate: parseDate(row.startDate),
          endDate: parseDate(row.endDate),
          uatDate: parseDate(row.uatDate),
          prdDate: parseDate(row.prdDate),
          sortOrder: Number(row.sortOrder) || 0,
          projectId: row.projectId,
          priorityId: row.priorityId,
          statusId: row.statusId,
          assigneeId:
            assigneeId && memberIds.has(assigneeId) ? assigneeId : null,
          ownerId: ownerId && memberIds.has(ownerId) ? ownerId : null,
          createdAt: parseRequiredDate(row.createdAt),
          updatedAt: parseRequiredDate(row.updatedAt),
        };
      }),
    });
  }

  if (validHistories.length) {
    await prisma.statusHistory.createMany({
      data: validHistories.map((row) => {
        const fromStatusId = nullIfEmpty(row.fromStatusId);
        return {
          id: row.id,
          taskId: row.taskId,
          fromStatusId:
            fromStatusId && statusIds.has(fromStatusId) ? fromStatusId : null,
          fromStatusName: row.fromStatusName ?? "",
          toStatusId: row.toStatusId,
          toStatusName: row.toStatusName,
          changedAt: parseRequiredDate(row.changedAt),
          createdAt: parseRequiredDate(row.createdAt),
          updatedAt: parseRequiredDate(row.updatedAt),
        };
      }),
    });
  }

  if (validSubtasks.length) {
    await prisma.subtask.createMany({
      data: validSubtasks.map((row) => ({
        id: row.id,
        taskId: row.taskId,
        name: row.name,
        isDone: Boolean(row.isDone),
        sortOrder: Number(row.sortOrder) || 0,
        createdAt: parseRequiredDate(row.createdAt),
        updatedAt: parseRequiredDate(row.updatedAt),
      })),
    });
  }

  if (validTaskAssignees.length) {
    await prisma.taskAssignee.createMany({
      data: validTaskAssignees.map((row) => ({
        id: row.id,
        taskId: row.taskId,
        teamMemberId: row.teamMemberId,
        sortOrder: Number(row.sortOrder) || 0,
        createdAt: parseRequiredDate(row.createdAt),
        updatedAt: parseRequiredDate(row.updatedAt),
      })),
    });
  }

  if (validSubtaskAssignees.length) {
    await prisma.subtaskAssignee.createMany({
      data: validSubtaskAssignees.map((row) => ({
        id: row.id,
        subtaskId: row.subtaskId,
        teamMemberId: row.teamMemberId,
        sortOrder: Number(row.sortOrder) || 0,
        createdAt: parseRequiredDate(row.createdAt),
        updatedAt: parseRequiredDate(row.updatedAt),
      })),
    });
  }

  console.log("Import complete:");
  console.log(`  projects: ${projects.length}`);
  console.log(`  priorities: ${priorities.length}`);
  console.log(`  statuses: ${statuses.length}`);
  console.log(`  teamMembers: ${members.length}`);
  console.log(`  taskTypes: ${taskTypes.length}`);
  console.log(`  tasks: ${validTasks.length} (skipped ${tasks.length - validTasks.length})`);
  console.log(`  statusHistories: ${validHistories.length}`);
  console.log(`  subtasks: ${validSubtasks.length}`);
  console.log(`  taskAssignees: ${validTaskAssignees.length}`);
  console.log(`  subtaskAssignees: ${validSubtaskAssignees.length}`);

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
