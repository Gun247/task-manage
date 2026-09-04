"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { th } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import type { Task, TaskTypeOption } from "@/lib/types";
import { Check, ChevronLeft, ChevronRight, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TaskCalendarViewProps {
  tasks: Task[];
  taskTypes?: TaskTypeOption[];
  onEditTask: (task: Task) => void;
}

function isDateOnDay(value: string | null | undefined, day: Date) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return isSameDay(date, day);
}

/** Show a task only on its start / end / UAT / PRD day — not the whole date range. */
function taskAppearsOnDay(task: Task, day: Date) {
  return (
    isDateOnDay(task.startDate, day) ||
    isDateOnDay(task.endDate, day) ||
    isDateOnDay(task.uatDate, day) ||
    isDateOnDay(task.prdDate, day)
  );
}

function taskTypeLabel(task: Task, taskTypes: TaskTypeOption[]) {
  return (task.taskTypes?.length
    ? task.taskTypes
    : task.taskType
      ? [task.taskType]
      : []
  )
    .map((name) => {
      const option = taskTypes.find((item) => item.name === name);
      return option?.name ?? name;
    })
    .join(", ");
}

function formatTaskSummaryLine(task: Task, index: number) {
  const lines = [`${index + 1}. ${task.name}`];
  if (task.description?.trim()) {
    lines.push(`   ${task.description.trim()}`);
  }

  const subtasks = [...(task.subtasks ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  if (subtasks.length > 0) {
    lines.push("   Subtasks:");
    for (const subtask of subtasks) {
      const mark = subtask.isDone ? "[x]" : "[ ]";
      lines.push(`   - ${mark} ${subtask.name}`);
    }
  }

  return lines.join("\n");
}

function buildTimelineSummaryText(
  date: Date,
  uatTasks: Task[],
  prdTasks: Task[],
) {
  const dateLabel = format(date, "d MMMM yyyy", { locale: th });
  const sections = [`สรุป Timeline — ${dateLabel}`, ""];

  sections.push(`Timeline UAT (${uatTasks.length})`);
  if (uatTasks.length === 0) {
    sections.push("- ไม่มี task");
  } else {
    sections.push(
      ...uatTasks.map((task, index) => formatTaskSummaryLine(task, index)),
    );
  }

  sections.push("");
  sections.push(`Timeline PRD (${prdTasks.length})`);
  if (prdTasks.length === 0) {
    sections.push("- ไม่มี task");
  } else {
    sections.push(
      ...prdTasks.map((task, index) => formatTaskSummaryLine(task, index)),
    );
  }

  return sections.join("\n");
}

export function TaskCalendarView({
  tasks,
  taskTypes = [],
  onEditTask,
}: TaskCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [copied, setCopied] = useState(false);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentMonth]);

  const tasksForDay = useMemo(
    () => tasks.filter((task) => taskAppearsOnDay(task, selectedDate)),
    [tasks, selectedDate],
  );

  const uatTasksForDay = useMemo(
    () => tasks.filter((task) => isDateOnDay(task.uatDate, selectedDate)),
    [tasks, selectedDate],
  );

  const prdTasksForDay = useMemo(
    () => tasks.filter((task) => isDateOnDay(task.prdDate, selectedDate)),
    [tasks, selectedDate],
  );

  function getTasksOnDay(day: Date) {
    return tasks.filter((task) => taskAppearsOnDay(task, day));
  }

  async function copyTimelineSummary() {
    const text = buildTimelineSummaryText(
      selectedDate,
      uatTasksForDay,
      prdTasksForDay,
    );

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary">
            {format(currentMonth, "MMMM yyyy", { locale: th })}
          </h2>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() =>
                setCurrentMonth((value) =>
                  addDays(startOfMonth(value), -1),
                )
              }
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                setCurrentMonth(today);
                setSelectedDate(today);
              }}
            >
              วันนี้
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() =>
                setCurrentMonth((value) =>
                  addDays(endOfMonth(value), 1),
                )
              }
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            Timeline UAT
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Timeline PRD
          </span>
        </div>

        <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-500">
          {["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day) => {
            const dayTasks = getTasksOnDay(day);
            const uatCount = tasks.filter((task) =>
              isDateOnDay(task.uatDate, day),
            ).length;
            const prdCount = tasks.filter((task) =>
              isDateOnDay(task.prdDate, day),
            ).length;
            const hasUat = uatCount > 0;
            const hasPrd = prdCount > 0;
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());

            let dayTone = isSelected
              ? "border-primary bg-primary/5"
              : "border-slate-200 bg-white hover:bg-slate-50";

            if (!isSelected && hasUat && hasPrd) {
              dayTone =
                "border-teal-300 bg-gradient-to-br from-amber-50 to-emerald-50 hover:from-amber-50/80 hover:to-emerald-50/80";
            } else if (!isSelected && hasUat) {
              dayTone = "border-amber-300 bg-amber-50 hover:bg-amber-50/80";
            } else if (!isSelected && hasPrd) {
              dayTone =
                "border-emerald-300 bg-emerald-50 hover:bg-emerald-50/80";
            }

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => setSelectedDate(day)}
                className={`min-h-[92px] rounded-xl border p-2 text-left transition ${dayTone} ${
                  !isSameMonth(day, currentMonth) ? "opacity-40" : ""
                }`}
              >
                <div className="mb-2 flex items-start justify-between gap-1">
                  <div
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                      isToday
                        ? "bg-primary font-bold text-white"
                        : "text-slate-700"
                    }`}
                  >
                    {format(day, "d")}
                  </div>
                  {(hasUat || hasPrd) && (
                    <div className="flex flex-wrap justify-end gap-0.5">
                      {hasUat ? (
                        <span className="rounded bg-amber-500 px-1 py-0.5 text-[9px] font-semibold text-white">
                          UAT{uatCount > 1 ? ` ${uatCount}` : ""}
                        </span>
                      ) : null}
                      {hasPrd ? (
                        <span className="rounded bg-emerald-500 px-1 py-0.5 text-[9px] font-semibold text-white">
                          PRD{prdCount > 1 ? ` ${prdCount}` : ""}
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  {dayTasks.slice(0, 2).map((task) => (
                    <div
                      key={task.id}
                      className="truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                      style={{
                        backgroundColor: `${task.status.color}22`,
                        color: task.status.color,
                      }}
                    >
                      {task.name}
                    </div>
                  ))}
                  {dayTasks.length > 2 && (
                    <div className="text-[10px] text-slate-400">
                      +{dayTasks.length - 2} อื่นๆ
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-primary">
          {format(selectedDate, "d MMMM yyyy", { locale: th })}
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Task วันนี้ ({tasksForDay.length})
        </p>

        <div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              สรุป Timeline วันนี้
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 px-2 text-[11px]"
              onClick={copyTimelineSummary}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-primary" />
                  คัดลอกแล้ว
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  คัดลอกสรุป
                </>
              )}
            </Button>
          </div>

          <div className="rounded-lg border border-amber-200/80 bg-amber-50/80 p-2.5">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-amber-800">
                Timeline UAT
              </span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                {uatTasksForDay.length}
              </span>
            </div>
            {uatTasksForDay.length === 0 ? (
              <p className="text-xs text-amber-700/70">ไม่มี task</p>
            ) : (
              <ul className="space-y-1">
                {uatTasksForDay.map((task) => (
                  <li key={task.id}>
                    <button
                      type="button"
                      onClick={() => onEditTask(task)}
                      className="w-full rounded-md px-1.5 py-1 text-left hover:bg-amber-100/80"
                    >
                      <span className="block truncate text-xs font-medium text-amber-950">
                        {task.name}
                      </span>
                      {task.description ? (
                        <span className="mt-0.5 block line-clamp-2 text-[10px] leading-relaxed text-amber-900/70">
                          {task.description}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/80 p-2.5">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-emerald-800">
                Timeline PRD
              </span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                {prdTasksForDay.length}
              </span>
            </div>
            {prdTasksForDay.length === 0 ? (
              <p className="text-xs text-emerald-700/70">ไม่มี task</p>
            ) : (
              <ul className="space-y-1">
                {prdTasksForDay.map((task) => (
                  <li key={task.id}>
                    <button
                      type="button"
                      onClick={() => onEditTask(task)}
                      className="w-full rounded-md px-1.5 py-1 text-left hover:bg-emerald-100/80"
                    >
                      <span className="block truncate text-xs font-medium text-emerald-950">
                        {task.name}
                      </span>
                      {task.description ? (
                        <span className="mt-0.5 block line-clamp-2 text-[10px] leading-relaxed text-emerald-900/70">
                          {task.description}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {tasksForDay.length === 0 && (
            <p className="rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-500">
              ไม่มี task ในวันนี้
            </p>
          )}
          {tasksForDay.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => onEditTask(task)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-left hover:bg-white"
            >
              <div className="mb-2 flex items-center gap-2">
                <Badge color={task.priority.color}>{task.priority.label}</Badge>
                <Badge color={task.status.color}>{task.status.name}</Badge>
              </div>
              <p className="text-sm font-semibold text-slate-900">{task.name}</p>
              {task.description ? (
                <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-600">
                  {task.description}
                </p>
              ) : null}
              <p className="mt-1 text-xs text-slate-500">
                {taskTypeLabel(task, taskTypes)}
              </p>
              {(isDateOnDay(task.uatDate, selectedDate) ||
                isDateOnDay(task.prdDate, selectedDate)) && (
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                  {isDateOnDay(task.uatDate, selectedDate) ? (
                    <span className="rounded-md bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800">
                      UAT วันนี้
                    </span>
                  ) : null}
                  {isDateOnDay(task.prdDate, selectedDate) ? (
                    <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 font-medium text-emerald-800">
                      PRD วันนี้
                    </span>
                  ) : null}
                </div>
              )}
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
