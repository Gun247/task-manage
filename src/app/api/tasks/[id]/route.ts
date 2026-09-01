import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.remarks !== undefined ? { remarks: body.remarks } : {}),
      ...(body.taskType !== undefined ? { taskType: body.taskType } : {}),
      ...(body.startDate !== undefined
        ? { startDate: body.startDate ? new Date(body.startDate) : null }
        : {}),
      ...(body.endDate !== undefined
        ? { endDate: body.endDate ? new Date(body.endDate) : null }
        : {}),
      ...(body.priorityId !== undefined ? { priorityId: body.priorityId } : {}),
      ...(body.statusId !== undefined ? { statusId: body.statusId } : {}),
      ...(body.assigneeId !== undefined
        ? { assigneeId: body.assigneeId || null }
        : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
    },
    include: {
      priority: true,
      status: true,
      assignee: true,
    },
  });

  return NextResponse.json(task);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
