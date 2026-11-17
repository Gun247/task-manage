import { NextResponse } from "next/server";
import {
  createProject,
  getColorThemeById,
  getDatabaseMode,
  listProjects,
  seedDefaultData,
} from "@/lib/db";
import { isBuiltinThemeId, themeAccentColor } from "@/lib/themes";

async function resolveAccent(theme: string | undefined) {
  if (theme && !isBuiltinThemeId(theme)) {
    const custom = await getColorThemeById(theme);
    if (custom?.palette && typeof custom.palette === "object") {
      const primary = (custom.palette as { primary?: string }).primary;
      if (primary) return primary;
    }
  }
  return themeAccentColor(theme);
}

export async function GET() {
  try {
    let projects = await listProjects();
    if (
      (getDatabaseMode() === "sqlite" || getDatabaseMode() === "excel") &&
      projects.length === 0
    ) {
      await seedDefaultData();
      projects = await listProjects();
    }
    return NextResponse.json(projects);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load projects" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }

    const theme = body.theme;
    const project = await createProject({
      name: body.name.trim(),
      description: body.description?.trim(),
      theme,
      color: await resolveAccent(theme),
      ...(body.wipLimits !== undefined &&
      typeof body.wipLimits === "object" &&
      body.wipLimits !== null
        ? { wipLimits: body.wipLimits as Record<string, number> }
        : {}),
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create project" },
      { status: 500 },
    );
  }
}
