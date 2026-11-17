import { prisma } from "@/lib/prisma";
import type { TaskFilters, TaskLinkType } from "@/lib/types";

function serializeComment(entry: {
  id: string;
  taskId: string;
  body: string;
  authorId: string | null;
  authorNickname: string;
  createdAt: Date;
}) {
  return {
    id: entry.id,
    taskId: entry.taskId,
    body: entry.body,
    authorId: entry.authorId,
    authorNickname: entry.authorNickname,
    createdAt: entry.createdAt.toISOString(),
  };
}

export async function listTaskComments(taskId: string) {
  const rows = await prisma.taskComment.findMany({
    where: { taskId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(serializeComment);
}

export async function createTaskComment(data: {
  taskId: string;
  body: string;
  authorId?: string | null;
}) {
  const body = data.body.trim();
  if (!body) throw new Error("กรุณากรอกความคิดเห็น");

  const task = await prisma.task.findUnique({
    where: { id: data.taskId },
    include: { watchers: true },
  });
  if (!task) throw new Error("Task not found");

  let authorNickname = "ระบบ";
  if (data.authorId) {
    const author = await prisma.teamMember.findUnique({
      where: { id: data.authorId },
    });
    authorNickname = author?.nickname ?? "ไม่ทราบชื่อ";
  }

  const comment = await prisma.taskComment.create({
    data: {
      taskId: data.taskId,
      body,
      authorId: data.authorId || null,
      authorNickname,
    },
  });

  const watcherIds = task.watchers
    .map((w) => w.teamMemberId)
    .filter((id) => id !== data.authorId);
  if (watcherIds.length > 0) {
    await prisma.notification.createMany({
      data: watcherIds.map((teamMemberId) => ({
        teamMemberId,
        taskId: task.id,
        title: `ความคิดเห็นใหม่: ${task.name}`,
        body: `${authorNickname}: ${body.slice(0, 120)}`,
        kind: "comment",
      })),
    });
  }

  return serializeComment(comment);
}

export async function deleteTaskComment(id: string) {
  await prisma.taskComment.delete({ where: { id } });
}

function serializeLink(entry: {
  id: string;
  fromTaskId: string;
  toTaskId: string;
  linkType: string;
  createdAt: Date;
  fromTask: { id: string; name: string; status: { name: string } };
  toTask: { id: string; name: string; status: { name: string } };
}, forTaskId: string) {
  const outbound = entry.fromTaskId === forTaskId;
  const other = outbound ? entry.toTask : entry.fromTask;
  return {
    id: entry.id,
    fromTaskId: entry.fromTaskId,
    toTaskId: entry.toTaskId,
    linkType: entry.linkType,
    direction: (outbound ? "out" : "in") as "out" | "in",
    otherTask: {
      id: other.id,
      name: other.name,
      statusName: other.status.name,
    },
    createdAt: entry.createdAt.toISOString(),
  };
}

export async function listTaskLinks(taskId: string) {
  const rows = await prisma.taskLink.findMany({
    where: { OR: [{ fromTaskId: taskId }, { toTaskId: taskId }] },
    include: {
      fromTask: { include: { status: true } },
      toTask: { include: { status: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((row) => serializeLink(row, taskId));
}

export async function createTaskLink(data: {
  fromTaskId: string;
  toTaskId: string;
  linkType?: TaskLinkType;
}) {
  if (data.fromTaskId === data.toTaskId) {
    throw new Error("ไม่สามารถลิงก์ task กับตัวเองได้");
  }
  const linkType = data.linkType ?? "relates";
  const [fromTask, toTask] = await Promise.all([
    prisma.task.findUnique({ where: { id: data.fromTaskId } }),
    prisma.task.findUnique({ where: { id: data.toTaskId } }),
  ]);
  if (!fromTask || !toTask) throw new Error("Task not found");
  if (fromTask.projectId !== toTask.projectId) {
    throw new Error("ลิงก์ได้เฉพาะ task ในโปรเจกต์เดียวกัน");
  }

  const created = await prisma.taskLink.create({
    data: {
      fromTaskId: data.fromTaskId,
      toTaskId: data.toTaskId,
      linkType,
    },
    include: {
      fromTask: { include: { status: true } },
      toTask: { include: { status: true } },
    },
  });
  return serializeLink(created, data.fromTaskId);
}

export async function deleteTaskLink(id: string) {
  await prisma.taskLink.delete({ where: { id } });
}

export async function listTaskWatchers(taskId: string) {
  const rows = await prisma.taskWatcher.findMany({
    where: { taskId },
    include: { teamMember: true },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((row) => row.teamMember);
}

export async function setTaskWatching(data: {
  taskId: string;
  teamMemberId: string;
  watching: boolean;
}) {
  const task = await prisma.task.findUnique({ where: { id: data.taskId } });
  if (!task) throw new Error("Task not found");
  const member = await prisma.teamMember.findUnique({
    where: { id: data.teamMemberId },
  });
  if (!member) throw new Error("Team member not found");

  if (data.watching) {
    await prisma.taskWatcher.upsert({
      where: {
        taskId_teamMemberId: {
          taskId: data.taskId,
          teamMemberId: data.teamMemberId,
        },
      },
      update: {},
      create: { taskId: data.taskId, teamMemberId: data.teamMemberId },
    });
  } else {
    await prisma.taskWatcher.deleteMany({
      where: { taskId: data.taskId, teamMemberId: data.teamMemberId },
    });
  }
  return listTaskWatchers(data.taskId);
}

export async function notifyTaskWatchers(data: {
  taskId: string;
  title: string;
  body?: string;
  kind?: string;
  excludeMemberId?: string | null;
}) {
  const watchers = await prisma.taskWatcher.findMany({
    where: { taskId: data.taskId },
  });
  const ids = watchers
    .map((w) => w.teamMemberId)
    .filter((id) => id !== data.excludeMemberId);
  if (ids.length === 0) return 0;
  await prisma.notification.createMany({
    data: ids.map((teamMemberId) => ({
      teamMemberId,
      taskId: data.taskId,
      title: data.title,
      body: data.body ?? "",
      kind: data.kind ?? "info",
    })),
  });
  return ids.length;
}

export async function listNotifications(teamMemberId: string) {
  const rows = await prisma.notification.findMany({
    where: { teamMemberId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map((row) => ({
    id: row.id,
    teamMemberId: row.teamMemberId,
    taskId: row.taskId,
    title: row.title,
    body: row.body,
    kind: row.kind,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function markNotificationRead(id: string) {
  return prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(teamMemberId: string) {
  await prisma.notification.updateMany({
    where: { teamMemberId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function listSavedFilters(projectId?: string | null) {
  const rows = await prisma.savedFilter.findMany({
    where: projectId
      ? { OR: [{ projectId }, { projectId: null }] }
      : undefined,
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => {
    let filters: TaskFilters & { scope?: string } = {
      search: "",
      statusId: "",
      priorityId: "",
      assigneeId: "",
      taskType: "",
      date: "",
      dateField: "",
      overdue: "",
    };
    try {
      filters = { ...filters, ...(JSON.parse(row.filtersJson) as TaskFilters) };
    } catch {
      /* keep defaults */
    }
    return {
      id: row.id,
      name: row.name,
      projectId: row.projectId,
      filters,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  });
}

export async function createSavedFilter(data: {
  name: string;
  projectId?: string | null;
  filters: TaskFilters & { scope?: string };
}) {
  const name = data.name.trim();
  if (!name) throw new Error("กรุณาตั้งชื่อฟิลเตอร์");
  const row = await prisma.savedFilter.create({
    data: {
      name,
      projectId: data.projectId || null,
      filtersJson: JSON.stringify(data.filters),
    },
  });
  return {
    id: row.id,
    name: row.name,
    projectId: row.projectId,
    filters: data.filters,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function deleteSavedFilter(id: string) {
  await prisma.savedFilter.delete({ where: { id } });
}

export async function getTaskCollaboration(taskId: string) {
  const [comments, links, watchers] = await Promise.all([
    listTaskComments(taskId),
    listTaskLinks(taskId),
    listTaskWatchers(taskId),
  ]);
  return { comments, links, watchers };
}
