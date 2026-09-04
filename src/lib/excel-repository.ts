import { createId, ExcelTable } from "./excel/table";
import {
  DEFAULT_TASK_TYPES,
  normalizeTaskTypes,
  parseTaskTypes,
  rewriteTaskTypeList,
  serializeTaskTypes,
} from "./task-types";

export type ExcelProject = {
  id: string;
  name: string;
  description: string;
  color: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ExcelPriority = {
  id: string;
  label: string;
  color: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ExcelStatus = {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ExcelTeamMember = {
  id: string;
  nickname: string;
  color: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ExcelTaskTypeOption = {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ExcelTask = {
  id: string;
  name: string;
  description: string;
  remarks: string;
  taskType: string;
  startDate: string;
  endDate: string;
  uatDate: string;
  prdDate: string;
  sortOrder: number;
  projectId: string;
  priorityId: string;
  statusId: string;
  assigneeId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExcelStatusHistory = {
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

export type ExcelSubtask = {
  id: string;
  taskId: string;
  name: string;
  isDone: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ExcelTaskAssignee = {
  id: string;
  taskId: string;
  teamMemberId: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

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
  "nickname",
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

function serializeStatusHistory(entry: ExcelStatusHistory) {
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

function serializeSubtask(entry: ExcelSubtask) {
  return {
    id: entry.id,
    taskId: entry.taskId,
    name: entry.name,
    isDone: Boolean(entry.isDone),
    sortOrder: Number(entry.sortOrder) || 0,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

function historyForTask(histories: ExcelStatusHistory[], taskId: string) {
  return histories
    .filter((entry) => entry.taskId === taskId)
    .sort((a, b) => a.changedAt.localeCompare(b.changedAt))
    .map(serializeStatusHistory);
}

function subtasksForTask(subtasks: ExcelSubtask[], taskId: string) {
  return subtasks
    .filter((entry) => entry.taskId === taskId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt))
    .map(serializeSubtask);
}

function normalizeAssigneeIds(input?: {
  assigneeIds?: string[] | null;
  assigneeId?: string | null;
}) {
  if (!input) return null;
  if (input.assigneeIds !== undefined) {
    return [...new Set((input.assigneeIds ?? []).filter(Boolean))];
  }
  if (input.assigneeId !== undefined) {
    return input.assigneeId ? [input.assigneeId] : [];
  }
  return null;
}

async function syncTaskAssignees(taskId: string, assigneeIds: string[]) {
  await taskAssigneesTable.deleteWhere((entry) => entry.taskId === taskId);
  for (const [index, teamMemberId] of assigneeIds.entries()) {
    await taskAssigneesTable.create({
      id: createId(),
      taskId,
      teamMemberId,
      sortOrder: index,
    });
  }
  await tasksTable.update(taskId, {
    assigneeId: assigneeIds[0] ?? null,
  });
}

async function assigneesForTask(
  assignments: ExcelTaskAssignee[],
  members: ExcelTeamMember[],
  task: ExcelTask,
) {
  const memberById = new Map(members.map((member) => [member.id, member]));
  const linked = assignments
    .filter((entry) => entry.taskId === task.id)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((entry) => memberById.get(entry.teamMemberId))
    .filter((member): member is ExcelTeamMember => Boolean(member));

  if (linked.length > 0) return linked;

  if (task.assigneeId) {
    const legacy = memberById.get(task.assigneeId);
    return legacy ? [legacy] : [];
  }

  return [];
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
  task: ExcelTask,
  histories: ExcelStatusHistory[] = [],
  subtasks: ExcelSubtask[] = [],
  assignments: ExcelTaskAssignee[] = [],
  members: ExcelTeamMember[] = [],
) {
  const [project, priority, status] = await Promise.all([
    projectsTable.findById(task.projectId),
    prioritiesTable.findById(task.priorityId),
    statusesTable.findById(task.statusId),
  ]);

  if (!project || !priority || !status) {
    throw new Error(`Task ${task.id} has missing relations`);
  }

  const assignees = await assigneesForTask(assignments, members, task);
  const assignee = assignees[0] ?? null;
  const taskTypes = parseTaskTypes(task.taskType);

  return {
    ...task,
    startDate: task.startDate || null,
    endDate: task.endDate || null,
    uatDate: task.uatDate || null,
    prdDate: task.prdDate || null,
    assigneeId: assignee?.id ?? null,
    taskType: taskTypes[0],
    taskTypes,
    project,
    priority,
    status,
    assignee,
    assignees,
    statusHistory: historyForTask(histories, task.id),
    subtasks: subtasksForTask(subtasks, task.id),
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
    color: data.color ?? "#6BB82A",
    sortOrder,
  });
}

export async function updateProject(
  id: string,
  data: Partial<Pick<ExcelProject, "name" | "description" | "color" | "sortOrder">>,
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
  data: Partial<Pick<ExcelPriority, "label" | "color" | "sortOrder">>,
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
  data: Partial<Pick<ExcelStatus, "name" | "color" | "sortOrder">>,
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
  data: Partial<Pick<ExcelTeamMember, "nickname" | "color" | "isActive" | "sortOrder">>,
) {
  return teamMembersTable.update(id, data);
}

export async function deleteTeamMember(id: string) {
  await Promise.all([
    tasksTable.updateMany((task) => task.assigneeId === id, { assigneeId: null }),
    taskAssigneesTable.deleteWhere((entry) => entry.teamMemberId === id),
  ]);
  await teamMembersTable.delete(id);
}

export async function listTaskTypes() {
  const types = await taskTypesTable.getAll();
  return types.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function createTaskType(data: { name: string; color?: string }) {
  const name = data.name.trim();
  if (!name) throw new Error("Task type name is required");
  const existing = await taskTypesTable.getAll();
  if (existing.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
    throw new Error("Task type already exists");
  }
  const sortOrder = (await taskTypesTable.maxOf("sortOrder")) + 1;
  return taskTypesTable.create({
    id: createId(),
    name,
    color: data.color ?? "#6B7280",
    sortOrder,
  });
}

export async function updateTaskType(
  id: string,
  data: Partial<Pick<ExcelTaskTypeOption, "name" | "color" | "sortOrder">>,
) {
  const existing = await taskTypesTable.findById(id);
  if (!existing) throw new Error(`Task type not found: ${id}`);

  const payload: Partial<ExcelTaskTypeOption> = {};
  if (data.color !== undefined) payload.color = data.color;
  if (data.sortOrder !== undefined) payload.sortOrder = data.sortOrder;
  if (data.name !== undefined) {
    const name = data.name.trim();
    if (!name) throw new Error("Task type name is required");
    const all = await taskTypesTable.getAll();
    if (
      all.some(
        (item) =>
          item.id !== id && item.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      throw new Error("Task type already exists");
    }
    payload.name = name;
    if (name !== existing.name) {
      const tasks = await tasksTable.getAll();
      const fallback =
        all.find((item) => item.id !== id)?.name ?? DEFAULT_TASK_TYPES[0].name;
      for (const task of tasks) {
        const next = rewriteTaskTypeList(task.taskType, existing.name, name, fallback);
        if (next !== task.taskType) {
          await tasksTable.update(task.id, { taskType: next });
        }
      }
    }
  }

  return taskTypesTable.update(id, payload);
}

export async function deleteTaskType(id: string) {
  const all = await taskTypesTable.getAll();
  if (all.length <= 1) {
    throw new Error("ต้องเหลือ Task Type อย่างน้อย 1 รายการ");
  }
  const existing = all.find((item) => item.id === id);
  if (!existing) throw new Error(`Task type not found: ${id}`);

  const fallback =
    all.find((item) => item.id !== id)?.name ?? DEFAULT_TASK_TYPES[0].name;
  const tasks = await tasksTable.getAll();
  for (const task of tasks) {
    const next = rewriteTaskTypeList(
      task.taskType,
      existing.name,
      null,
      fallback,
    );
    if (next !== task.taskType) {
      await tasksTable.update(task.id, { taskType: next });
    }
  }
  await taskTypesTable.delete(id);
}

export async function getDefaultTaskType() {
  return taskTypesTable.findFirst({ key: "sortOrder", direction: "asc" });
}

export async function listTasks(projectId?: string | null) {
  const [tasks, histories, subtasks, assignments, members] = await Promise.all([
    tasksTable.getAll(),
    statusHistoriesTable.getAll(),
    subtasksTable.getAll(),
    taskAssigneesTable.getAll(),
    teamMembersTable.getAll(),
  ]);

  // Migrate legacy single assigneeId into TaskAssignees when missing
  for (const task of tasks) {
    if (!task.assigneeId) continue;
    const hasLink = assignments.some((entry) => entry.taskId === task.id);
    if (hasLink) continue;
    const created = await taskAssigneesTable.create({
      id: createId(),
      taskId: task.id,
      teamMemberId: task.assigneeId,
      sortOrder: 0,
    });
    assignments.push(created);
  }

  const filtered = projectId
    ? tasks.filter((task) => task.projectId === projectId)
    : tasks;

  return Promise.all(
    filtered
      .sort((a, b) => a.sortOrder - b.sortOrder || b.createdAt.localeCompare(a.createdAt))
      .map((task) => hydrateTask(task, histories, subtasks, assignments, members)),
  );
}

export async function createTask(data: {
  name: string;
  description?: string;
  remarks?: string;
  taskType?: string;
  taskTypes?: string[] | null;
  startDate?: string | null;
  endDate?: string | null;
  uatDate?: string | null;
  prdDate?: string | null;
  projectId: string;
  priorityId: string;
  statusId: string;
  assigneeId?: string | null;
  assigneeIds?: string[] | null;
  sortOrder?: number;
}) {
  const project = await projectsTable.findById(data.projectId);
  if (!project) {
    throw new Error("Project not found");
  }

  const assigneeIds =
    normalizeAssigneeIds(data) ??
    (data.assigneeId ? [data.assigneeId] : []);
  const taskTypes =
    normalizeTaskTypes(data) ?? parseTaskTypes(data.taskType ?? "Back End");

  const task = await tasksTable.create({
    id: createId(),
    name: data.name,
    description: data.description ?? "",
    remarks: data.remarks ?? "",
    taskType: serializeTaskTypes(taskTypes),
    startDate: data.startDate ?? "",
    endDate: data.endDate ?? "",
    uatDate: data.uatDate ?? "",
    prdDate: data.prdDate ?? "",
    sortOrder: data.sortOrder ?? 0,
    projectId: data.projectId,
    priorityId: data.priorityId,
    statusId: data.statusId,
    assigneeId: assigneeIds[0] ?? null,
  });

  await syncTaskAssignees(task.id, assigneeIds);

  await recordStatusChange({
    taskId: task.id,
    toStatusId: data.statusId,
  });

  const [histories, subtasks, assignments, members] = await Promise.all([
    statusHistoriesTable.getAll(),
    subtasksTable.getAll(),
    taskAssigneesTable.getAll(),
    teamMembersTable.getAll(),
  ]);
  const latest = (await tasksTable.findById(task.id)) ?? task;
  return hydrateTask(latest, histories, subtasks, assignments, members);
}

export async function updateTask(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    remarks: string;
    taskType: string;
    taskTypes: string[] | null;
    startDate: string | null;
    endDate: string | null;
    uatDate: string | null;
    prdDate: string | null;
    priorityId: string;
    statusId: string;
    assigneeId: string | null;
    assigneeIds: string[] | null;
    sortOrder: number;
  }>,
) {
  const existing = await tasksTable.findById(id);
  if (!existing) {
    throw new Error(`Task not found: ${id}`);
  }

  const payload: Partial<ExcelTask> = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.description !== undefined) payload.description = data.description;
  if (data.remarks !== undefined) payload.remarks = data.remarks;
  const taskTypes = normalizeTaskTypes(data);
  if (taskTypes) {
    payload.taskType = serializeTaskTypes(taskTypes);
  }
  if (data.startDate !== undefined) payload.startDate = data.startDate ?? "";
  if (data.endDate !== undefined) payload.endDate = data.endDate ?? "";
  if (data.uatDate !== undefined) payload.uatDate = data.uatDate ?? "";
  if (data.prdDate !== undefined) payload.prdDate = data.prdDate ?? "";
  if (data.priorityId !== undefined) payload.priorityId = data.priorityId;
  if (data.statusId !== undefined) payload.statusId = data.statusId;
  if (data.sortOrder !== undefined) payload.sortOrder = data.sortOrder;

  const assigneeIds = normalizeAssigneeIds(data);
  if (assigneeIds) {
    payload.assigneeId = assigneeIds[0] ?? null;
  } else if (data.assigneeId !== undefined) {
    payload.assigneeId = data.assigneeId;
  }

  if (data.statusId !== undefined && data.statusId !== existing.statusId) {
    await recordStatusChange({
      taskId: id,
      fromStatusId: existing.statusId,
      toStatusId: data.statusId,
    });
  }

  const task = await tasksTable.update(id, payload);

  if (assigneeIds) {
    await syncTaskAssignees(id, assigneeIds);
  } else if (data.assigneeId !== undefined) {
    await syncTaskAssignees(id, data.assigneeId ? [data.assigneeId] : []);
  }

  const [histories, subtasks, assignments, members] = await Promise.all([
    statusHistoriesTable.getAll(),
    subtasksTable.getAll(),
    taskAssigneesTable.getAll(),
    teamMembersTable.getAll(),
  ]);
  const latest = (await tasksTable.findById(id)) ?? task;
  return hydrateTask(latest, histories, subtasks, assignments, members);
}

export async function deleteTask(id: string) {
  await Promise.all([
    statusHistoriesTable.deleteWhere((entry) => entry.taskId === id),
    subtasksTable.deleteWhere((entry) => entry.taskId === id),
    taskAssigneesTable.deleteWhere((entry) => entry.taskId === id),
  ]);
  await tasksTable.delete(id);
}

export async function createSubtask(data: { taskId: string; name: string }) {
  const task = await tasksTable.findById(data.taskId);
  if (!task) throw new Error("Task not found");

  const sortOrder = (await subtasksTable.maxOf("sortOrder")) + 1;
  const subtask = await subtasksTable.create({
    id: createId(),
    taskId: data.taskId,
    name: data.name.trim(),
    isDone: false,
    sortOrder,
  });
  return serializeSubtask(subtask);
}

export async function updateSubtask(
  id: string,
  data: Partial<{ name: string; isDone: boolean; sortOrder: number }>,
) {
  const payload: Partial<ExcelSubtask> = {};
  if (data.name !== undefined) payload.name = data.name.trim();
  if (data.isDone !== undefined) payload.isDone = data.isDone;
  if (data.sortOrder !== undefined) payload.sortOrder = data.sortOrder;
  const subtask = await subtasksTable.update(id, payload);
  return serializeSubtask(subtask);
}

export async function deleteSubtask(id: string) {
  await subtasksTable.delete(id);
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
    taskTypesTable.ensureHeader(),
    tasksTable.ensureHeader(),
    statusHistoriesTable.ensureHeader(),
    subtasksTable.ensureHeader(),
    taskAssigneesTable.ensureHeader(),
  ]);
}

export async function seedDefaultData() {
  await ensureSheetStructure();

  const [projects, priorities, statuses, taskTypes] = await Promise.all([
    projectsTable.getAll(),
    prioritiesTable.getAll(),
    statusesTable.getAll(),
    taskTypesTable.getAll(),
  ]);

  if (projects.length === 0) {
    await projectsTable.create({
      id: createId(),
      name: "FWF Task Manager",
      description: "Foreigner Worker Fund",
      color: "#6BB82A",
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
    { name: "Done", color: "#6BB82A", sortOrder: 2 },
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

  if (taskTypes.length === 0) {
    for (const type of DEFAULT_TASK_TYPES) {
      await taskTypesTable.create({ id: createId(), ...type });
    }
  } else {
    for (const type of DEFAULT_TASK_TYPES) {
      const existing = taskTypes.find((item) => item.name === type.name);
      if (existing) {
        await taskTypesTable.update(existing.id, { color: type.color });
      }
    }
  }
}
