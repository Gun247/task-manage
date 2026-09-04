import { NextResponse } from "next/server";
import { createTaskType, listTaskTypes } from "@/lib/db";

export async function GET() {
  try {
    const types = await listTaskTypes();
    return NextResponse.json(types);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load task types" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const type = await createTaskType({
      name: body.name,
      color: body.color,
    });
    return NextResponse.json(type, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create task type" },
      { status: 500 },
    );
  }
}
