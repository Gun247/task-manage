import { createId, SheetTable } from "./table";
import { callAppsScript } from "./apps-script-client";

export type SheetProject = {
  id: string;
  name: string;
  description: string;
  color: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type SheetPriority = {
  id: string;
  label: string;
  color: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type SheetStatus = {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type SheetTeamMember = {
  id: string;
  nickname: string;
  color: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type SheetTask = {
  id: string;
  name: string;
  description: string;
  remarks: string;
  taskType: string;
  startDate: string;
  endDate: string;
  sortOrder: number;
  projectId: string;
  priorityId: string;
  statusId: string;
  assigneeId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SheetStatusHistory = {
  id: string;
  taskId: string;
  fromStatusId: string;
  fromStatusName: string;
  toStatusId: string;
  toStatusName: string;
  changedAt: string;
  createdAt: string;
  updatedAt: string;
};

const projectsTable = new SheetTable<SheetProject>("Projects", [
  "id",
  "name",
  "description",
  "color",
  "sortOrder",
  "createdAt",
  "updatedAt",
]);

const prioritiesTable = new SheetTable<SheetPriority>("Priorities", [
  "id",
  "label",
  "color",
  "sortOrder",
  "createdAt",
  "updatedAt",
]);

const statusesTable = new SheetTable<SheetStatus>("Statuses", [
  "id",
  "name",
  "color",
  "sortOrder",
  "createdAt",
  "updatedAt",
]);

const teamMembersTable = new SheetTable<SheetTeamMember>("TeamMembers", [
  "id",
  "nickname",
  "color",
  "isActive",
  "sortOrder",
  "createdAt",
  "updatedAt",
]);

const tasksTable = new SheetTable<SheetTask>("Tasks", [
  "id",
  "name",
  "description",
  "remarks",
  "taskType",
  "startDate",
  "endDate",
  "sortOrder",
  "projectId",
  "priorityId",
  "statusId",
  "assigneeId",
  "createdAt",
  "updatedAt",
]);

const statusHistoriesTable = new SheetTable<SheetStatusHistory>("StatusHistories", [
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

function serializeStatusHistory(entry: SheetStatusHistory) {
  return {
    id: entry.id,
    taskId: entry.taskId,
    fromStatusId: entry.fromStatusId || null,
    fromStatusName: entry.fromStatusName,
    toStatusId: entry.toStatusId,
    toStatusName: entry.toStatusName,
    changedAt: entry.changedAt,
  };
}

function historyForTask(histories: SheetStatusHistory[], taskId: string) {
  return histories
    .filter((entry) => entry.taskId === taskId)
    .sort((a, b) => a.changedAt.localeCompare(b.changedAt))
    .map(serializeStatusHistory);
}

async function recordStatusChange(params: {
  taskId: string;
  fromStatusId?: string | null;
  toStatusId: string;
}) {
  const [fromStatus, toStatus] = await Promise.all([
    params.fromStatusId
      ? statusesTable.findById(params.fromStatusId)
      : Promise.resolve(null),
    statusesTable.findById(params.toStatusId),
  ]);

  const changedAt = new Date().toISOString();
  await statusHistoriesTable.create({
    id: createId(),
    taskId: params.taskId,
    fromStatusId: params.fromStatusId ?? "",
    fromStatusName: fromStatus?.name ?? "",
    toStatusId: params.toStatusId,
    toStatusName: toStatus?.name ?? "",
    changedAt,
  });
}

async function hydrateTask(
  task: SheetTask,
  histories: SheetStatusHistory[] = [],
) {
  const [project, priority, status, assignee] = await Promise.all([
    projectsTable.findById(task.projectId),
    prioritiesTable.findById(task.priorityId),
    statusesTable.findById(task.statusId),
    task.assigneeId ? teamMembersTable.findById(task.assigneeId) : Promise.resolve(null),
  ]);

  if (!project || !priority || !status) {
    throw new Error(`Task ${task.id} has missing relations`);
  }

  return {
    ...task,
    startDate: task.startDate || null,
    endDate: task.endDate || null,
    project,
    priority,
    status,
    assignee,
    statusHistory: historyForTask(histories, task.id),
  };
}

export async function listProjects() {
  const projects = await projectsTable.getAll();
  const tasks = await tasksTable.getAll();
  return projects
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt))
    .map((project) => ({
      ...project,
      _count: { tasks: tasks.filter((task) => task.projectId === project.id).length },
    }));
}

export async function createProject(data: {
  name: string;
  description?: string;
  color?: string;
}) {
  const sortOrder = (await projectsTable.maxOf("sortOrder")) + 1;
  return projectsTable.create({
    id: createId(),
    name: data.name,
    description: data.description ?? "",
    color: data.color ?? "#1E3A5F",
    sortOrder,
  });
}

export async function updateProject(
  id: string,
  data: Partial<Pick<SheetProject, "name" | "description" | "color" | "sortOrder">>,
) {
  return projectsTable.update(id, data);
}

export async function deleteProject(id: string) {
  const taskCount = await tasksTable.count((task) => task.projectId === id);
  if (taskCount > 0) {
    throw new Error("Cannot delete project with existing tasks");
  }
  await projectsTable.delete(id);
}

export async function listPriorities() {
  const priorities = await prioritiesTable.getAll();
  return priorities.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function updatePriority(
  id: string,
  data: Partial<Pick<SheetPriority, "label" | "color" | "sortOrder">>,
) {
  return prioritiesTable.update(id, data);
}

export async function listStatuses() {
  const statuses = await statusesTable.getAll();
  return statuses.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function createStatus(data: { name: string; color?: string }) {
  const sortOrder = (await statusesTable.maxOf("sortOrder")) + 1;
  return statusesTable.create({
    id: createId(),
    name: data.name,
    color: data.color ?? "#6B7280",
    sortOrder,
  });
}

export async function updateStatus(
  id: string,
  data: Partial<Pick<SheetStatus, "name" | "color" | "sortOrder">>,
) {
  return statusesTable.update(id, data);
}

export async function deleteStatus(id: string, moveToStatusId?: string) {
  const taskCount = await tasksTable.count((task) => task.statusId === id);
  if (taskCount > 0) {
    if (!moveToStatusId) {
      const error = new Error("Status has tasks. Provide moveToStatusId to reassign them.");
      (error as Error & { taskCount: number }).taskCount = taskCount;
      throw error;
    }
    await tasksTable.updateMany((task) => task.statusId === id, {
      statusId: moveToStatusId,
    });
  }
  await statusesTable.delete(id);
}

export async function listTeamMembers() {
  const members = await teamMembersTable.getAll();
  return members
    .filter((member) => member.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function createTeamMember(data: { nickname: string; color?: string }) {
  const sortOrder = (await teamMembersTable.maxOf("sortOrder")) + 1;
  return teamMembersTable.create({
    id: createId(),
    nickname: data.nickname,
    color: data.color ?? "#3B82F6",
    isActive: true,
    sortOrder,
  });
}

export async function updateTeamMember(
  id: string,
  data: Partial<Pick<SheetTeamMember, "nickname" | "color" | "isActive" | "sortOrder">>,
) {
  return teamMembersTable.update(id, data);
}

export async function deleteTeamMember(id: string) {
  await tasksTable.updateMany((task) => task.assigneeId === id, { assigneeId: null });
  await teamMembersTable.delete(id);
}

export async function listTasks(projectId?: string | null) {
  const [tasks, histories] = await Promise.all([
    tasksTable.getAll(),
    statusHistoriesTable.getAll(),
  ]);
  const filtered = projectId
    ? tasks.filter((task) => task.projectId === projectId)
    : tasks;

  const hydrated = await Promise.all(
    filtered
      .sort((a, b) => a.sortOrder - b.sortOrder || b.createdAt.localeCompare(a.createdAt))
      .map((task) => hydrateTask(task, histories)),
  );

  return hydrated;
}

export async function createTask(data: {
  name: string;
  description?: string;
  remarks?: string;
  taskType?: string;
  startDate?: string | null;
  endDate?: string | null;
  projectId: string;
  priorityId: string;
  statusId: string;
  assigneeId?: string | null;
  sortOrder?: number;
}) {
  const project = await projectsTable.findById(data.projectId);
  if (!project) {
    throw new Error("Project not found");
  }

  const task = await tasksTable.create({
    id: createId(),
    name: data.name,
    description: data.description ?? "",
    remarks: data.remarks ?? "",
    taskType: data.taskType ?? "Back End",
    startDate: data.startDate ?? "",
    endDate: data.endDate ?? "",
    sortOrder: data.sortOrder ?? 0,
    projectId: data.projectId,
    priorityId: data.priorityId,
    statusId: data.statusId,
    assigneeId: data.assigneeId ?? null,
  });

  await recordStatusChange({
    taskId: task.id,
    toStatusId: data.statusId,
  });

  const histories = await statusHistoriesTable.getAll();
  return hydrateTask(task, histories);
}

export async function updateTask(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    remarks: string;
    taskType: string;
    startDate: string | null;
    endDate: string | null;
    priorityId: string;
    statusId: string;
    assigneeId: string | null;
    sortOrder: number;
  }>,
) {
  const existing = await tasksTable.findById(id);
  if (!existing) {
    throw new Error(`Task not found: ${id}`);
  }

  const payload: Partial<SheetTask> = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.description !== undefined) payload.description = data.description;
  if (data.remarks !== undefined) payload.remarks = data.remarks;
  if (data.taskType !== undefined) payload.taskType = data.taskType;
  if (data.startDate !== undefined) payload.startDate = data.startDate ?? "";
  if (data.endDate !== undefined) payload.endDate = data.endDate ?? "";
  if (data.priorityId !== undefined) payload.priorityId = data.priorityId;
  if (data.statusId !== undefined) payload.statusId = data.statusId;
  if (data.assigneeId !== undefined) payload.assigneeId = data.assigneeId;
  if (data.sortOrder !== undefined) payload.sortOrder = data.sortOrder;

  if (data.statusId !== undefined && data.statusId !== existing.statusId) {
    await recordStatusChange({
      taskId: id,
      fromStatusId: existing.statusId,
      toStatusId: data.statusId,
    });
  }

  const task = await tasksTable.update(id, payload);
  const histories = await statusHistoriesTable.getAll();
  return hydrateTask(task, histories);
}

export async function deleteTask(id: string) {
  await statusHistoriesTable.deleteWhere((entry) => entry.taskId === id);
  await tasksTable.delete(id);
}

export async function getDefaultStatus() {
  return statusesTable.findFirst({ key: "sortOrder", direction: "asc" });
}

export async function getDefaultPriority() {
  return prioritiesTable.findFirst({ key: "sortOrder", direction: "asc" });
}

export async function getDefaultProject() {
  return projectsTable.findFirst({ key: "sortOrder", direction: "asc" });
}

export async function getProjectById(id: string) {
  return projectsTable.findById(id);
}

export async function ensureSheetStructure() {
  await Promise.all([
    projectsTable.ensureHeader(),
    prioritiesTable.ensureHeader(),
    statusesTable.ensureHeader(),
    teamMembersTable.ensureHeader(),
    tasksTable.ensureHeader(),
    statusHistoriesTable.ensureHeader(),
  ]);
}

export async function seedDefaultData() {
  if (process.env.GOOGLE_APPS_SCRIPT_URL) {
    await callAppsScript("seedDefaults");
    return;
  }

  await ensureSheetStructure();

  const [projects, priorities, statuses] = await Promise.all([
    projectsTable.getAll(),
    prioritiesTable.getAll(),
    statusesTable.getAll(),
  ]);

  if (projects.length === 0) {
    await projectsTable.create({
      id: createId(),
      name: "FWF Task Manager",
      description: "Foreigner Worker Fund",
      color: "#1E3A5F",
      sortOrder: 0,
    });
  }

  if (priorities.length === 0) {
    const defaults = [
      { label: "P0", color: "#EF4444", sortOrder: 0 },
      { label: "P1", color: "#F97316", sortOrder: 1 },
      { label: "P2", color: "#6B7280", sortOrder: 2 },
    ];
    for (const priority of defaults) {
      await prioritiesTable.create({ id: createId(), ...priority });
    }
  }

  const statusDefaults = [
    { name: "Backlog", color: "#6B7280", sortOrder: 0 },
    { name: "In Progress", color: "#3B82F6", sortOrder: 1 },
    { name: "Done", color: "#1E3A5F", sortOrder: 2 },
    { name: "UAT", color: "#F97316", sortOrder: 3 },
    { name: "PRD", color: "#22C55E", sortOrder: 4 },
  ];
  if (statuses.length === 0) {
    for (const status of statusDefaults) {
      await statusesTable.create({ id: createId(), ...status });
    }
  } else {
    for (const status of statusDefaults) {
      const existing = statuses.find((item) => item.name === status.name);
      if (existing) {
        await statusesTable.update(existing.id, { color: status.color });
      }
    }
  }
}
