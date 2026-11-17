import { NextResponse } from "next/server";
import { deleteTaskLink } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string; linkId: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { linkId } = await context.params;
    await deleteTaskLink(linkId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete link";
    const status = message.includes("Prisma") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
