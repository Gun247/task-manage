import { NextResponse } from "next/server";
import { deleteSubtask, updateSubtask } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const subtask = await updateSubtask(id, {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.isDone !== undefined ? { isDone: Boolean(body.isDone) } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
      ...(body.assigneeIds !== undefined
        ? {
            assigneeIds: Array.isArray(body.assigneeIds)
              ? body.assigneeIds
              : [],
          }
        : {}),
    });

    return NextResponse.json(subtask);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update subtask" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await deleteSubtask(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete subtask" },
      { status: 500 },
    );
  }
}
