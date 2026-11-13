"use client";

import { Check, Palette } from "lucide-react";
import {
  DEFAULT_THEME_ID,
  THEME_GROUPS,
  THEMES,
  resolveProjectTheme,
  type ThemeOption,
} from "@/lib/themes";
import { cn } from "@/lib/utils";

function Swatches({
  colors,
  className,
}: {
  colors: ThemeOption["swatches"];
  className?: string;
}) {
  return (
    <span className={cn("flex shrink-0 -space-x-1", className)}>
      {colors.map((color, index) => (
        <span
          key={`${color}-${index}`}
          className="h-4 w-4 rounded-full ring-2 ring-white"
          style={{ backgroundColor: color }}
        />
      ))}
    </span>
  );
}

/** Compact theme chooser for project settings (controlled). */
export function ProjectThemeField({
  value,
  onChange,
}: {
  value: string;
  onChange: (themeId: string) => void;
}) {
  const currentId = resolveProjectTheme(value);
  const current = THEMES.find((theme) => theme.id === currentId) ?? THEMES[0];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
        <span className="inline-flex min-w-0 items-center gap-2 text-sm text-slate-700">
          <Palette className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="truncate font-medium">{current.label}</span>
        </span>
        <Swatches colors={current.swatches} />
      </div>

      <div className="max-h-56 space-y-4 overflow-y-auto rounded-xl border border-slate-200 p-3">
        {THEME_GROUPS.map((group) => {
          const items = THEMES.filter((theme) => theme.group === group.id);
          if (items.length === 0) return null;
          return (
            <section key={group.id}>
              <h4 className="mb-1.5 text-caption font-semibold tracking-wide text-slate-500 uppercase">
                {group.label}
              </h4>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {items.map((theme) => {
                  const active = theme.id === currentId;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => onChange(theme.id)}
                      aria-pressed={active}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-2 py-2 text-left transition",
                        active
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                      )}
                    >
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white"
                        style={{
                          background: `linear-gradient(135deg, ${theme.swatches[1]}, ${theme.swatches[0]})`,
                        }}
                      >
                        {active ? <Check className="h-3.5 w-3.5" /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-slate-800">
                          {theme.label}
                        </span>
                        <span className="block truncate text-[11px] text-slate-500">
                          {theme.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {currentId === DEFAULT_THEME_ID ? (
        <p className="text-xs text-slate-500">
          Clean เป็นธีมเดียวกับหน้ารวม — โปรเจกต์จะดูขาวสะอาดเหมือนกัน
        </p>
      ) : null}
    </div>
  );
}
