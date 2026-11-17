import { NextResponse } from "next/server";
import {
  listNotifications,
  markAllNotificationsRead,
} from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teamMemberId = searchParams.get("teamMemberId");
    if (!teamMemberId) {
      return NextResponse.json(
        { error: "teamMemberId is required" },
        { status: 400 },
      );
    }
    const notifications = await listNotifications(teamMemberId);
    return NextResponse.json(notifications);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load notifications";
    const status = message.includes("Prisma") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const teamMemberId =
      typeof body.teamMemberId === "string" ? body.teamMemberId : "";
    if (!teamMemberId) {
      return NextResponse.json(
        { error: "teamMemberId is required" },
        { status: 400 },
      );
    }
    if (body.markAllRead) {
      await markAllNotificationsRead(teamMemberId);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update notifications";
    const status = message.includes("Prisma") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
