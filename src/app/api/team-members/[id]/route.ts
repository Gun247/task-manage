import { NextResponse } from "next/server";
import { deleteTeamMember, updateTeamMember } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const member = await updateTeamMember(id, {
      ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
      ...(body.nickname !== undefined
        ? { nickname: String(body.nickname).trim() }
        : {}),
      ...(body.email !== undefined ? { email: String(body.email).trim() } : {}),
      ...(body.employeeId !== undefined
        ? { employeeId: String(body.employeeId).trim() }
        : {}),
      ...(body.color !== undefined ? { color: body.color } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
    });

    return NextResponse.json(member);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update team member" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await deleteTeamMember(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete team member" },
      { status: 500 },
    );
  }
}
