import { NextResponse } from "next/server";
import {
  createColorTheme,
  getColorThemeById,
  listColorThemes,
} from "@/lib/db";
import { BUILTIN_THEME_IDS } from "@/lib/themes";
import {
  parseThemeImportPayload,
  validateThemeDefinition,
} from "@/lib/theme-definition";

export async function GET() {
  try {
    const themes = await listColorThemes();
    return NextResponse.json(themes);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load themes",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const existing = await listColorThemes();
    const reserved = new Set<string>([
      ...BUILTIN_THEME_IDS,
      ...existing.map((theme) => theme.id),
    ]);

    const mode = body?.mode === "import" ? "import" : "create";

    if (mode === "import") {
      const payload = body?.payload ?? body?.themes ?? body;
      const parsed = parseThemeImportPayload(
        body?.payload !== undefined
          ? body.payload
          : body?.themes !== undefined
            ? { themes: body.themes }
            : payload,
      );
      if (parsed.issues.length > 0) {
        return NextResponse.json(
          { error: "รูปแบบนำเข้าไม่ถูกต้อง", issues: parsed.issues },
          { status: 400 },
        );
      }

      const created: unknown[] = [];
      const failed: { index: number; issues: unknown[] }[] = [];

      for (let index = 0; index < parsed.items.length; index += 1) {
        const result = validateThemeDefinition(parsed.items[index], {
          reservedIds: reserved,
        });
        if (!result.ok) {
          failed.push({ index, issues: result.issues });
          continue;
        }
        if (reserved.has(result.value.id)) {
          failed.push({
            index,
            issues: [
              {
                path: "id",
                message: `id "${result.value.id}" ซ้ำ`,
              },
            ],
          });
          continue;
        }
        const row = await createColorTheme({
          id: result.value.id,
          label: result.value.label,
          description: result.value.description,
          palette: result.value.palette,
        });
        reserved.add(result.value.id);
        created.push(row);
      }

      return NextResponse.json(
        {
          created,
          failed,
          standard:
            "ต้องมี label, primary, accent, background, foreground เป็น #RRGGBB",
        },
        { status: created.length > 0 ? 201 : 400 },
      );
    }

    const result = validateThemeDefinition(body, { reservedIds: reserved });
    if (!result.ok) {
      return NextResponse.json(
        { error: "ข้อมูลธีมไม่ผ่านมาตรฐาน", issues: result.issues },
        { status: 400 },
      );
    }

    const existingRow = await getColorThemeById(result.value.id);
    if (existingRow) {
      return NextResponse.json(
        { error: `ธีม id "${result.value.id}" มีอยู่แล้ว` },
        { status: 409 },
      );
    }

    const theme = await createColorTheme({
      id: result.value.id,
      label: result.value.label,
      description: result.value.description,
      palette: result.value.palette,
    });

    return NextResponse.json(theme, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create theme",
      },
      { status: 500 },
    );
  }
}
