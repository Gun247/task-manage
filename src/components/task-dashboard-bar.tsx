"use client";

import type { Status, Task } from "@/lib/types";
import { cn, isTaskOverdue } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, ListTodo } from "lucide-react";

function isTerminalStatus(name: string) {
  return name.toLowerCase() === "done";
}

export function TaskDashboardBar({
  tasks,
  statuses,
  overdueActive = false,
  onOverdueClick,
  activeStatusId = "",
  onStatusClick,
  className,
}: {
  tasks: Task[];
  statuses: Status[];
  overdueActive?: boolean;
  onOverdueClick?: () => void;
  activeStatusId?: string;
  onStatusClick?: (statusId: string) => void;
  className?: string;
}) {
  const total = tasks.length;
  const overdue = tasks.filter(isTaskOverdue).length;
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
            <p className="text-caption font-medium tracking-wide text-slate-500 uppercase">
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
            <p className="text-caption font-medium tracking-wide text-emerald-700/70 uppercase">
              เสร็จแล้ว
            </p>
            <p className="text-xl font-bold text-emerald-700">{done}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOverdueClick}
          aria-pressed={overdueActive}
          title={
            overdueActive
              ? "แสดง task ทั้งหมด"
              : "กรองเฉพาะ task ที่เกินกำหนด"
          }
          className={cn(
            "flex min-w-[7.5rem] flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition sm:min-w-[9rem]",
            overdueActive
              ? "bg-red-100 ring-2 ring-red-400/50"
              : overdue > 0
                ? "bg-red-50 hover:bg-red-100/80"
                : "bg-slate-50 hover:bg-slate-100/80",
            onOverdueClick ? "cursor-pointer" : "cursor-default",
          )}
        >
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg text-white",
              overdue > 0 || overdueActive ? "bg-red-500" : "bg-slate-400",
            )}
          >
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div>
            <p
              className={cn(
                "text-caption font-medium tracking-wide uppercase",
                overdue > 0 || overdueActive
                  ? "text-red-700/70"
                  : "text-slate-500",
              )}
            >
              เกินกำหนด
            </p>
            <p
              className={cn(
                "text-xl font-bold",
                overdue > 0 || overdueActive
                  ? "text-red-600"
                  : "text-slate-700",
              )}
            >
              {overdue}
            </p>
          </div>
        </button>

        <div className="flex min-w-0 flex-[2] flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
          {byStatus.map(({ status, count }) => {
            const active = activeStatusId === status.id;
            return (
              <button
                key={status.id}
                type="button"
                onClick={() => onStatusClick?.(status.id)}
                aria-pressed={active}
                title={
                  active
                    ? `ยกเลิกกรอง ${status.name}`
                    : `กรองเฉพาะ ${status.name}`
                }
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm shadow-sm transition",
                  active
                    ? "bg-white ring-2 ring-primary/40"
                    : "bg-white hover:bg-slate-50",
                  onStatusClick ? "cursor-pointer" : "cursor-default",
                )}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: status.color }}
                />
                <span className={active ? "font-medium text-slate-800" : "text-slate-600"}>
                  {status.name}
                </span>
                <span className="font-semibold text-slate-900">{count}</span>
              </button>
            );
          })}
          {byStatus.length === 0 ? (
            <p className="text-sm text-slate-400">ยังไม่มีสถานะ</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
