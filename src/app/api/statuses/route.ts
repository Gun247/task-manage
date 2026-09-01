import { NextResponse } from "next/server";
import { createStatus, listStatuses } from "@/lib/db";

export async function GET() {
  try {
    const statuses = await listStatuses();
    return NextResponse.json(statuses);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load statuses" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const status = await createStatus({
      name: body.name,
      color: body.color,
    });
    return NextResponse.json(status, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create status" },
      { status: 500 },
    );
  }
}
