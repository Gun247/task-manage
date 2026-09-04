"use client";

import type { Status, Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, ListTodo } from "lucide-react";

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function isTerminalStatus(name: string) {
  const normalized = name.toLowerCase();
  return normalized === "done" || normalized === "prd";
}

function isOverdue(task: Task) {
  if (!task.endDate || isTerminalStatus(task.status.name)) return false;
  return new Date(task.endDate) < startOfToday();
}

export function TaskDashboardBar({
  tasks,
  statuses,
  className,
}: {
  tasks: Task[];
  statuses: Status[];
  className?: string;
}) {
  const total = tasks.length;
  const overdue = tasks.filter(isOverdue).length;
  const done = tasks.filter((task) => isTerminalStatus(task.status.name)).length;
  const byStatus = statuses.map((status) => ({
    status,
    count: tasks.filter((task) => task.statusId === status.id).length,
  }));

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4",
        className,
      )}
    >
      <div className="flex flex-wrap items-stretch gap-2 sm:gap-3">
        <div className="flex min-w-[7.5rem] flex-1 items-center gap-3 rounded-xl bg-primary/5 px-3 py-2.5 sm:min-w-[9rem]">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
            <ListTodo className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
              ทั้งหมด
            </p>
            <p className="text-xl font-bold text-primary">{total}</p>
          </div>
        </div>

        <div className="flex min-w-[7.5rem] flex-1 items-center gap-3 rounded-xl bg-emerald-50 px-3 py-2.5 sm:min-w-[9rem]">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <CheckCircle2 className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[11px] font-medium tracking-wide text-emerald-700/70 uppercase">
              เสร็จแล้ว
            </p>
            <p className="text-xl font-bold text-emerald-700">{done}</p>
          </div>
        </div>

        <div
          className={cn(
            "flex min-w-[7.5rem] flex-1 items-center gap-3 rounded-xl px-3 py-2.5 sm:min-w-[9rem]",
            overdue > 0 ? "bg-red-50" : "bg-slate-50",
          )}
        >
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg text-white",
              overdue > 0 ? "bg-red-500" : "bg-slate-400",
            )}
          >
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div>
            <p
              className={cn(
                "text-[11px] font-medium tracking-wide uppercase",
                overdue > 0 ? "text-red-700/70" : "text-slate-500",
              )}
            >
              เกินกำหนด
            </p>
            <p
              className={cn(
                "text-xl font-bold",
                overdue > 0 ? "text-red-600" : "text-slate-700",
              )}
            >
              {overdue}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-[2] flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
          {byStatus.map(({ status, count }) => (
            <div
              key={status.id}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 text-sm shadow-sm"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: status.color }}
              />
              <span className="text-slate-600">{status.name}</span>
              <span className="font-semibold text-slate-900">{count}</span>
            </div>
          ))}
          {byStatus.length === 0 ? (
            <p className="text-sm text-slate-400">ยังไม่มีสถานะ</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
