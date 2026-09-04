"use client";

import { cn } from "@/lib/utils";
import type { TeamMember } from "@/lib/types";

/** Compact toggle chips — pick from parent task assignees only */
export function SubtaskAssigneePicker({
  members,
  value,
  onChange,
  disabled = false,
  emptyHint = "Assign task หลักก่อน",
  className,
}: {
  members: TeamMember[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  emptyHint?: string;
  className?: string;
}) {
  function toggle(id: string) {
    if (disabled) return;
    if (value.includes(id)) {
      onChange(value.filter((item) => item !== id));
      return;
    }
    onChange([...value, id]);
  }

  if (members.length === 0) {
    return (
      <p className={cn("text-[11px] text-slate-400", className)}>{emptyHint}</p>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {members.map((member) => {
        const checked = value.includes(member.id);
        return (
          <button
            key={member.id}
            type="button"
            disabled={disabled}
            title={member.nickname}
            onClick={() => toggle(member.id)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] font-medium transition",
              checked
                ? "border-transparent text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
              disabled && "cursor-not-allowed opacity-60",
            )}
            style={
              checked
                ? { backgroundColor: member.color, borderColor: member.color }
                : undefined
            }
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor: checked ? "rgba(255,255,255,0.9)" : member.color,
              }}
            />
            {member.nickname}
          </button>
        );
      })}
    </div>
  );
}
