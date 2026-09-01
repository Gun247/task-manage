import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const statuses = await prisma.status.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(statuses);
}

export async function POST(request: Request) {
  const body = await request.json();
  const maxOrder = await prisma.status.aggregate({ _max: { sortOrder: true } });

  const status = await prisma.status.create({
    data: {
      name: body.name,
      color: body.color ?? "#6B7280",
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json(status, { status: 201 });
}
