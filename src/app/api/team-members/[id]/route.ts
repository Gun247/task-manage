import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();

  const member = await prisma.teamMember.update({
    where: { id },
    data: {
      ...(body.nickname !== undefined ? { nickname: body.nickname } : {}),
      ...(body.color !== undefined ? { color: body.color } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
    },
  });

  return NextResponse.json(member);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  await prisma.task.updateMany({
    where: { assigneeId: id },
    data: { assigneeId: null },
  });

  await prisma.teamMember.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
