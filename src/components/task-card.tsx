"use client";

import { AssigneesDisplay } from "@/components/assignee-multi-select";
import { Badge } from "@/components/ui/badge";
import { taskSourceLabel } from "@/lib/task-source";
import type { Task } from "@/lib/types";
import {
  cn,
  formatDate,
  formatDateTime,
  getTaskOverdueState,
} from "@/lib/utils";
import { CheckSquare, Clock3, GripVertical } from "lucide-react";

interface TaskCardProps {
  task: Task;
  draggable?: boolean;
  onClick?: () => void;
}

const TASK_DATES = [
  { key: "startDate", label: "Start" },
  { key: "endDate", label: "End" },
  { key: "uatDate", label: "UAT" },
  { key: "prdDate", label: "PRD" },
] as const;

export function TaskCard({ task, draggable = false, onClick }: TaskCardProps) {
  const { overdue, field: overdueField } = getTaskOverdueState(task);
  const lastStatusChange =
    task.statusHistory?.[task.statusHistory.length - 1]?.changedAt;
  const subtasks = task.subtasks ?? [];
  const doneCount = subtasks.filter((item) => item.isDone).length;
  const sourceLabel = taskSourceLabel(task.source);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border p-3 text-left transition",
        overdue
          ? "border-red-100 bg-red-50/80 hover:border-red-200 hover:bg-red-50"
          : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white",
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {draggable && (
            <GripVertical
              className={cn("h-4 w-4", overdue ? "text-red-300" : "text-slate-300")}
            />
          )}
          <Badge color={task.priority.color}>{task.priority.label}</Badge>
        </div>
        <Badge color={task.status.color}>{task.status.name}</Badge>
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <p
          className={cn(
            "text-sm font-semibold",
            overdue ? "text-red-800" : "text-slate-900",
          )}
        >
          {task.name}
        </p>
        {overdue ? (
          <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
            เกินกำหนด
          </span>
        ) : null}
        {sourceLabel ? (
          <span
            className="rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700"
            title="นำเข้าจาก Google Sheet"
          >
            {sourceLabel}
          </span>
        ) : null}
      </div>
      {task.owner ? (
        <p
          className={cn(
            "mb-2 text-[11px]",
            overdue ? "text-red-700/70" : "text-slate-500",
          )}
        >
          ผู้ดูแล:{" "}
          <span
            className={cn(
              "font-medium",
              overdue ? "text-red-800" : "text-slate-700",
            )}
          >
            {task.owner.nickname}
          </span>
        </p>
      ) : null}
      <div
        className={cn(
          "flex items-center justify-between gap-2 text-xs",
          overdue ? "text-red-700/80" : "text-slate-500",
        )}
      >
        <AssigneesDisplay
          assignees={
            task.assignees?.length
              ? task.assignees
              : task.assignee
                ? [task.assignee]
                : []
          }
        />
      </div>
      <div
        className={cn(
          "mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]",
          overdue ? "text-red-700/80" : "text-slate-500",
        )}
      >
        {TASK_DATES.map((item) => {
          const isOverdueDate = overdueField === item.key;
          return (
            <div key={item.key} className="flex min-w-0 items-baseline gap-1">
              <span
                className={cn(
                  "shrink-0 font-medium",
                  isOverdueDate ? "text-red-600" : "text-slate-400",
                )}
              >
                {item.label}
              </span>
              <span
                className={cn(
                  "truncate",
                  isOverdueDate
                    ? "font-semibold text-red-600"
                    : overdue
                      ? "text-red-700/80"
                      : "text-slate-600",
                )}
              >
                {formatDate(task[item.key])}
              </span>
            </div>
          );
        })}
      </div>
      {subtasks.length > 0 ? (
        <div
          className={cn(
            "mt-2 inline-flex items-center gap-1 text-[11px]",
            overdue ? "text-red-700/70" : "text-slate-500",
          )}
        >
          <CheckSquare className="h-3 w-3" />
          {doneCount}/{subtasks.length} subtasks
        </div>
      ) : null}
      {lastStatusChange ? (
        <div
          className={cn(
            "mt-2 inline-flex items-center gap-1 text-[11px]",
            overdue ? "text-red-400" : "text-slate-400",
          )}
        >
          <Clock3 className="h-3 w-3" />
          {formatDateTime(lastStatusChange)}
        </div>
      ) : null}
    </button>
  );
}
