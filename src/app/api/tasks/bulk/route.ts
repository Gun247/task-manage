import { NextResponse } from "next/server";
import { bulkDeleteTasks, bulkUpdateTasks } from "@/lib/db";

function parseIds(ids: unknown) {
  if (!Array.isArray(ids)) return [];
  return [
    ...new Set(
      ids.filter(
        (id): id is string => typeof id === "string" && id.trim().length > 0,
      ),
    ),
  ];
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      ids?: unknown;
      statusId?: string;
      startDate?: string | null;
      endDate?: string | null;
      uatDate?: string | null;
      prdDate?: string | null;
    };

    const ids = parseIds(body.ids);

    if (ids.length === 0) {
      return NextResponse.json(
        { error: "กรุณาเลือกรายการอย่างน้อย 1 รายการ" },
        { status: 400 },
      );
    }

    const hasStatus = body.statusId !== undefined;
    const hasDates =
      body.startDate !== undefined ||
      body.endDate !== undefined ||
      body.uatDate !== undefined ||
      body.prdDate !== undefined;

    if (!hasStatus && !hasDates) {
      return NextResponse.json(
        { error: "ระบุสถานะหรือวันที่ที่ต้องการเปลี่ยน" },
        { status: 400 },
      );
    }

    const result = await bulkUpdateTasks(ids, {
      ...(hasStatus ? { statusId: body.statusId } : {}),
      ...(body.startDate !== undefined
        ? { startDate: body.startDate || null }
        : {}),
      ...(body.endDate !== undefined ? { endDate: body.endDate || null } : {}),
      ...(body.uatDate !== undefined ? { uatDate: body.uatDate || null } : {}),
      ...(body.prdDate !== undefined ? { prdDate: body.prdDate || null } : {}),
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to bulk update tasks",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { ids?: unknown };
    const ids = parseIds(body.ids);

    if (ids.length === 0) {
      return NextResponse.json(
        { error: "กรุณาเลือกรายการอย่างน้อย 1 รายการ" },
        { status: 400 },
      );
    }

    const result = await bulkDeleteTasks(ids);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to bulk delete tasks",
      },
      { status: 500 },
    );
  }
}
