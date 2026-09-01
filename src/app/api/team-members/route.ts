import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const members = await prisma.teamMember.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(members);
}

export async function POST(request: Request) {
  const body = await request.json();
  const maxOrder = await prisma.teamMember.aggregate({
    _max: { sortOrder: true },
  });

  const member = await prisma.teamMember.create({
    data: {
      nickname: body.nickname,
      color: body.color ?? "#3B82F6",
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json(member, { status: 201 });
}
