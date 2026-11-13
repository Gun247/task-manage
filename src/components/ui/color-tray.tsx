"use client";

import { useId } from "react";
import { Pipette } from "lucide-react";
import { cn } from "@/lib/utils";

function normalizeHex(value: string): string | null {
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (!/^#[0-9A-Fa-f]{6}$/.test(withHash)) return null;
  return withHash.toUpperCase();
}

export { normalizeHex };

export function ColorTray({
  value,
  onChange,
  options,
  className,
  label = "สี",
}: {
  value: string;
  onChange: (color: string) => void;
  options: readonly string[];
  className?: string;
  label?: string;
}) {
  const pickerId = useId();
  const hexId = useId();
  const normalizedValue = normalizeHex(value) ?? value.toUpperCase();
  const isPreset = options.some(
    (option) => option.toUpperCase() === normalizedValue,
  );
  const pickerValue = normalizeHex(value) ?? "#3B82F6";

  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="flex flex-wrap items-center gap-1.5">
        {options.map((color) => {
          const selected = color.toUpperCase() === normalizedValue;
          return (
            <button
              key={color}
              type="button"
              title={color}
              aria-label={`เลือกสี ${color}`}
              aria-pressed={selected}
              className={cn(
                "h-8 w-8 rounded-full border-2 transition",
                selected
                  ? "border-slate-900 ring-2 ring-slate-900/10"
                  : "border-transparent hover:scale-105",
              )}
              style={{ backgroundColor: color }}
              onClick={() => onChange(color)}
            />
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor={pickerId}
          title="เปิด color picker"
          className={cn(
            "relative inline-flex h-9 cursor-pointer items-center gap-2 overflow-hidden rounded-lg border px-2.5 text-sm font-medium transition",
            !isPreset
              ? "border-slate-900 bg-white text-slate-800 ring-2 ring-slate-900/10"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
          )}
        >
          <span
            className="h-5 w-5 shrink-0 rounded-md border border-slate-200"
            style={{ backgroundColor: pickerValue }}
            aria-hidden
          />
          <Pipette className="h-3.5 w-3.5 text-slate-500" />
          <span>เลือกสีเอง</span>
          <input
            id={pickerId}
            type="color"
            value={pickerValue}
            aria-label={`${label} — color picker`}
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(event) => onChange(event.target.value.toUpperCase())}
          />
        </label>

        <div className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2">
          <span
            className="h-5 w-5 shrink-0 rounded-md border border-slate-200"
            style={{ backgroundColor: normalizedValue }}
            aria-hidden
          />
          <input
            id={hexId}
            type="text"
            value={normalizedValue}
            spellCheck={false}
            aria-label={`${label} — รหัสสี hex`}
            placeholder="#3B82F6"
            className="h-7 w-[6.5rem] border-0 bg-transparent px-0.5 font-mono text-xs text-slate-700 uppercase placeholder:text-slate-400 focus-visible:outline-none"
            onChange={(event) => {
              const next = normalizeHex(event.target.value);
              if (next) onChange(next);
              else onChange(event.target.value);
            }}
            onBlur={() => {
              const next = normalizeHex(value);
              if (next) onChange(next);
            }}
          />
        </div>
      </div>
    </div>
  );
}
