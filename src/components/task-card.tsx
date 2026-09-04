"use client";

import { Badge } from "@/components/ui/badge";
import type { Task } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Calendar, Clock3, GripVertical } from "lucide-react";

interface TaskCardProps {
  task: Task;
  draggable?: boolean;
  onClick?: () => void;
}

export function TaskCard({ task, draggable = false, onClick }: TaskCardProps) {
  const lastStatusChange =
    task.statusHistory?.[task.statusHistory.length - 1]?.changedAt;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-slate-300 hover:bg-white"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {draggable && <GripVertical className="h-4 w-4 text-slate-300" />}
          <Badge color={task.priority.color}>{task.priority.label}</Badge>
        </div>
        <Badge color={task.status.color}>{task.status.name}</Badge>
      </div>
      <p className="mb-2 text-sm font-semibold text-slate-900">{task.name}</p>
      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
        <span
          className="font-medium"
          style={{ color: task.assignee?.color ?? "#94A3B8" }}
        >
          {task.assignee?.nickname ?? "ยังไม่ระบุ"}
        </span>
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {formatDate(task.endDate)}
        </span>
      </div>
      {lastStatusChange ? (
        <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-slate-400">
          <Clock3 className="h-3 w-3" />
          {formatDateTime(lastStatusChange)}
        </div>
      ) : null}
    </button>
  );
}
