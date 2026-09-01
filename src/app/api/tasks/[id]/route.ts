import { NextResponse } from "next/server";
import { deleteTask, updateTask } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const task = await updateTask(id, {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.remarks !== undefined ? { remarks: body.remarks } : {}),
      ...(body.taskType !== undefined ? { taskType: body.taskType } : {}),
      ...(body.startDate !== undefined
        ? { startDate: body.startDate ? body.startDate : null }
        : {}),
      ...(body.endDate !== undefined
        ? { endDate: body.endDate ? body.endDate : null }
        : {}),
      ...(body.priorityId !== undefined ? { priorityId: body.priorityId } : {}),
      ...(body.statusId !== undefined ? { statusId: body.statusId } : {}),
      ...(body.assigneeId !== undefined
        ? { assigneeId: body.assigneeId || null }
        : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
    });

    return NextResponse.json(task);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update task" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await deleteTask(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete task" },
      { status: 500 },
    );
  }
}
