import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const priorities = await prisma.priority.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(priorities);
}

export async function PATCH(request: Request) {
  const body = await request.json();

  if (!body.id) {
    return NextResponse.json({ error: "Priority id is required" }, { status: 400 });
  }

  const priority = await prisma.priority.update({
    where: { id: body.id },
    data: {
      ...(body.color !== undefined ? { color: body.color } : {}),
      ...(body.label !== undefined ? { label: body.label } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
    },
  });

  return NextResponse.json(priority);
}
