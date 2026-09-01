import { NextResponse } from "next/server";
import {
  getDatabaseMode,
  getExcelFilePath,
  getSheetsSetupHint,
  isSheetsConfigured,
} from "@/lib/db-config";
import { listProjects } from "@/lib/db";

export async function GET() {
  const mode = getDatabaseMode();

  if (mode === "excel") {
    try {
      const projects = await listProjects();
      return NextResponse.json({
        mode,
        connected: true,
        filePath: getExcelFilePath(),
        projectCount: projects.length,
      });
    } catch (error) {
      return NextResponse.json(
        {
          mode,
          connected: false,
          filePath: getExcelFilePath(),
          error: error instanceof Error ? error.message : "Connection failed",
        },
        { status: 503 },
      );
    }
  }

  if (mode === "sqlite") {
    return NextResponse.json({
      mode,
      connected: true,
      message: "ใช้ SQLite local (dev.db)",
    });
  }

  if (!isSheetsConfigured()) {
    return NextResponse.json(
      {
        mode,
        connected: false,
        hint: getSheetsSetupHint(),
      },
      { status: 503 },
    );
  }

  try {
    const projects = await listProjects();
    return NextResponse.json({
      mode,
      connected: true,
      projectCount: projects.length,
      spreadsheetId: process.env.GOOGLE_SHEETS_ID ?? null,
      via: process.env.GOOGLE_APPS_SCRIPT_URL ? "apps-script" : "service-account",
    });
  } catch (error) {
    return NextResponse.json(
      {
        mode,
        connected: false,
        error: error instanceof Error ? error.message : "Connection failed",
      },
      { status: 503 },
    );
  }
}
