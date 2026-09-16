import { NextResponse } from "next/server";
import { listTimelineTasks } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const tasks = await listTimelineTasks(projectId);
    return NextResponse.json(tasks);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load timeline tasks",
      },
      { status: 500 },
    );
  }
}
