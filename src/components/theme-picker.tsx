"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Palette } from "lucide-react";
import { fetchJsonArray } from "@/lib/fetch-json";
import {
  DEFAULT_THEME_ID,
  THEME_GROUPS,
  THEMES,
  getCachedCustomThemes,
  resolveProjectTheme,
  setCachedCustomThemes,
  toThemeOption,
  type ThemeOption,
} from "@/lib/themes";
import type { ColorTheme } from "@/lib/types";
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

function useCustomThemeOptions() {
  const [custom, setCustom] = useState<ThemeOption[]>(() =>
    getCachedCustomThemes().map(toThemeOption),
  );

  useEffect(() => {
    let cancelled = false;

    function apply(themes: ColorTheme[]) {
      const records = themes.map((theme) => ({
        id: theme.id,
        label: theme.label,
        description: theme.description,
        palette: theme.palette,
        swatches: [
          theme.palette.primary,
          theme.palette.accent,
          theme.palette.muted,
        ] as [string, string, string],
      }));
      setCachedCustomThemes(records);
      if (!cancelled) setCustom(records.map(toThemeOption));
    }

    function load() {
      fetchJsonArray<ColorTheme>("/api/themes")
        .then(apply)
        .catch(() => {
          if (!cancelled) setCustom([]);
        });
    }

    load();
    const onChange = () => load();
    window.addEventListener("fwf-themes-changed", onChange);
    window.addEventListener("fwf-themes-cache-updated", onChange);
    return () => {
      cancelled = true;
      window.removeEventListener("fwf-themes-changed", onChange);
      window.removeEventListener("fwf-themes-cache-updated", onChange);
    };
  }, []);

  return custom;
}

/** Compact theme chooser for project settings (controlled). */
export function ProjectThemeField({
  value,
  onChange,
}: {
  value: string;
  onChange: (themeId: string) => void;
}) {
  const customThemes = useCustomThemeOptions();
  const allThemes = useMemo(
    () => [...customThemes, ...THEMES],
    [customThemes],
  );
  const currentId = resolveProjectTheme(value, getCachedCustomThemes());
  const current =
    allThemes.find((theme) => theme.id === currentId) ?? THEMES[0];

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
        {customThemes.length > 0 ? (
          <section>
            <h4 className="mb-1.5 text-caption font-semibold tracking-wide text-slate-500 uppercase">
              ธีมที่สร้างเอง · {customThemes.length}
            </h4>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {customThemes.map((theme) => {
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
        ) : null}

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
