"use client";

import { cn } from "@/lib/utils";
import type { TaskType, TaskTypeOption } from "@/lib/types";

export function TaskTypeMultiSelect({
  options,
  value,
  onChange,
  className,
}: {
  options: TaskTypeOption[];
  value: TaskType[];
  onChange: (types: TaskType[]) => void;
  className?: string;
}) {
  function toggle(type: TaskType) {
    if (value.includes(type)) {
      if (value.length === 1) return;
      onChange(value.filter((item) => item !== type));
      return;
    }
    onChange([...value, type]);
  }

  if (options.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-500">
        ยังไม่มี Task Type — เพิ่มได้ที่ Settings
      </p>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-2",
        className,
      )}
    >
      {options.map((option) => {
        const checked = value.includes(option.name);
        return (
          <label
            key={option.id}
            className={cn(
              "inline-flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition",
              checked
                ? "bg-[#1E3A5F]/08 font-medium text-[#1E3A5F]"
                : "text-slate-700 hover:bg-slate-50",
            )}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(option.name)}
              className="h-4 w-4 rounded border-slate-300 text-[#1E3A5F] focus:ring-[#1E3A5F]/30"
            />
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: option.color }}
            />
            {option.name}
          </label>
        );
      })}
    </div>
  );
}

export function TaskTypesDisplay({
  types,
  options,
  empty = "-",
  className,
}: {
  types?: TaskType[] | string | null;
  options?: TaskTypeOption[];
  empty?: string;
  className?: string;
}) {
  const list = Array.isArray(types)
    ? types
    : typeof types === "string"
      ? types
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean)
      : [];
  const colorByName = new Map(
    (options ?? []).map((option) => [option.name, option.color]),
  );

  if (list.length === 0) {
    return <span className={cn("text-slate-400", className)}>{empty}</span>;
  }

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      {list.map((type) => (
        <span
          key={type}
          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
        >
          {colorByName.get(type) ? (
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: colorByName.get(type) }}
            />
          ) : null}
          {type}
        </span>
      ))}
    </span>
  );
}
