"use client";

import { cn } from "@/lib/utils";
import type { TagOption } from "@/lib/types";

export function TagMultiSelect({
  options,
  value,
  onChange,
  className,
}: {
  options: TagOption[];
  value: string[];
  onChange: (tags: string[]) => void;
  className?: string;
}) {
  function toggle(tag: string) {
    if (value.includes(tag)) {
      onChange(value.filter((item) => item !== tag));
      return;
    }
    onChange([...value, tag]);
  }

  if (options.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-500">
        ยังไม่มี Tag — เพิ่มได้ที่ Settings
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

export function TagsDisplay({
  tags,
  options,
  empty = "-",
  className,
}: {
  tags?: string[] | string | null;
  options?: TagOption[];
  empty?: string;
  className?: string;
}) {
  const list = Array.isArray(tags)
    ? tags
    : typeof tags === "string"
      ? tags
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
      {list.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
          style={{
            backgroundColor: colorByName.get(tag)
              ? `${colorByName.get(tag)}22`
              : "#F1F5F9",
            color: colorByName.get(tag) ?? "#334155",
          }}
        >
          {tag}
        </span>
      ))}
    </span>
  );
}
