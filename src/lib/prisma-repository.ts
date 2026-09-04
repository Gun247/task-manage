import { prisma } from "@/lib/prisma";
import {
  DEFAULT_STATUSES,
  DONE_STATUS_NAME,
  isDefaultStatusName,
  PRD_STATUS_NAME,
  shouldAutoPromotePrdToDone,
} from "@/lib/default-statuses";
import {
  DEFAULT_TASK_TYPES,
  normalizeTaskTypes,
  parseTaskTypes,
  rewriteTaskTypeList,
  serializeTaskTypes,
} from "@/lib/task-types";

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function serializeTask(
  task: NonNullable<Awaited<ReturnType<typeof prisma.task.findFirst>>> & {
    project: NonNullable<Awaited<ReturnType<typeof prisma.project.findUnique>>>;
    priority: NonNullable<Awaited<ReturnType<typeof prisma.priority.findUnique>>>;
    status: NonNullable<Awaited<ReturnType<typeof prisma.status.findUnique>>>;
    assignee: Awaited<ReturnType<typeof prisma.teamMember.findUnique>>;
    statusHistory?: Array<{
      id: string;
      taskId: string;
      fromStatusId: string | null;
      fromStatusName: string;
      toStatusId: string;
      toStatusName: string;
      changedAt: Date;
    }>;
    subtasks?: Array<{
      id: string;
      taskId: string;
      name: string;
      isDone: boolean;
      sortOrder: number;
      createdAt: Date;
      updatedAt: Date;
      assignments?: Array<{
        sortOrder: number;
        teamMember: NonNullable<
          Awaited<ReturnType<typeof prisma.teamMember.findUnique>>
        >;
      }>;
    }>;
    assignments?: Array<{
      sortOrder: number;
      teamMember: NonNullable<
        Awaited<ReturnType<typeof prisma.teamMember.findUnique>>
      >;
    }>;
  },
) {
  const assigneesFromJoin = (task.assignments ?? [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((entry) => entry.teamMember);
  const assignees =
    assigneesFromJoin.length > 0
      ? assigneesFromJoin
      : task.assignee
        ? [task.assignee]
        : [];
  const assignee = assignees[0] ?? null;
  const taskTypes = parseTaskTypes(task.taskType);

  return {
    ...task,
    startDate: toIso(task.startDate),
    endDate: toIso(task.endDate),
    uatDate: toIso(task.uatDate),
    prdDate: toIso(task.prdDate),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    assigneeId: assignee?.id ?? null,
    taskType: taskTypes[0],
    taskTypes,
    project: {
      ...task.project,
      createdAt: task.project.createdAt.toISOString(),
      updatedAt: task.project.updatedAt.toISOString(),
    },
    priority: task.priority,
    status: task.status,
    assignee,
    assignees,
    statusHistory: (task.statusHistory ?? [])
      .slice()
      .sort((a, b) => a.changedAt.getTime() - b.changedAt.getTime())
      .map((entry) => ({
        id: entry.id,
        taskId: entry.taskId,
        fromStatusId: entry.fromStatusId,
        fromStatusName: entry.fromStatusName,
        toStatusId: entry.toStatusId,
        toStatusName: entry.toStatusName,
        changedAt: entry.changedAt.toISOString(),
      })),
    subtasks: (task.subtasks ?? [])
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((entry) => ({
        id: entry.id,
        taskId: entry.taskId,
        name: entry.name,
        isDone: entry.isDone,
        sortOrder: entry.sortOrder,
        assignees: (entry.assignments ?? [])
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((assignment) => assignment.teamMember),
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
      })),
  };
}

const taskInclude = {
  project: true,
  priority: true,
  status: true,
  assignee: true,
  statusHistory: { orderBy: { changedAt: "asc" as const } },
  subtasks: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      assignments: {
        orderBy: { sortOrder: "asc" as const },
        include: { teamMember: true },
      },
    },
  },
  assignments: {
    orderBy: { sortOrder: "asc" as const },
    include: { teamMember: true },
  },
};

