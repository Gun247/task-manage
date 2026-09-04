"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubtaskAssigneePicker } from "@/components/subtask-assignee-picker";
import { cn } from "@/lib/utils";
import type { TeamMember } from "@/lib/types";
import { CheckSquare, Plus, Trash2 } from "lucide-react";

export type PendingSubtask = {
  name: string;
  assigneeIds: string[];
};

export function PendingSubtasksEditor({
  items,
  draft,
  onDraftChange,
  draftAssigneeIds,
  onDraftAssigneeIdsChange,
  onAdd,
  onRemove,
  onChangeAssignees,
  availableMembers,
  className,
  compact = false,
}: {
  items: PendingSubtask[];
  draft: string;
  onDraftChange: (value: string) => void;
  draftAssigneeIds: string[];
  onDraftAssigneeIdsChange: (ids: string[]) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChangeAssignees: (index: number, ids: string[]) => void;
  availableMembers: TeamMember[];
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-3",
        className,
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <CheckSquare className="h-4 w-4 text-slate-500" />
          Subtasks
        </div>
        <span className="text-xs text-slate-500">{items.length} รายการ</span>
      </div>

      {items.length > 0 ? (
        <div className="mb-2 space-y-1.5">
          {items.map((item, index) => (
            <div
              key={`${item.name}-${index}`}
              className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5"
            >
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 text-sm text-slate-800">
                  {item.name}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => onRemove(index)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                </Button>
              </div>
              <SubtaskAssigneePicker
                members={availableMembers}
                value={item.assigneeIds}
                onChange={(ids) => onChangeAssignees(index, ids)}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-2 text-xs text-slate-500">
          เพิ่ม subtask ได้ก่อนสร้าง task
        </p>
      )}

      <div className="space-y-1.5">
        <div className="flex gap-2">
          <Input
            placeholder="เพิ่ม subtask..."
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onAdd();
              }
            }}
            className={cn(compact && "h-9 py-0 text-sm leading-9")}
          />
          <Button
            type="button"
            variant="outline"
            disabled={!draft.trim()}
            onClick={onAdd}
            className={cn(compact && "h-9")}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <SubtaskAssigneePicker
          members={availableMembers}
          value={draftAssigneeIds}
          onChange={onDraftAssigneeIdsChange}
        />
      </div>
    </div>
  );
}
