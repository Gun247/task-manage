import { NextResponse } from "next/server";
import {
  deleteColorTheme,
  getColorThemeById,
  listColorThemes,
  updateColorTheme,
} from "@/lib/db";
import { BUILTIN_THEME_IDS } from "@/lib/themes";
import { validateThemeDefinition } from "@/lib/theme-definition";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const theme = await getColorThemeById(id);
    if (!theme) {
      return NextResponse.json({ error: "Theme not found" }, { status: 404 });
    }
    return NextResponse.json(theme);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load theme",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const existing = await getColorThemeById(id);
    if (!existing) {
      return NextResponse.json({ error: "Theme not found" }, { status: 404 });
    }

    const body = await request.json();
    const others = await listColorThemes();
    const reserved = new Set<string>([
      ...BUILTIN_THEME_IDS,
      ...others.filter((theme) => theme.id !== id).map((theme) => theme.id),
    ]);

    const merged = {
      id,
      label: body.label ?? existing.label,
      description:
        body.description !== undefined
          ? body.description
          : existing.description,
      ...(typeof existing.palette === "object" && existing.palette
        ? (existing.palette as Record<string, unknown>)
        : {}),
      ...body,
      id,
    };

    const result = validateThemeDefinition(merged, {
      reservedIds: reserved,
      requireId: true,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: "ข้อมูลธีมไม่ผ่านมาตรฐาน", issues: result.issues },
        { status: 400 },
      );
    }

    if (result.value.id !== id) {
      return NextResponse.json(
        { error: "ไม่สามารถเปลี่ยน id ของธีมได้" },
        { status: 400 },
      );
    }

    const theme = await updateColorTheme(id, {
      label: result.value.label,
      description: result.value.description,
      palette: result.value.palette,
    });

    return NextResponse.json(theme);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update theme",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const existing = await getColorThemeById(id);
    if (!existing) {
      return NextResponse.json({ error: "Theme not found" }, { status: 404 });
    }
    await deleteColorTheme(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete theme",
      },
      { status: 500 },
    );
  }
}
