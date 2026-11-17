import { NextResponse } from "next/server";
import { listTaskWatchers, setTaskWatching } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const watchers = await listTaskWatchers(id);
    return NextResponse.json(watchers);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load watchers";
    const status = message.includes("Prisma") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const teamMemberId =
      typeof body.teamMemberId === "string" ? body.teamMemberId : "";
    const watching = Boolean(body.watching);
    if (!teamMemberId) {
      return NextResponse.json(
        { error: "กรุณาเลือกสมาชิกทีม" },
        { status: 400 },
      );
    }
    const watchers = await setTaskWatching({
      taskId: id,
      teamMemberId,
      watching,
    });
    return NextResponse.json(watchers);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update watch";
    const status =
      message.includes("not found") || message.includes("Prisma") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
