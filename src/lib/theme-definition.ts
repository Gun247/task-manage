/**
 * Theme color import / authoring standard for FWF Task Manager.
 *
 * Required fields: label, primary, accent, background, foreground
 * Optional: id, description, primaryDark, muted, border, canvas,
 *           success, danger, warning, slate{50..900}
 *
 * Hex colors must be `#RRGGBB` (case-insensitive). Missing optional
 * tokens are derived from the required set so imports stay small.
 */

export const THEME_ID_PATTERN = /^[a-z][a-z0-9-]{1,39}$/;
export const THEME_LABEL_MAX = 80;
export const THEME_DESCRIPTION_MAX = 200;

export const REQUIRED_THEME_COLOR_KEYS = [
  "primary",
  "accent",
  "background",
  "foreground",
] as const;

export const OPTIONAL_THEME_COLOR_KEYS = [
  "primaryDark",
  "muted",
  "border",
  "canvas",
  "success",
  "danger",
  "warning",
] as const;

export const SLATE_KEYS = [
  "50",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
] as const;

export type ThemeColorKey =
  | (typeof REQUIRED_THEME_COLOR_KEYS)[number]
  | (typeof OPTIONAL_THEME_COLOR_KEYS)[number];

export type ThemeSlateScale = Record<(typeof SLATE_KEYS)[number], string>;

export type ThemePalette = Record<ThemeColorKey, string> & {
  slate: ThemeSlateScale;
};

export type ThemeDefinitionInput = {
  id?: string;
  label?: string;
  description?: string;
  primary?: string;
  primaryDark?: string;
  accent?: string;
  background?: string;
  foreground?: string;
  muted?: string;
  border?: string;
  canvas?: string;
  success?: string;
  danger?: string;
  warning?: string;
  slate?: Partial<ThemeSlateScale> | Record<string, string>;
};

export type NormalizedThemeDefinition = {
  id: string;
  label: string;
  description: string;
  palette: ThemePalette;
  swatches: [string, string, string];
};

export type ThemeValidationIssue = {
  path: string;
  message: string;
};

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

export function normalizeHexColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (!HEX_RE.test(withHash)) return null;
  return withHash.toUpperCase();
}

function clampByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hexToRgb(hex: string) {
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((channel) => clampByte(channel).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

function mixHex(a: string, b: string, weightTowardB: number) {
  const left = hexToRgb(a);
  const right = hexToRgb(b);
  const t = Math.max(0, Math.min(1, weightTowardB));
  return rgbToHex(
    left.r + (right.r - left.r) * t,
    left.g + (right.g - left.g) * t,
    left.b + (right.b - left.b) * t,
  );
}

function darken(hex: string, amount = 0.18) {
  return mixHex(hex, "#000000", amount);
}

function slugifyLabel(label: string) {
  const base = label
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  if (THEME_ID_PATTERN.test(base)) return base;
  return `theme-${Date.now().toString(36)}`;
}

export function deriveSlateScale(
  canvas: string,
  foreground: string,
): ThemeSlateScale {
  return {
    "50": mixHex(canvas, "#FFFFFF", 0.35),
    "100": mixHex(canvas, foreground, 0.06),
    "200": mixHex(canvas, foreground, 0.14),
    "300": mixHex(canvas, foreground, 0.24),
    "400": mixHex(canvas, foreground, 0.36),
    "500": mixHex(canvas, foreground, 0.48),
    "600": mixHex(canvas, foreground, 0.6),
    "700": mixHex(canvas, foreground, 0.7),
    "800": mixHex(canvas, foreground, 0.82),
    "900": foreground,
  };
}

export function buildPalette(input: {
  primary: string;
  accent: string;
  background: string;
  foreground: string;
  primaryDark?: string;
  muted?: string;
  border?: string;
  canvas?: string;
  success?: string;
  danger?: string;
  warning?: string;
  slate?: Partial<ThemeSlateScale>;
}): ThemePalette {
  const canvas = input.canvas ?? mixHex(input.background, "#F8FAFC", 0.5);
  const muted = input.muted ?? mixHex(input.background, input.primary, 0.12);
  const border = input.border ?? mixHex(canvas, input.foreground, 0.16);
  const derivedSlate = deriveSlateScale(canvas, input.foreground);
  const slate = { ...derivedSlate };
  if (input.slate) {
    for (const key of SLATE_KEYS) {
      const value = normalizeHexColor(input.slate[key]);
      if (value) slate[key] = value;
    }
  }

  return {
    primary: input.primary,
    primaryDark: input.primaryDark ?? darken(input.primary),
    accent: input.accent,
    background: input.background,
    foreground: input.foreground,
    muted,
    border,
    canvas,
    success: input.success ?? "#16A34A",
    danger: input.danger ?? "#EF4444",
    warning: input.warning ?? "#F59E0B",
    slate,
  };
}

export function paletteToCssVars(palette: ThemePalette): Record<string, string> {
  return {
    "--background": palette.background,
    "--foreground": palette.foreground,
    "--primary": palette.primary,
    "--primary-dark": palette.primaryDark,
    "--accent": palette.accent,
    "--muted": palette.muted,
    "--border": palette.border,
    "--canvas": palette.canvas,
    "--success": palette.success,
    "--danger": palette.danger,
    "--warning": palette.warning,
    "--color-slate-50": palette.slate["50"],
    "--color-slate-100": palette.slate["100"],
    "--color-slate-200": palette.slate["200"],
    "--color-slate-300": palette.slate["300"],
    "--color-slate-400": palette.slate["400"],
    "--color-slate-500": palette.slate["500"],
    "--color-slate-600": palette.slate["600"],
    "--color-slate-700": palette.slate["700"],
    "--color-slate-800": palette.slate["800"],
    "--color-slate-900": palette.slate["900"],
  };
}

export const THEME_CSS_VAR_KEYS = Object.keys(
  paletteToCssVars(
    buildPalette({
      primary: "#334155",
      accent: "#64748B",
      background: "#FFFFFF",
      foreground: "#0F172A",
    }),
  ),
);

export function validateThemeDefinition(
  raw: unknown,
  options?: { reservedIds?: Set<string>; requireId?: boolean },
): { ok: true; value: NormalizedThemeDefinition } | { ok: false; issues: ThemeValidationIssue[] } {
  const issues: ThemeValidationIssue[] = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      ok: false,
      issues: [{ path: "", message: "ธีมต้องเป็น object JSON" }],
    };
  }

  const input = raw as ThemeDefinitionInput;
  const label =
    typeof input.label === "string" ? input.label.trim() : "";
  if (!label) {
    issues.push({ path: "label", message: "ต้องมี label" });
  } else if (label.length > THEME_LABEL_MAX) {
    issues.push({
      path: "label",
      message: `label ยาวได้ไม่เกิน ${THEME_LABEL_MAX} ตัวอักษร`,
    });
  }

  const description =
    typeof input.description === "string" ? input.description.trim() : "";
  if (description.length > THEME_DESCRIPTION_MAX) {
    issues.push({
      path: "description",
      message: `description ยาวได้ไม่เกิน ${THEME_DESCRIPTION_MAX} ตัวอักษร`,
    });
  }

  let id =
    typeof input.id === "string" ? input.id.trim().toLowerCase() : "";
  if (!id && label) id = slugifyLabel(label);
  if (options?.requireId && !id) {
    issues.push({ path: "id", message: "ต้องมี id" });
  }
  if (id && !THEME_ID_PATTERN.test(id)) {
    issues.push({
      path: "id",
      message:
        "id ต้องเป็น a-z ขึ้นต้น ตามด้วย a-z 0-9 หรือ - ความยาว 2–40 ตัว",
    });
  }
  if (id && options?.reservedIds?.has(id)) {
    issues.push({
      path: "id",
      message: `id "${id}" ซ้ำกับธีมที่มีอยู่แล้วหรือธีมระบบ`,
    });
  }

  const colors: Partial<Record<ThemeColorKey, string>> = {};
  for (const key of REQUIRED_THEME_COLOR_KEYS) {
    const hex = normalizeHexColor(input[key]);
    if (!hex) {
      issues.push({
        path: key,
        message: `${key} ต้องเป็นสี hex #RRGGBB`,
      });
    } else {
      colors[key] = hex;
    }
  }
  for (const key of OPTIONAL_THEME_COLOR_KEYS) {
    if (input[key] === undefined || input[key] === "") continue;
    const hex = normalizeHexColor(input[key]);
    if (!hex) {
      issues.push({
        path: key,
        message: `${key} ต้องเป็นสี hex #RRGGBB`,
      });
    } else {
      colors[key] = hex;
    }
  }

  const partial: Partial<ThemeSlateScale> = {};
  if (input.slate !== undefined) {
    if (!input.slate || typeof input.slate !== "object" || Array.isArray(input.slate)) {
      issues.push({ path: "slate", message: "slate ต้องเป็น object" });
    } else {
      for (const [key, value] of Object.entries(input.slate)) {
        if (!(SLATE_KEYS as readonly string[]).includes(key)) {
          issues.push({
            path: `slate.${key}`,
            message: `slate รองรับเฉพาะคีย์ ${SLATE_KEYS.join(", ")}`,
          });
          continue;
        }
        const hex = normalizeHexColor(value);
        if (!hex) {
          issues.push({
            path: `slate.${key}`,
            message: `slate.${key} ต้องเป็นสี hex #RRGGBB`,
          });
        } else {
          partial[key as (typeof SLATE_KEYS)[number]] = hex;
        }
      }
    }
  }

  if (issues.length > 0) return { ok: false, issues };

  const palette = buildPalette({
    primary: colors.primary!,
    accent: colors.accent!,
    background: colors.background!,
    foreground: colors.foreground!,
    primaryDark: colors.primaryDark,
    muted: colors.muted,
    border: colors.border,
    canvas: colors.canvas,
    success: colors.success,
    danger: colors.danger,
    warning: colors.warning,
    slate: partial,
  });

  return {
    ok: true,
    value: {
      id,
      label,
      description,
      palette,
      swatches: [palette.primary, palette.accent, palette.muted],
    },
  };
}

