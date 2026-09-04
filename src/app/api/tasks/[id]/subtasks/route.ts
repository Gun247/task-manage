import { NextResponse } from "next/server";
import { createSubtask } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: taskId } = await context.params;
    const body = await request.json();

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Subtask name is required" }, { status: 400 });
    }

    const subtask = await createSubtask({
      taskId,
      name: body.name.trim(),
    });

    return NextResponse.json(subtask, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create subtask" },
      { status: 500 },
    );
  }
}