const subtaskInclude = {
  assignments: {
    orderBy: { sortOrder: "asc" as const },
    include: { teamMember: true },
  },
};

function serializeSubtask(
  subtask: NonNullable<Awaited<ReturnType<typeof prisma.subtask.findFirst>>> & {
    assignments?: Array<{
      sortOrder: number;
      teamMember: NonNullable<
        Awaited<ReturnType<typeof prisma.teamMember.findUnique>>
      >;
    }>;
  },
) {
  return {
    id: subtask.id,
    taskId: subtask.taskId,
    name: subtask.name,
    isDone: subtask.isDone,
    sortOrder: subtask.sortOrder,
    assignees: (subtask.assignments ?? [])
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((entry) => entry.teamMember),
    createdAt: subtask.createdAt.toISOString(),
    updatedAt: subtask.updatedAt.toISOString(),
  };
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
  await prisma.taskAssignee.deleteMany({ where: { taskId } });
  if (assigneeIds.length > 0) {
    await prisma.taskAssignee.createMany({
      data: assigneeIds.map((teamMemberId, index) => ({
        taskId,
        teamMemberId,
        sortOrder: index,
      })),
    });
  }
  await prisma.task.update({
    where: { id: taskId },
    data: { assigneeId: assigneeIds[0] ?? null },
  });

  // Drop subtask assignees who are no longer on the parent task
  const allowed = new Set(assigneeIds);
  const subtasks = await prisma.subtask.findMany({
    where: { taskId },
    select: { id: true },
  });
  if (subtasks.length > 0) {
    await prisma.subtaskAssignee.deleteMany({
      where: {
        subtaskId: { in: subtasks.map((entry) => entry.id) },
        ...(allowed.size > 0
          ? { teamMemberId: { notIn: [...allowed] } }
          : {}),
      },
    });
  }
}

async function syncSubtaskAssignees(
  subtaskId: string,
  assigneeIds: string[],
  allowedAssigneeIds: string[],
) {
  const allowed = new Set(allowedAssigneeIds);
  const filtered = [...new Set(assigneeIds.filter((id) => allowed.has(id)))];
  await prisma.subtaskAssignee.deleteMany({ where: { subtaskId } });
  if (filtered.length > 0) {
    await prisma.subtaskAssignee.createMany({
      data: filtered.map((teamMemberId, index) => ({
        subtaskId,
        teamMemberId,
        sortOrder: index,
      })),
    });
  }
  return filtered;
}

async function getTaskAssigneeIds(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignments: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!task) return [];
  if (task.assignments.length > 0) {
    return task.assignments.map((entry) => entry.teamMemberId);
  }
  return task.assigneeId ? [task.assigneeId] : [];
}

export async function listProjects() {
  const projects = await prisma.project.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { tasks: true } } },
  });
  return projects.map((project) => ({
    ...project,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  }));
}

