import { NextResponse } from "next/server";
import { deleteStatus, updateStatus } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const status = await updateStatus(id, {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.color !== undefined ? { color: body.color } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
    });

    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update status" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    await deleteStatus(id, body.moveToStatusId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const taskCount = (error as Error & { taskCount?: number }).taskCount;
    if (taskCount) {
      return NextResponse.json(
        {
          error: "Status has tasks. Provide moveToStatusId to reassign them.",
          taskCount,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete status" },
      { status: 500 },
    );
  }
}
