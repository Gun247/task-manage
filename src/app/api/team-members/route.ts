import { NextResponse } from "next/server";
import { createTeamMember, listTeamMembers } from "@/lib/db";

export async function GET() {
  try {
    const members = await listTeamMembers();
    return NextResponse.json(members);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load team members" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const member = await createTeamMember({
      nickname: body.nickname,
      color: body.color,
    });
    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create team member" },
      { status: 500 },
    );
  }
}
