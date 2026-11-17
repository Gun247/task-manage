import { prisma } from "@/lib/prisma";
import { promotePrdTasksToDoneIfDue } from "@/lib/promote-prd-throttle";
import {
  DEFAULT_STATUSES,
  DONE_STATUS_NAME,
  getReservedStatusNameError,
  getStatusUpdateError,
  isDefaultStatusName,
  PRD_STATUS_NAME,
  shouldAutoPromotePrdToDone,
} from "@/lib/default-statuses";
import {
  assertPostReleaseReason,
  assertStatusTransitionGates,
  buildPostReleaseChangeDrafts,
  detectReachedMilestones,
} from "@/lib/post-release-change";
import {
  DEFAULT_TASK_TYPES,
  normalizeTaskTypes,
  parseTaskTypes,
  rewriteTaskTypeList,
  serializeTaskTypes,
} from "@/lib/task-types";
import { parseWipLimits, serializeWipLimits } from "@/lib/current-member";
import { notifyTaskWatchers } from "@/lib/collaboration-repository";
import { MODIFY_STATUS_NAME } from "@/lib/default-statuses";
import { parseMemberRole } from "@/lib/roles";

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function serializeProjectFields(project: {
  id: string;
  name: string;
  description: string;
  color: string;
  theme: string;
  wipLimitsJson?: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  _count?: { tasks: number };
}) {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    color: project.color,
    theme: project.theme,
    wipLimits: parseWipLimits(project.wipLimitsJson),
    sortOrder: project.sortOrder,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    ...(project._count ? { _count: project._count } : {}),
  };
}

