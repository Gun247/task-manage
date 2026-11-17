import { NextResponse } from "next/server";
import { deleteTaskComment } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string; commentId: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { commentId } = await context.params;
    await deleteTaskComment(commentId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete comment";
    const status = message.includes("Prisma") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
