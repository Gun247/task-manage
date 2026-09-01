import { NextResponse } from "next/server";
import { listPriorities, updatePriority } from "@/lib/db";

export async function GET() {
  try {
    const priorities = await listPriorities();
    return NextResponse.json(priorities);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load priorities" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: "Priority id is required" }, { status: 400 });
    }

    const priority = await updatePriority(body.id, {
      ...(body.color !== undefined ? { color: body.color } : {}),
      ...(body.label !== undefined ? { label: body.label } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
    });

    return NextResponse.json(priority);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update priority" },
      { status: 500 },
    );
  }
}