/** Parse import payload: one theme object, or `{ themes: [...] }`, or an array. */
export function parseThemeImportPayload(raw: unknown): {
  items: unknown[];
  issues: ThemeValidationIssue[];
} {
  if (Array.isArray(raw)) {
    if (raw.length === 0) {
      return {
        items: [],
        issues: [{ path: "", message: "อาร์เรย์ธีมว่างเปล่า" }],
      };
    }
    if (raw.length > 50) {
      return {
        items: [],
        issues: [{ path: "", message: "นำเข้าได้ไม่เกิน 50 ธีมต่อครั้ง" }],
      };
    }
    return { items: raw, issues: [] };
  }

  if (raw && typeof raw === "object") {
    const record = raw as { themes?: unknown };
    if (Array.isArray(record.themes)) {
      if (record.themes.length === 0) {
        return {
          items: [],
          issues: [{ path: "themes", message: "themes ว่างเปล่า" }],
        };
      }
      if (record.themes.length > 50) {
        return {
          items: [],
          issues: [
            { path: "themes", message: "นำเข้าได้ไม่เกิน 50 ธีมต่อครั้ง" },
          ],
        };
      }
      return { items: record.themes, issues: [] };
    }
    return { items: [raw], issues: [] };
  }

  return {
    items: [],
    issues: [
      {
        path: "",
        message:
          "รูปแบบไม่ถูกต้อง — ส่ง object ธีมเดียว, อาร์เรย์, หรือ { \"themes\": [...] }",
      },
    ],
  };
}

export const THEME_IMPORT_EXAMPLE = {
  id: "brand-ocean",
  label: "Brand Ocean",
  description: "ตัวอย่างธีมนำเข้า",
  primary: "#0B6E99",
  accent: "#1FA2C5",
  background: "#F3FAFD",
  foreground: "#102A37",
  canvas: "#F7FBFD",
  muted: "#D7EEF6",
  border: "#C5DCE6",
} as const;
