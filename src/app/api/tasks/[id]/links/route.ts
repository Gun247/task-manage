import { NextResponse } from "next/server";
import { createTaskLink, listTaskLinks } from "@/lib/db";
import type { TaskLinkType } from "@/lib/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const links = await listTaskLinks(id);
    return NextResponse.json(links);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load links";
    const status = message.includes("Prisma") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const linkType: TaskLinkType =
      body.linkType === "blocks" ? "blocks" : "relates";
    const link = await createTaskLink({
      fromTaskId: id,
      toTaskId: typeof body.toTaskId === "string" ? body.toTaskId : "",
      linkType,
    });
    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create link";
    const status =
      message.includes("ไม่สามารถ") ||
      message.includes("ลิงก์") ||
      message.includes("not found") ||
      message.includes("Prisma")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
