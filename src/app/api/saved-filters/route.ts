import { NextResponse } from "next/server";
import { createSavedFilter, listSavedFilters } from "@/lib/db";
import type { TaskFilters } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const filters = await listSavedFilters(projectId);
    return NextResponse.json(filters);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load saved filters";
    const status = message.includes("Prisma") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const saved = await createSavedFilter({
      name: typeof body.name === "string" ? body.name : "",
      projectId:
        typeof body.projectId === "string" && body.projectId
          ? body.projectId
          : null,
      filters: (body.filters ?? {}) as TaskFilters & {
        scope?: "postRelease" | "rework" | "";
      },
    });
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create saved filter";
    const status =
      message.includes("กรุณา") || message.includes("Prisma") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
