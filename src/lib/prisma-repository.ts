import { prisma } from "@/lib/prisma";

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
  },
) {
  return {
    ...task,
    startDate: toIso(task.startDate),
    endDate: toIso(task.endDate),
    uatDate: toIso(task.uatDate),
    prdDate: toIso(task.prdDate),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    project: {
      ...task.project,
      createdAt: task.project.createdAt.toISOString(),
      updatedAt: task.project.updatedAt.toISOString(),
    },
    priority: task.priority,
    status: task.status,
    assignee: task.assignee,
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
  };
}

const taskInclude = {
  project: true,
  priority: true,
  status: true,
  assignee: true,
  statusHistory: { orderBy: { changedAt: "asc" as const } },
};

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

export async function listStatuses() {
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
  return prisma.status.update({ where: { id }, data });
}

export async function deleteStatus(id: string, moveToStatusId?: string) {
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
  await prisma.task.updateMany({
    where: { assigneeId: id },
    data: { assigneeId: null },
  });
  await prisma.teamMember.delete({ where: { id } });
}

export async function listTasks(projectId?: string | null) {
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
  startDate?: string | null;
  endDate?: string | null;
  uatDate?: string | null;
  prdDate?: string | null;
  projectId: string;
  priorityId: string;
  statusId: string;
  assigneeId?: string | null;
  sortOrder?: number;
}) {
  const project = await prisma.project.findUnique({ where: { id: data.projectId } });
  if (!project) throw new Error("Project not found");

  const toStatus = await prisma.status.findUnique({ where: { id: data.statusId } });

  const task = await prisma.task.create({
    data: {
      name: data.name,
      description: data.description ?? "",
      remarks: data.remarks ?? "",
      taskType: data.taskType ?? "Back End",
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      uatDate: data.uatDate ? new Date(data.uatDate) : null,
      prdDate: data.prdDate ? new Date(data.prdDate) : null,
      projectId: data.projectId,
      priorityId: data.priorityId,
      statusId: data.statusId,
      assigneeId: data.assigneeId ?? null,
      sortOrder: data.sortOrder ?? 0,
      statusHistory: {
        create: {
          toStatusId: data.statusId,
          toStatusName: toStatus?.name ?? "",
          changedAt: new Date(),
        },
      },
    },
    include: taskInclude,
  });
  return serializeTask(task);
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
    uatDate: string | null;
    prdDate: string | null;
    priorityId: string;
    statusId: string;
    assigneeId: string | null;
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

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.remarks !== undefined ? { remarks: data.remarks } : {}),
      ...(data.taskType !== undefined ? { taskType: data.taskType } : {}),
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
      ...(data.assigneeId !== undefined ? { assigneeId: data.assigneeId } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
    },
    include: taskInclude,
  });
  return serializeTask(task);
}

export async function deleteTask(id: string) {
  await prisma.task.delete({ where: { id } });
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

  const statuses = [
    { name: "Backlog", color: "#6B7280", sortOrder: 0 },
    { name: "In Progress", color: "#3B82F6", sortOrder: 1 },
    { name: "Done", color: "#6BB82A", sortOrder: 2 },
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

  return defaultProject;
}
