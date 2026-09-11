import { NextResponse } from "next/server";
import { createTag, listTags } from "@/lib/db";

export async function GET() {
  try {
    const tags = await listTags();
    return NextResponse.json(tags);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load tags" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const tag = await createTag({
      name: body.name,
      color: body.color,
    });
    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create tag" },
      { status: 500 },
    );
  }
}
