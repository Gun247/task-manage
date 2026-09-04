"use client";

import { cn } from "@/lib/utils";
import type { TeamMember } from "@/lib/types";

export function AssigneeMultiSelect({
  members,
  value,
  onChange,
  className,
}: {
  members: TeamMember[];
  value: string[];
  onChange: (ids: string[]) => void;
  className?: string;
}) {
  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((item) => item !== id));
      return;
    }
    onChange([...value, id]);
  }

  if (members.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-500">
        ยังไม่มีสมาชิกทีม — เพิ่มได้ที่ Settings
      </p>
    );
  }

  return (
    <div
      className={cn(
        "max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2",
        className,
      )}
    >
      {members.map((member) => {
        const checked = value.includes(member.id);
        return (
          <label
            key={member.id}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition",
              checked ? "bg-[#1E3A5F]/08" : "hover:bg-slate-50",
            )}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(member.id)}
              className="h-4 w-4 rounded border-slate-300 text-[#1E3A5F] focus:ring-[#1E3A5F]/30"
            />
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: member.color }}
            />
            <span className="font-medium text-slate-800">{member.nickname}</span>
          </label>
        );
      })}
    </div>
  );
}

export function AssigneesDisplay({
  assignees,
  empty = "ยังไม่ระบุ",
  className,
}: {
  assignees?: Array<Pick<TeamMember, "id" | "nickname" | "color">> | null;
  empty?: string;
  className?: string;
}) {
  const list = assignees ?? [];
  if (list.length === 0) {
    return <span className={cn("text-slate-400", className)}>{empty}</span>;
  }

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      {list.map((member) => (
        <span
          key={member.id}
          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium"
          style={{ color: member.color }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: member.color }}
          />
          {member.nickname}
        </span>
      ))}
    </span>
  );
}
