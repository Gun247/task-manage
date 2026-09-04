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
  const normalizedValue = normalizeHex(value) ?? value.toUpperCase();
  const isPreset = options.some(
    (option) => option.toUpperCase() === normalizedValue,
  );

  return (
    <div className={cn("space-y-2", className)}>
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

        <label
          htmlFor={pickerId}
          title="เลือกสีเอง"
          className={cn(
            "relative flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed transition",
            !isPreset
              ? "border-slate-900 ring-2 ring-slate-900/10"
              : "border-slate-300 hover:border-slate-400",
          )}
          style={!isPreset ? { backgroundColor: normalizedValue } : undefined}
        >
          {isPreset ? (
            <Pipette className="h-3.5 w-3.5 text-slate-500" />
          ) : (
            <span className="absolute inset-0 bg-black/10" />
          )}
          <input
            id={pickerId}
            type="color"
            value={normalizeHex(value) ?? "#3B82F6"}
            aria-label={`${label} — เลือกจากถาดสี`}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            onChange={(event) => onChange(event.target.value.toUpperCase())}
          />
        </label>
      </div>

      <div className="flex items-center gap-2">
        <span
          className="h-6 w-6 shrink-0 rounded-md border border-slate-200"
          style={{ backgroundColor: normalizedValue }}
          aria-hidden
        />
        <input
          type="text"
          value={normalizedValue}
          spellCheck={false}
          aria-label={`${label} — รหัสสี hex`}
          placeholder="#3B82F6"
          className="h-8 w-[7.5rem] rounded-md border border-slate-200 bg-white px-2 font-mono text-xs text-slate-700 uppercase placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
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
        <span className="text-[11px] text-slate-400">หรือพิมพ์รหัสสี</span>
      </div>
    </div>
  );
}