function serializeTask(
  task: NonNullable<Awaited<ReturnType<typeof prisma.task.findFirst>>> & {
    project: NonNullable<Awaited<ReturnType<typeof prisma.project.findUnique>>>;
    priority: NonNullable<Awaited<ReturnType<typeof prisma.priority.findUnique>>>;
    status: NonNullable<Awaited<ReturnType<typeof prisma.status.findUnique>>>;
    assignee: Awaited<ReturnType<typeof prisma.teamMember.findUnique>>;
    owner?: Awaited<ReturnType<typeof prisma.teamMember.findUnique>>;
    statusHistory?: Array<{
      id: string;
      taskId: string;
      fromStatusId: string | null;
      fromStatusName: string;
      toStatusId: string;
      toStatusName: string;
      changedAt: Date;
    }>;
    postReleaseChanges?: Array<{
      id: string;
      taskId: string;
      changeType: string;
      fromValue: string;
      toValue: string;
      reason: string;
      afterMilestone: string;
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
    source: task.source || "",
    startDate: toIso(task.startDate),
    endDate: toIso(task.endDate),
    uatDate: toIso(task.uatDate),
    prdDate: toIso(task.prdDate),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    assigneeId: assignee?.id ?? null,
    ownerId: task.owner?.id ?? task.ownerId ?? null,
    taskType: taskTypes[0],
    taskTypes,
    project: serializeProjectFields(task.project),
    priority: task.priority,
    status: task.status,
    assignee,
    assignees,
    owner: task.owner ?? null,
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
    postReleaseChanges: (task.postReleaseChanges ?? [])
      .slice()
      .sort((a, b) => a.changedAt.getTime() - b.changedAt.getTime())
      .map((entry) => ({
        id: entry.id,
        taskId: entry.taskId,
        changeType: entry.changeType,
        fromValue: entry.fromValue,
        toValue: entry.toValue,
        reason: entry.reason,
        afterMilestone: entry.afterMilestone,
        changedAt: entry.changedAt.toISOString(),
      })),
    hasPostReleaseChanges: (task.postReleaseChanges ?? []).length > 0,
    comments: [],
    links: [],
    watchers: [],
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
  owner: true,
  statusHistory: { orderBy: { changedAt: "asc" as const } },
  postReleaseChanges: { orderBy: { changedAt: "asc" as const } },
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
  return projects.map((project) => serializeProjectFields(project));
}

export async function createProject(data: {
  name: string;
  description?: string;
  color?: string;
  theme?: string;
  wipLimits?: Record<string, number>;
}) {
  const maxOrder = await prisma.project.aggregate({ _max: { sortOrder: true } });
  const project = await prisma.project.create({
    data: {
      name: data.name,
      description: data.description ?? "",
      color: data.color ?? "#6BB82A",
      theme: data.theme ?? "clean",
      wipLimitsJson: serializeWipLimits(data.wipLimits ?? {}),
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });
  return serializeProjectFields(project);
}

export async function updateProject(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    color: string;
    theme: string;
    sortOrder: number;
    wipLimits: Record<string, number>;
  }>,
) {
  const { wipLimits, ...rest } = data;
  const project = await prisma.project.update({
    where: { id },
    data: {
      ...rest,
      ...(wipLimits !== undefined
        ? { wipLimitsJson: serializeWipLimits(wipLimits) }
        : {}),
    },
  });
  return serializeProjectFields(project);
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
  const reserved = getReservedStatusNameError(data.name);
  if (reserved) throw new Error(reserved);
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

  const protectedError = getStatusUpdateError(existing.name, data);
  if (protectedError) throw new Error(protectedError);

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

async function ensureAdministratorExists() {
  const adminCount = await prisma.teamMember.count({
    where: { isActive: true, role: "administrator" },
  });
  if (adminCount > 0) return;
  const first = await prisma.teamMember.findFirst({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  if (first) {
    await prisma.teamMember.update({
      where: { id: first.id },
      data: { role: "administrator" },
    });
  }
}

function serializeTeamMember(member: {
  id: string;
  name: string;
  nickname: string;
  email: string;
  employeeId: string;
  role: string;
  color: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    ...member,
    role: parseMemberRole(member.role),
    createdAt: member.createdAt?.toISOString?.() ?? member.createdAt,
    updatedAt: member.updatedAt?.toISOString?.() ?? member.updatedAt,
  };
}

export async function listTeamMembers() {
  await ensureAdministratorExists();
  const members = await prisma.teamMember.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return members.map(serializeTeamMember);
}

export async function findTeamMemberByEmployeeId(employeeId: string) {
  await ensureAdministratorExists();
  const needle = employeeId.trim();
  if (!needle) return null;
  const members = await prisma.teamMember.findMany({
    where: { isActive: true },
  });
  const match = members.find(
    (member) =>
      member.employeeId.trim().toLowerCase() === needle.toLowerCase(),
  );
  return match ? serializeTeamMember(match) : null;
}

export async function createTeamMember(data: {
  name?: string;
  nickname: string;
  email?: string;
  employeeId?: string;
  role?: string;
  color?: string;
}) {
  const maxOrder = await prisma.teamMember.aggregate({ _max: { sortOrder: true } });
  const member = await prisma.teamMember.create({
    data: {
      name: data.name?.trim() ?? "",
      nickname: data.nickname,
      email: data.email?.trim() ?? "",
      employeeId: data.employeeId?.trim() ?? "",
      role: parseMemberRole(data.role),
      color: data.color ?? "#3B82F6",
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });
  return serializeTeamMember(member);
}

export async function updateTeamMember(
  id: string,
  data: Partial<{
    name: string;
    nickname: string;
    email: string;
    employeeId: string;
    role: string;
    color: string;
    isActive: boolean;
    sortOrder: number;
  }>,
) {
  const { role, ...rest } = data;
  const member = await prisma.teamMember.update({
    where: { id },
    data: {
      ...rest,
      ...(role !== undefined ? { role: parseMemberRole(role) } : {}),
    },
  });
  return serializeTeamMember(member);
}

export async function deleteTeamMember(id: string) {
  await prisma.taskAssignee.deleteMany({ where: { teamMemberId: id } });
  await prisma.task.updateMany({
    where: { assigneeId: id },
    data: { assigneeId: null },
  });
  await prisma.task.updateMany({
    where: { ownerId: id },
    data: { ownerId: null },
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
  await promotePrdTasksToDoneIfDue(promotePrdTasksToDone);
  const tasks = await prisma.task.findMany({
    where: projectId ? { projectId } : undefined,
    include: taskInclude,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return tasks.map(serializeTask);
}

export async function getTaskById(id: string) {
  const task = await prisma.task.findUnique({
    where: { id },
    include: taskInclude,
  });
  return task ? serializeTask(task) : null;
}

const timelineTaskInclude = {
  project: true,
  priority: true,
  status: true,
  assignee: true,
  owner: true,
  assignments: {
    orderBy: { sortOrder: "asc" as const },
    include: { teamMember: true },
  },
};

export async function listTimelineTasks(projectId?: string | null) {
  const where = {
    ...(projectId ? { projectId } : {}),
    OR: [{ uatDate: { not: null } }, { prdDate: { not: null } }],
  };

  const tasks = await prisma.task.findMany({
    where,
    include: timelineTaskInclude,
    orderBy: [{ uatDate: "asc" }, { prdDate: "asc" }, { sortOrder: "asc" }],
  });

  return tasks.map((task) => ({
    ...serializeTask({
      ...task,
      statusHistory: [],
      postReleaseChanges: [],
      subtasks: [],
    }),
    statusHistory: [],
    postReleaseChanges: [],
    hasPostReleaseChanges: false,
    subtasks: [],
  }));
}

export async function createTask(data: {
  name: string;
  description?: string;
  remarks?: string;
  source?: string;
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
  ownerId?: string | null;
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
      source: data.source ?? "",
      taskType: serializeTaskTypes(taskTypes),
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      uatDate: data.uatDate ? new Date(data.uatDate) : null,
      prdDate: data.prdDate ? new Date(data.prdDate) : null,
      projectId: data.projectId,
      priorityId: data.priorityId,
      statusId: data.statusId,
      assigneeId: assigneeIds[0] ?? null,
      ownerId: data.ownerId || null,
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
    source: string;
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
    ownerId: string | null;
    sortOrder: number;
    postReleaseReason: string | null;
  }>,
) {
  const existing = await prisma.task.findUnique({
    where: { id },
    include: {
      status: true,
      statusHistory: { select: { toStatusName: true } },
    },
  });
  if (!existing) throw new Error(`Task not found: ${id}`);

  const statusChanged =
    data.statusId !== undefined && data.statusId !== existing.statusId;
  let toStatusName = existing.status.name;
  if (statusChanged) {
    const toStatus = await prisma.status.findUnique({
      where: { id: data.statusId! },
    });
    toStatusName = toStatus?.name ?? "";
  }

  const reached = detectReachedMilestones({
    statusHistoryNames: existing.statusHistory.map((entry) => entry.toStatusName),
    currentStatusName: existing.status.name,
    uatDate: existing.uatDate,
    prdDate: existing.prdDate,
  });

  assertStatusTransitionGates({
    ...reached,
    fromStatusName: existing.status.name,
    toStatusName,
    statusChanged,
  });

  const postReleaseDrafts = buildPostReleaseChangeDrafts({
    ...reached,
    statusChanged,
    fromStatusName: existing.status.name,
    toStatusName,
    fromUatDate: existing.uatDate,
    toUatDate: data.uatDate,
    uatDateProvided: data.uatDate !== undefined,
    fromPrdDate: existing.prdDate,
    toPrdDate: data.prdDate,
    prdDateProvided: data.prdDate !== undefined,
  });
  const postReleaseReason = assertPostReleaseReason(
    postReleaseDrafts,
    data.postReleaseReason,
  );

  if (statusChanged) {
    await prisma.statusHistory.create({
      data: {
        taskId: id,
        fromStatusId: existing.statusId,
        fromStatusName: existing.status.name,
        toStatusId: data.statusId!,
        toStatusName,
        changedAt: new Date(),
      },
    });
  }

  if (postReleaseDrafts.length > 0) {
    const changedAt = new Date();
    await prisma.postReleaseChange.createMany({
      data: postReleaseDrafts.map((draft) => ({
        taskId: id,
        changeType: draft.changeType,
        fromValue: draft.fromValue,
        toValue: draft.toValue,
        reason: postReleaseReason,
        afterMilestone: draft.afterMilestone,
        changedAt,
      })),
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
      ...(data.source !== undefined ? { source: data.source } : {}),
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
      ...(data.ownerId !== undefined
        ? { ownerId: data.ownerId || null }
        : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
    },
  });

  if (assigneeIds) {
    await syncTaskAssignees(id, assigneeIds);
  } else if (data.assigneeId !== undefined) {
    await syncTaskAssignees(id, data.assigneeId ? [data.assigneeId] : []);
  }

  if (
    statusChanged &&
    toStatusName.trim().toLowerCase() === MODIFY_STATUS_NAME.toLowerCase()
  ) {
    await notifyTaskWatchers({
      taskId: id,
      title: `เข้า ${MODIFY_STATUS_NAME}: ${existing.name}`,
      body: `${existing.status.name} → ${toStatusName}`,
      kind: "status",
    });
  }

  const refreshed = await prisma.task.findUniqueOrThrow({
    where: { id },
    include: taskInclude,
  });
  return serializeTask(refreshed);
}

export async function markTasksSource(ids: string[], source: string) {
  if (ids.length === 0) return 0;
  const result = await prisma.task.updateMany({
    where: { id: { in: ids } },
    data: { source },
  });
  return result.count;
}

export async function bulkUpdateTasks(
  ids: string[],
  data: {
    statusId?: string;
    startDate?: string | null;
    endDate?: string | null;
    uatDate?: string | null;
    prdDate?: string | null;
    postReleaseReason?: string | null;
  },
) {
  if (ids.length === 0) return { updated: 0 };

  const tasks = await prisma.task.findMany({
    where: { id: { in: ids } },
    include: {
      status: true,
      statusHistory: { select: { toStatusName: true } },
    },
  });
  if (tasks.length === 0) return { updated: 0 };

  let toStatusName = "";
  if (data.statusId !== undefined) {
    const toStatus = await prisma.status.findUnique({
      where: { id: data.statusId },
    });
    if (!toStatus) throw new Error("Status not found");
    toStatusName = toStatus.name;
  }

  const allDrafts = tasks.flatMap((task) => {
    const reached = detectReachedMilestones({
      statusHistoryNames: task.statusHistory.map((entry) => entry.toStatusName),
      currentStatusName: task.status.name,
      uatDate: task.uatDate,
      prdDate: task.prdDate,
    });
    const statusChanged =
      data.statusId !== undefined && data.statusId !== task.statusId;
    assertStatusTransitionGates({
      ...reached,
      fromStatusName: task.status.name,
      toStatusName: toStatusName || task.status.name,
      statusChanged,
    });
    return buildPostReleaseChangeDrafts({
      ...reached,
      statusChanged,
      fromStatusName: task.status.name,
      toStatusName: toStatusName || task.status.name,
      fromUatDate: task.uatDate,
      toUatDate: data.uatDate,
      uatDateProvided: data.uatDate !== undefined,
      fromPrdDate: task.prdDate,
      toPrdDate: data.prdDate,
      prdDateProvided: data.prdDate !== undefined,
    }).map((draft) => ({ taskId: task.id, ...draft }));
  });
  const postReleaseReason = assertPostReleaseReason(
    allDrafts,
    data.postReleaseReason,
  );

  const dateData = {
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
  };

  await prisma.$transaction(async (tx) => {
    if (Object.keys(dateData).length > 0 || data.statusId !== undefined) {
      await tx.task.updateMany({
        where: { id: { in: tasks.map((task) => task.id) } },
        data: {
          ...dateData,
          ...(data.statusId !== undefined ? { statusId: data.statusId } : {}),
        },
      });
    }

    if (data.statusId !== undefined) {
      const history = tasks
        .filter((task) => task.statusId !== data.statusId)
        .map((task) => ({
          taskId: task.id,
          fromStatusId: task.statusId,
          fromStatusName: task.status.name,
          toStatusId: data.statusId!,
          toStatusName,
          changedAt: new Date(),
        }));
      if (history.length > 0) {
        await tx.statusHistory.createMany({ data: history });
      }
    }

    if (allDrafts.length > 0) {
      const changedAt = new Date();
      await tx.postReleaseChange.createMany({
        data: allDrafts.map((draft) => ({
          taskId: draft.taskId,
          changeType: draft.changeType,
          fromValue: draft.fromValue,
          toValue: draft.toValue,
          reason: postReleaseReason,
          afterMilestone: draft.afterMilestone,
          changedAt,
        })),
      });
    }
  });

  return { updated: tasks.length };
}

export async function bulkDeleteTasks(ids: string[]) {
  if (ids.length === 0) return { deleted: 0 };
  const result = await prisma.task.deleteMany({
    where: { id: { in: ids } },
  });
  return { deleted: result.count };
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
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return null;
  return serializeProjectFields(project);
}

function serializeColorTheme(row: {
  id: string;
  label: string;
  description: string;
  paletteJson: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    label: row.label,
    description: row.description,
    palette: JSON.parse(row.paletteJson) as unknown,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listColorThemes() {
  const rows = await prisma.colorTheme.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(serializeColorTheme);
}

export async function getColorThemeById(id: string) {
  const row = await prisma.colorTheme.findUnique({ where: { id } });
  return row ? serializeColorTheme(row) : null;
}

export async function createColorTheme(data: {
  id: string;
  label: string;
  description?: string;
  palette: unknown;
}) {
  const maxOrder = await prisma.colorTheme.aggregate({
    _max: { sortOrder: true },
  });
  const row = await prisma.colorTheme.create({
    data: {
      id: data.id,
      label: data.label,
      description: data.description ?? "",
      paletteJson: JSON.stringify(data.palette),
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });
  return serializeColorTheme(row);
}

export async function updateColorTheme(
  id: string,
  data: Partial<{ label: string; description: string; palette: unknown }>,
) {
  const row = await prisma.colorTheme.update({
    where: { id },
    data: {
      ...(data.label !== undefined ? { label: data.label } : {}),
      ...(data.description !== undefined
        ? { description: data.description }
        : {}),
      ...(data.palette !== undefined
        ? { paletteJson: JSON.stringify(data.palette) }
        : {}),
    },
  });
  return serializeColorTheme(row);
}

export async function deleteColorTheme(id: string) {
  await prisma.colorTheme.delete({ where: { id } });
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
      theme: "grass",
      sortOrder: 0,
    },
    create: {
      name: "FWF Task Manager",
      description: "Foreigner Worker Fund",
      color: "#6BB82A",
      theme: "grass",
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
