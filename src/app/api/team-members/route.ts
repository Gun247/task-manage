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
    const nickname = typeof body.nickname === "string" ? body.nickname.trim() : "";
    if (!nickname) {
      return NextResponse.json({ error: "Nickname is required" }, { status: 400 });
    }

    const member = await createTeamMember({
      name: typeof body.name === "string" ? body.name : "",
      nickname,
      email: typeof body.email === "string" ? body.email : "",
      employeeId: typeof body.employeeId === "string" ? body.employeeId : "",
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