export async function createProject(data: {
  name: string;
  description?: string;
  color?: string;
}) {
  const maxOrder = await prisma.project.aggregate({ _max: { sortOrder: true } });
  const project = await prisma.project.create({
    data: {
      name: data.name,
      description: data.description ?? "",
      color: data.color ?? "#6BB82A",
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });
  return {
    ...project,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

export async function updateProject(
  id: string,
  data: Partial<{ name: string; description: string; color: string; sortOrder: number }>,
) {
  const project = await prisma.project.update({ where: { id }, data });
  return {
    ...project,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

export async function deleteProject(id: string) {
  const taskCount = await prisma.task.count({ where: { projectId: id } });
  if (taskCount > 0) {
    throw new Error("Cannot delete project with existing tasks");
  }
  await prisma.project.delete({ where: { id } });
}

export async function listPriorities() {
  return prisma.priority.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function updatePriority(
  id: string,
  data: Partial<{ label: string; color: string; sortOrder: number }>,
) {
  return prisma.priority.update({ where: { id }, data });
}

export async function ensureDefaultStatuses() {
  for (const status of DEFAULT_STATUSES) {
    await prisma.status.upsert({
      where: { name: status.name },
      update: {
        color: status.color,
        sortOrder: status.sortOrder,
      },
      create: {
        name: status.name,
        color: status.color,
        sortOrder: status.sortOrder,
      },
    });
  }
}

export async function promotePrdTasksToDone() {
  await ensureDefaultStatuses();

  const [prdStatus, doneStatus] = await Promise.all([
    prisma.status.findUnique({ where: { name: PRD_STATUS_NAME } }),
    prisma.status.findUnique({ where: { name: DONE_STATUS_NAME } }),
  ]);
  if (!prdStatus || !doneStatus) return 0;

  const tasks = await prisma.task.findMany({
    where: { statusId: prdStatus.id },
    include: {
      statusHistory: { orderBy: { changedAt: "desc" } },
    },
  });

  const now = new Date();
  let promoted = 0;

  for (const task of tasks) {
    const enteredPrd = task.statusHistory.find(
      (entry) => entry.toStatusId === prdStatus.id,
    );

    if (
      !shouldAutoPromotePrdToDone({
        enteredPrdAt: enteredPrd?.changedAt ?? null,
        prdDate: task.prdDate,
        updatedAt: task.updatedAt,
        now,
      })
    ) {
      continue;
    }

    await prisma.statusHistory.create({
      data: {
        taskId: task.id,
        fromStatusId: prdStatus.id,
        fromStatusName: prdStatus.name,
        toStatusId: doneStatus.id,
        toStatusName: doneStatus.name,
        changedAt: now,
      },
    });
    await prisma.task.update({
      where: { id: task.id },
      data: { statusId: doneStatus.id },
    });
    promoted += 1;
  }

  return promoted;
}

export async function listStatuses() {
  await ensureDefaultStatuses();
  return prisma.status.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function createStatus(data: { name: string; color?: string }) {
  const maxOrder = await prisma.status.aggregate({ _max: { sortOrder: true } });
  return prisma.status.create({
    data: {
      name: data.name,
      color: data.color ?? "#6B7280",
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });
}

export async function updateStatus(
  id: string,
  data: Partial<{ name: string; color: string; sortOrder: number }>,
) {
  const existing = await prisma.status.findUnique({ where: { id } });
  if (!existing) throw new Error(`Status not found: ${id}`);

  if (
    isDefaultStatusName(existing.name) &&
    data.name !== undefined &&
    data.name !== existing.name
  ) {
    throw new Error(`ไม่สามารถเปลี่ยนชื่อสถานะเริ่มต้น "${existing.name}" ได้`);
  }

  return prisma.status.update({ where: { id }, data });
}

export async function deleteStatus(id: string, moveToStatusId?: string) {
  const existing = await prisma.status.findUnique({ where: { id } });
  if (!existing) throw new Error(`Status not found: ${id}`);
  if (isDefaultStatusName(existing.name)) {
    throw new Error(`ไม่สามารถลบสถานะเริ่มต้น "${existing.name}" ได้`);
  }

  const taskCount = await prisma.task.count({ where: { statusId: id } });
  if (taskCount > 0) {
    if (!moveToStatusId) {
      const error = new Error("Status has tasks. Provide moveToStatusId to reassign them.");
      (error as Error & { taskCount: number }).taskCount = taskCount;
      throw error;
    }
    await prisma.task.updateMany({
      where: { statusId: id },
      data: { statusId: moveToStatusId },
    });
  }
  await prisma.status.delete({ where: { id } });
}

export async function listTeamMembers() {
  return prisma.teamMember.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function createTeamMember(data: { nickname: string; color?: string }) {
  const maxOrder = await prisma.teamMember.aggregate({ _max: { sortOrder: true } });
  return prisma.teamMember.create({
    data: {
      nickname: data.nickname,
      color: data.color ?? "#3B82F6",
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });
}

export async function updateTeamMember(
  id: string,
  data: Partial<{ nickname: string; color: string; isActive: boolean; sortOrder: number }>,
) {
  return prisma.teamMember.update({ where: { id }, data });
}

export async function deleteTeamMember(id: string) {
  await prisma.taskAssignee.deleteMany({ where: { teamMemberId: id } });
  await prisma.task.updateMany({
    where: { assigneeId: id },
    data: { assigneeId: null },
  });
  await prisma.teamMember.delete({ where: { id } });
}

export async function listTaskTypes() {
  return prisma.taskTypeOption.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function createTaskType(data: { name: string; color?: string }) {
  const name = data.name.trim();
  if (!name) throw new Error("Task type name is required");
  const maxOrder = await prisma.taskTypeOption.aggregate({
    _max: { sortOrder: true },
  });
  return prisma.taskTypeOption.create({
    data: {
      name,
      color: data.color ?? "#6B7280",
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });
}

export async function updateTaskType(
  id: string,
  data: Partial<{ name: string; color: string; sortOrder: number }>,
) {
  const existing = await prisma.taskTypeOption.findUnique({ where: { id } });
  if (!existing) throw new Error(`Task type not found: ${id}`);

  if (data.name !== undefined) {
    const name = data.name.trim();
    if (!name) throw new Error("Task type name is required");
    if (name !== existing.name) {
      const all = await prisma.taskTypeOption.findMany();
      const fallback =
        all.find((item) => item.id !== id)?.name ?? DEFAULT_TASK_TYPES[0].name;
      const tasks = await prisma.task.findMany();
      for (const task of tasks) {
        const next = rewriteTaskTypeList(
          task.taskType,
          existing.name,
          name,
          fallback,
        );
        if (next !== task.taskType) {
          await prisma.task.update({
            where: { id: task.id },
            data: { taskType: next },
          });
        }
      }
    }
  }

  return prisma.taskTypeOption.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.color !== undefined ? { color: data.color } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
    },
  });
}

export async function deleteTaskType(id: string) {
  const all = await prisma.taskTypeOption.findMany({
    orderBy: { sortOrder: "asc" },
  });
  if (all.length <= 1) {
    throw new Error("ต้องเหลือ Task Type อย่างน้อย 1 รายการ");
  }
  const existing = all.find((item) => item.id === id);
  if (!existing) throw new Error(`Task type not found: ${id}`);

  const fallback =
    all.find((item) => item.id !== id)?.name ?? DEFAULT_TASK_TYPES[0].name;
  const tasks = await prisma.task.findMany();
  for (const task of tasks) {
    const next = rewriteTaskTypeList(
      task.taskType,
      existing.name,
      null,
      fallback,
    );
    if (next !== task.taskType) {
      await prisma.task.update({
        where: { id: task.id },
        data: { taskType: next },
      });
    }
  }
  await prisma.taskTypeOption.delete({ where: { id } });
}

export async function getDefaultTaskType() {
  return prisma.taskTypeOption.findFirst({ orderBy: { sortOrder: "asc" } });
}

export async function listTasks(projectId?: string | null) {
  await promotePrdTasksToDone();
  const tasks = await prisma.task.findMany({
    where: projectId ? { projectId } : undefined,
    include: taskInclude,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return tasks.map(serializeTask);
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
  subtasks?: Array<string | { name?: string; assigneeIds?: string[] }> | null;
  sortOrder?: number;
}) {
  const project = await prisma.project.findUnique({ where: { id: data.projectId } });
  if (!project) throw new Error("Project not found");

  const toStatus = await prisma.status.findUnique({ where: { id: data.statusId } });
  const assigneeIds =
    normalizeAssigneeIds(data) ??
    (data.assigneeId ? [data.assigneeId] : []);
  const taskTypes =
    normalizeTaskTypes(data) ?? parseTaskTypes(data.taskType ?? "Back End");
  const pendingSubtasks = (data.subtasks ?? [])
    .map((item) => {
      if (typeof item === "string") {
        return { name: item.trim(), assigneeIds: [] as string[] };
      }
      return {
        name: (item?.name ?? "").trim(),
        assigneeIds: [...new Set((item?.assigneeIds ?? []).filter(Boolean))],
      };
    })
    .filter((item) => item.name);

  const task = await prisma.task.create({
    data: {
      name: data.name,
      description: data.description ?? "",
      remarks: data.remarks ?? "",
      taskType: serializeTaskTypes(taskTypes),
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      uatDate: data.uatDate ? new Date(data.uatDate) : null,
      prdDate: data.prdDate ? new Date(data.prdDate) : null,
      projectId: data.projectId,
      priorityId: data.priorityId,
      statusId: data.statusId,
      assigneeId: assigneeIds[0] ?? null,
      sortOrder: data.sortOrder ?? 0,
      statusHistory: {
        create: {
          toStatusId: data.statusId,
          toStatusName: toStatus?.name ?? "",
          changedAt: new Date(),
        },
      },
      ...(pendingSubtasks.length > 0
        ? {
            subtasks: {
              create: pendingSubtasks.map((item, sortOrder) => ({
                name: item.name,
                sortOrder,
              })),
            },
          }
        : {}),
    },
    include: taskInclude,
  });
  await syncTaskAssignees(task.id, assigneeIds);

  if (pendingSubtasks.some((item) => item.assigneeIds.length > 0)) {
    const createdSubtasks = await prisma.subtask.findMany({
      where: { taskId: task.id },
      orderBy: { sortOrder: "asc" },
    });
    for (const [index, subtask] of createdSubtasks.entries()) {
      const wanted = pendingSubtasks[index]?.assigneeIds ?? [];
      if (wanted.length > 0) {
        await syncSubtaskAssignees(subtask.id, wanted, assigneeIds);
      }
    }
  }

  const refreshed = await prisma.task.findUniqueOrThrow({
    where: { id: task.id },
    include: taskInclude,
  });
  return serializeTask(refreshed);
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
  const existing = await prisma.task.findUnique({
    where: { id },
    include: { status: true },
  });
  if (!existing) throw new Error(`Task not found: ${id}`);

  if (data.statusId !== undefined && data.statusId !== existing.statusId) {
    const toStatus = await prisma.status.findUnique({ where: { id: data.statusId } });
    await prisma.statusHistory.create({
      data: {
        taskId: id,
        fromStatusId: existing.statusId,
        fromStatusName: existing.status.name,
        toStatusId: data.statusId,
        toStatusName: toStatus?.name ?? "",
        changedAt: new Date(),
      },
    });
  }

  const assigneeIds = normalizeAssigneeIds(data);
  const taskTypes = normalizeTaskTypes(data);

  await prisma.task.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.remarks !== undefined ? { remarks: data.remarks } : {}),
      ...(taskTypes ? { taskType: serializeTaskTypes(taskTypes) } : {}),
      ...(data.startDate !== undefined
        ? { startDate: data.startDate ? new Date(data.startDate) : null }
        : {}),
      ...(data.endDate !== undefined
        ? { endDate: data.endDate ? new Date(data.endDate) : null }
        : {}),
      ...(data.uatDate !== undefined
        ? { uatDate: data.uatDate ? new Date(data.uatDate) : null }
        : {}),
      ...(data.prdDate !== undefined
        ? { prdDate: data.prdDate ? new Date(data.prdDate) : null }
        : {}),
      ...(data.priorityId !== undefined ? { priorityId: data.priorityId } : {}),
      ...(data.statusId !== undefined ? { statusId: data.statusId } : {}),
      ...(assigneeIds
        ? { assigneeId: assigneeIds[0] ?? null }
        : data.assigneeId !== undefined
          ? { assigneeId: data.assigneeId }
          : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
    },
  });

  if (assigneeIds) {
    await syncTaskAssignees(id, assigneeIds);
  } else if (data.assigneeId !== undefined) {
    await syncTaskAssignees(id, data.assigneeId ? [data.assigneeId] : []);
  }

  const refreshed = await prisma.task.findUniqueOrThrow({
    where: { id },
    include: taskInclude,
  });
  return serializeTask(refreshed);
}

export async function deleteTask(id: string) {
  await prisma.task.delete({ where: { id } });
}

export async function createSubtask(data: {
  taskId: string;
  name: string;
  assigneeIds?: string[] | null;
}) {
  const task = await prisma.task.findUnique({ where: { id: data.taskId } });
  if (!task) throw new Error("Task not found");

  const maxOrder = await prisma.subtask.aggregate({
    where: { taskId: data.taskId },
    _max: { sortOrder: true },
  });

  const subtask = await prisma.subtask.create({
    data: {
      taskId: data.taskId,
      name: data.name.trim(),
      isDone: false,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });

  if (data.assigneeIds !== undefined) {
    const allowed = await getTaskAssigneeIds(data.taskId);
    await syncSubtaskAssignees(subtask.id, data.assigneeIds ?? [], allowed);
  }

  const refreshed = await prisma.subtask.findUniqueOrThrow({
    where: { id: subtask.id },
    include: subtaskInclude,
  });
  return serializeSubtask(refreshed);
}

export async function updateSubtask(
  id: string,
  data: Partial<{
    name: string;
    isDone: boolean;
    sortOrder: number;
    assigneeIds: string[] | null;
  }>,
) {
  const existing = await prisma.subtask.findUnique({ where: { id } });
  if (!existing) throw new Error(`Subtask not found: ${id}`);

  await prisma.subtask.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.isDone !== undefined ? { isDone: data.isDone } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
    },
  });

  if (data.assigneeIds !== undefined) {
    const allowed = await getTaskAssigneeIds(existing.taskId);
    await syncSubtaskAssignees(id, data.assigneeIds ?? [], allowed);
  }

  const refreshed = await prisma.subtask.findUniqueOrThrow({
    where: { id },
    include: subtaskInclude,
  });
  return serializeSubtask(refreshed);
}

export async function deleteSubtask(id: string) {
  await prisma.subtask.delete({ where: { id } });
}

export async function getDefaultStatus() {
  return prisma.status.findFirst({ orderBy: { sortOrder: "asc" } });
}

export async function getDefaultPriority() {
  return prisma.priority.findFirst({ orderBy: { sortOrder: "asc" } });
}

export async function getDefaultProject() {
  return prisma.project.findFirst({ orderBy: { sortOrder: "asc" } });
}

export async function getProjectById(id: string) {
  return prisma.project.findUnique({ where: { id } });
}

export async function ensureSheetStructure() {
  return;
}

export async function seedDefaultData() {
  const defaultProject = await prisma.project.upsert({
    where: { name: "FWF Task Manager" },
    update: {
      description: "Foreigner Worker Fund",
      color: "#6BB82A",
      sortOrder: 0,
    },
    create: {
      name: "FWF Task Manager",
      description: "Foreigner Worker Fund",
      color: "#6BB82A",
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

  const statuses = [...DEFAULT_STATUSES];
  for (const status of statuses) {
    await prisma.status.upsert({
      where: { name: status.name },
      update: { color: status.color, sortOrder: status.sortOrder },
      create: {
        name: status.name,
        color: status.color,
        sortOrder: status.sortOrder,
      },
    });
  }

  for (const type of DEFAULT_TASK_TYPES) {
    await prisma.taskTypeOption.upsert({
      where: { name: type.name },
      update: { color: type.color },
      create: {
        name: type.name,
        color: type.color,
        sortOrder: type.sortOrder,
      },
    });
  }

  return defaultProject;
}
