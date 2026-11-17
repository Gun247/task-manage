import { NextResponse } from "next/server";
import { findTeamMemberByEmployeeId } from "@/lib/db";
import { parseMemberRole } from "@/lib/roles";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const employeeId =
      typeof body.employeeId === "string" ? body.employeeId.trim() : "";
    if (!employeeId) {
      return NextResponse.json(
        { error: "กรุณากรอกเลขพนักงาน" },
        { status: 400 },
      );
    }

    const member = await findTeamMemberByEmployeeId(employeeId);
    if (!member) {
      return NextResponse.json(
        { error: "ไม่พบเลขพนักงานนี้ในทีม หรือยังไม่ได้ลงทะเบียน" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: member.id,
      nickname: member.nickname,
      name: member.name,
      employeeId: member.employeeId,
      role: parseMemberRole(member.role),
      color: member.color,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "เข้าสู่ระบบไม่สำเร็จ" },
      { status: 500 },
    );
  }
}
