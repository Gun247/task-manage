"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task, TeamMember } from "@/lib/types";

function memberInitials(nickname: string) {
  const parts = nickname.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function AssigneeAvatar({
  member,
  size = "md",
  className,
}: {
  member: Pick<TeamMember, "nickname" | "color">;
  size?: "sm" | "md";
  className?: string;
}) {
  const sizeClass = size === "sm" ? "h-6 w-6 text-[9px]" : "h-7 w-7 text-[10px]";

  return (
    <span
      title={member.nickname}
      className={cn("group/avatar relative inline-flex", className)}
    >
      <span
        aria-label={member.nickname}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-white",
          sizeClass,
        )}
        style={{ backgroundColor: member.color }}
      >
        {memberInitials(member.nickname)}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute top-full left-1/2 z-[60] mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow-sm transition-opacity group-hover/avatar:opacity-100"
      >
        {member.nickname}
      </span>
    </span>
  );
}

export function AssigneesDisplay({
  assignees,
  empty = "ยังไม่ระบุ",
  className,
  max = 4,
}: {
  assignees?: Array<Pick<TeamMember, "id" | "nickname" | "color">> | null;
  empty?: string;
  className?: string;
  max?: number;
}) {
  const list = assignees ?? [];
  if (list.length === 0) {
    return <span className={cn("text-slate-400", className)}>{empty}</span>;
  }

  const visible = list.slice(0, max);
  const overflow = list.length - visible.length;

  return (
    <span className={cn("inline-flex items-center", className)}>
      {visible.map((member, index) => (
        <AssigneeAvatar
          key={member.id}
          member={member}
          size="sm"
          className={cn(index > 0 && "-ml-1.5", "z-[1] hover:z-10")}
        />
      ))}
      {overflow > 0 ? (
        <span
          title={list
            .slice(max)
            .map((member) => member.nickname)
            .join(", ")}
          className="group/overflow relative -ml-1.5 inline-flex"
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[9px] font-semibold text-slate-600 ring-2 ring-white">
            +{overflow}
          </span>
          <span
            role="tooltip"
            className="pointer-events-none absolute top-full left-1/2 z-[60] mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow-sm transition-opacity group-hover/overflow:opacity-100"
          >
            {list
              .slice(max)
              .map((member) => member.nickname)
              .join(", ")}
          </span>
        </span>
      ) : null}
    </span>
  );
}

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
            <AssigneeAvatar member={member} size="sm" />
            <span className="font-medium text-slate-800">{member.nickname}</span>
          </label>
        );
      })}
    </div>
  );
}

export function InlineAssigneePicker({
  taskId,
  members,
  assignees,
  onUpdated,
  className,
}: {
  taskId: string;
  members: TeamMember[];
  assignees: TeamMember[];
  onUpdated: (task: Task) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const assigneeKey = assignees.map((item) => item.id).join(",");
  const [selectedIds, setSelectedIds] = useState(assignees.map((item) => item.id));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedIds(assigneeKey ? assigneeKey.split(",") : []);
  }, [assigneeKey]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const activeMembers = members.filter((member) => member.isActive);
  const selectedMembers = activeMembers.filter((member) =>
    selectedIds.includes(member.id),
  );

  async function persist(nextIds: string[]) {
    setSelectedIds(nextIds);
    setSaving(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeIds: nextIds }),
      });
      if (!response.ok) {
        setSelectedIds(assignees.map((item) => item.id));
        return;
      }
      const updated = (await response.json()) as Task;
      onUpdated(updated);
    } finally {
      setSaving(false);
    }
  }

  function toggle(id: string) {
    if (saving) return;
    const next = selectedIds.includes(id)
      ? selectedIds.filter((item) => item !== id)
      : [...selectedIds, id];
    void persist(next);
  }

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <div
        className={cn(
          "group/assignee inline-flex min-h-7 min-w-7 items-center gap-1",
          selectedMembers.length === 0 && "w-full",
        )}
      >
        {selectedMembers.length > 0 ? (
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="inline-flex items-center rounded-full p-0.5 transition hover:bg-slate-100"
          >
            <AssigneesDisplay assignees={selectedMembers} empty="" max={3} />
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          disabled={saving || activeMembers.length === 0}
          title="เพิ่ม Assignee"
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400 transition hover:border-primary hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50",
            open
              ? "opacity-100"
              : "opacity-0 group-hover/assignee:opacity-100 focus-visible:opacity-100",
          )}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {open ? (
        <div className="absolute top-full left-0 z-50 mt-1.5 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 px-3 py-2 text-xs font-medium text-slate-500">
            เลือก Assignee
          </div>
          <div className="max-h-56 overflow-y-auto p-1.5">
            {activeMembers.length === 0 ? (
              <p className="px-2 py-3 text-xs text-slate-400">
                ยังไม่มีสมาชิกทีม
              </p>
            ) : (
              activeMembers.map((member) => {
                const checked = selectedIds.includes(member.id);
                return (
                  <button
                    key={member.id}
                    type="button"
                    disabled={saving}
                    onClick={() => toggle(member.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition",
                      checked ? "bg-primary/5" : "hover:bg-slate-50",
                      saving && "opacity-60",
                    )}
                  >
                    <AssigneeAvatar member={member} size="sm" />
                    <span className="min-w-0 flex-1 truncate font-medium text-slate-800">
                      {member.nickname}
                    </span>
                    {checked ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
