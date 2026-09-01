import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const tasks = await prisma.task.findMany({
    include: {
      priority: true,
      status: true,
      assignee: true,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(tasks);
}

export async function POST(request: Request) {
  const body = await request.json();

  const defaultStatus = await prisma.status.findFirst({
    orderBy: { sortOrder: "asc" },
  });
  const defaultPriority = await prisma.priority.findFirst({
    orderBy: { sortOrder: "asc" },
  });

  if (!defaultStatus || !defaultPriority) {
    return NextResponse.json(
      { error: "Missing default status or priority" },
      { status: 400 },
    );
  }

  const task = await prisma.task.create({
    data: {
      name: body.name,
      description: body.description ?? "",
      remarks: body.remarks ?? "",
      taskType: body.taskType ?? "Back End",
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      priorityId: body.priorityId ?? defaultPriority.id,
      statusId: body.statusId ?? defaultStatus.id,
      assigneeId: body.assigneeId ?? null,
      sortOrder: body.sortOrder ?? 0,
    },
    include: {
      priority: true,
      status: true,
      assignee: true,
    },
  });

  return NextResponse.json(task, { status: 201 });
}
