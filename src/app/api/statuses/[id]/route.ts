import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();

  const status = await prisma.status.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.color !== undefined ? { color: body.color } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
    },
  });

  return NextResponse.json(status);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));

  const taskCount = await prisma.task.count({ where: { statusId: id } });
  if (taskCount > 0) {
    if (!body.moveToStatusId) {
      return NextResponse.json(
        {
          error: "Status has tasks. Provide moveToStatusId to reassign them.",
          taskCount,
        },
        { status: 400 },
      );
    }

    await prisma.task.updateMany({
      where: { statusId: id },
      data: { statusId: body.moveToStatusId },
    });
  }

  await prisma.status.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
