import { NextResponse } from "next/server";
import { deleteProject, getColorThemeById, updateProject } from "@/lib/db";
import { isBuiltinThemeId, themeAccentColor } from "@/lib/themes";

type RouteContext = { params: Promise<{ id: string }> };

async function resolveAccent(theme: string) {
  if (!isBuiltinThemeId(theme)) {
    const custom = await getColorThemeById(theme);
    if (custom?.palette && typeof custom.palette === "object") {
      const primary = (custom.palette as { primary?: string }).primary;
      if (primary) return primary;
    }
  }
  return themeAccentColor(theme);
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const project = await updateProject(id, {
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.description !== undefined
        ? { description: body.description.trim() }
        : {}),
      ...(body.theme !== undefined
        ? {
            theme: body.theme,
            color: await resolveAccent(String(body.theme)),
          }
        : {}),
      ...(body.wipLimits !== undefined &&
      typeof body.wipLimits === "object" &&
      body.wipLimits !== null
        ? { wipLimits: body.wipLimits as Record<string, number> }
        : {}),
    });

    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update project" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await deleteProject(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("existing tasks")) {
      return NextResponse.json(
        { error: "Cannot delete project with existing tasks" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete project" },
      { status: 500 },
    );
  }
}
