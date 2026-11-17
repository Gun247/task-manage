import { NextResponse } from "next/server";
import { createTaskComment, listTaskComments } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const comments = await listTaskComments(id);
    return NextResponse.json(comments);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load comments";
    const status = message.includes("Prisma") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const comment = await createTaskComment({
      taskId: id,
      body: typeof body.body === "string" ? body.body : "",
      authorId:
        typeof body.authorId === "string" && body.authorId
          ? body.authorId
          : null,
    });
    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create comment";
    const status =
      message.includes("กรุณา") ||
      message.includes("not found") ||
      message.includes("Prisma")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
