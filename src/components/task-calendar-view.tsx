"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { th } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { LinkifiedText } from "@/components/ui/linkified-text";
import {
  AssigneeAvatar,
  AssigneesDisplay,
} from "@/components/assignee-multi-select";
import type { Task, TaskTypeOption } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  GripVertical,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const PANEL_STORAGE_KEY = "fwf-calendar-panel-width";
const PANEL_COLLAPSED_KEY = "fwf-calendar-panel-collapsed";
const FILTER_STORAGE_KEY = "fwf-calendar-event-filters";
const PANEL_DEFAULT = 340;
const PANEL_MIN = 260;
const PANEL_MAX = 560;
const MAX_EVENT_CHIPS = 3;
const BUSY_DAY_THRESHOLD = 3;

type EventKind = "uat" | "prd" | "start" | "end";

type DayEvent = {
  key: string;
  task: Task;
  kind: EventKind;
};

type EventFilters = Record<EventKind, boolean>;

const DEFAULT_FILTERS: EventFilters = {
  uat: true,
  prd: true,
  start: true,
  end: true,
};

const EVENT_META: Record<
  EventKind,
  {
    label: string;
    short: string;
    chip: string;
    dot: string;
    bar: string;
    pillOn: string;
    pillOff: string;
  }
> = {
  uat: {
    label: "Timeline UAT",
    short: "UAT",
    chip: "bg-amber-500 text-white",
    dot: "bg-amber-500",
    bar: "bg-amber-100 text-amber-900 ring-amber-200/80",
    pillOn: "border-amber-600 bg-amber-600 text-white",
    pillOff: "border-amber-200 bg-amber-50 text-amber-800/70 hover:border-amber-300",
  },
  prd: {
    label: "Timeline PRD",
    short: "PRD",
    chip: "bg-emerald-500 text-white",
    dot: "bg-emerald-500",
    bar: "bg-emerald-100 text-emerald-900 ring-emerald-200/80",
    pillOn: "border-emerald-600 bg-emerald-600 text-white",
    pillOff:
      "border-emerald-200 bg-emerald-50 text-emerald-800/70 hover:border-emerald-300",
  },
  start: {
    label: "วันเริ่ม",
    short: "เริ่ม",
    chip: "bg-sky-500 text-white",
    dot: "bg-sky-500",
    bar: "bg-sky-100 text-sky-900 ring-sky-200/80",
    pillOn: "border-sky-600 bg-sky-600 text-white",
    pillOff: "border-sky-200 bg-sky-50 text-sky-800/70 hover:border-sky-300",
  },
  end: {
    label: "วันสิ้นสุด",
    short: "สิ้นสุด",
    chip: "bg-slate-600 text-white",
    dot: "bg-slate-600",
    bar: "bg-slate-200 text-slate-800 ring-slate-300/80",
    pillOn: "border-slate-700 bg-slate-700 text-white",
    pillOff:
      "border-slate-200 bg-slate-50 text-slate-600/70 hover:border-slate-300",
  },
};

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

function parseTaskDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
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

function eventsForDay(task: Task, day: Date): DayEvent[] {
  const events: DayEvent[] = [];
  if (isDateOnDay(task.uatDate, day)) {
    events.push({ key: `${task.id}-uat`, task, kind: "uat" });
  }
  if (isDateOnDay(task.prdDate, day)) {
    events.push({ key: `${task.id}-prd`, task, kind: "prd" });
  }
  if (isDateOnDay(task.startDate, day)) {
    events.push({ key: `${task.id}-start`, task, kind: "start" });
  }
  if (isDateOnDay(task.endDate, day)) {
    events.push({ key: `${task.id}-end`, task, kind: "end" });
  }
  return events;
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

function taskAssigneeList(task: Task) {
  if (task.assignees?.length) return task.assignees;
  if (task.assignee) return [task.assignee];
  return [];
}

function taskAssigneeLabel(task: Task) {
  const names = taskAssigneeList(task)
    .map((member) => member.nickname)
    .filter(Boolean);
  return names.length > 0 ? names.join(", ") : "ยังไม่ระบุ";
}

function TaskAssigneeLine({
  task,
  className,
}: {
  task: Task;
  className?: string;
}) {
  const assignees = taskAssigneeList(task);
  return (
    <div className={`flex min-w-0 items-center gap-1.5 ${className ?? ""}`}>
      {assignees.length > 0 ? (
        <AssigneesDisplay assignees={assignees} empty="" max={3} />
      ) : null}
      <span className="min-w-0 truncate">{taskAssigneeLabel(task)}</span>
    </div>
  );
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

function nearestUpcomingDate(task: Task, from: Date) {
  const candidates = [
    parseTaskDate(task.uatDate),
    parseTaskDate(task.prdDate),
    parseTaskDate(task.startDate),
    parseTaskDate(task.endDate),
  ].filter((date): date is Date => date !== null);

  const upcoming = candidates
    .filter((date) => !isBefore(startOfDay(date), startOfDay(from)))
    .sort((a, b) => a.getTime() - b.getTime());

  return upcoming[0] ?? null;
}

function kindForDate(task: Task, date: Date): EventKind | null {
  if (isDateOnDay(task.uatDate, date)) return "uat";
  if (isDateOnDay(task.prdDate, date)) return "prd";
  if (isDateOnDay(task.startDate, date)) return "start";
  if (isDateOnDay(task.endDate, date)) return "end";
  return null;
}

export function TaskCalendarView({
  tasks,
  taskTypes = [],
  onEditTask,
}: TaskCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [copied, setCopied] = useState(false);
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [filters, setFilters] = useState<EventFilters>(DEFAULT_FILTERS);
  const layoutRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(
    null,
  );

  useEffect(() => {
    try {
      const storedWidth = localStorage.getItem(PANEL_STORAGE_KEY);
      if (storedWidth) {
        const parsed = Number(storedWidth);
        if (Number.isFinite(parsed)) {
          setPanelWidth(Math.min(PANEL_MAX, Math.max(PANEL_MIN, parsed)));
        }
      }
      if (localStorage.getItem(PANEL_COLLAPSED_KEY) === "1") {
        setPanelCollapsed(true);
      }
      const storedFilters = localStorage.getItem(FILTER_STORAGE_KEY);
      if (storedFilters) {
        const parsed = JSON.parse(storedFilters) as Partial<EventFilters>;
        setFilters({ ...DEFAULT_FILTERS, ...parsed });
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PANEL_STORAGE_KEY, String(panelWidth));
    } catch {
      // ignore
    }
  }, [panelWidth]);

  useEffect(() => {
    try {
      localStorage.setItem(PANEL_COLLAPSED_KEY, panelCollapsed ? "1" : "0");
    } catch {
      // ignore
    }
  }, [panelCollapsed]);

  useEffect(() => {
    try {
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
    } catch {
      // ignore
    }
  }, [filters]);

  useEffect(() => {
    if (!isResizing) return;

    function onMove(event: PointerEvent) {
      const drag = resizeRef.current;
      const layout = layoutRef.current;
      if (!drag || !layout) return;
      const bounds = layout.getBoundingClientRect();
      const maxWidth = Math.min(PANEL_MAX, Math.floor(bounds.width * 0.55));
      const next = drag.startWidth + (drag.startX - event.clientX);
      setPanelWidth(Math.min(maxWidth, Math.max(PANEL_MIN, next)));
    }

    function onUp() {
      resizeRef.current = null;
      setIsResizing(false);
      document.body.classList.remove("task-calendar-resizing");
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [isResizing]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentMonth]);

  const weekCount = Math.round(calendarDays.length / 7);

  const monthBounds = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return { start, end };
  }, [currentMonth]);

  const monthEventStats = useMemo(() => {
    const counts: Record<EventKind, number> = {
      uat: 0,
      prd: 0,
      start: 0,
      end: 0,
    };
    const taskIds = new Set<string>();

    for (const task of tasks) {
      const dates: Array<{ kind: EventKind; date: Date | null }> = [
        { kind: "uat", date: parseTaskDate(task.uatDate) },
        { kind: "prd", date: parseTaskDate(task.prdDate) },
        { kind: "start", date: parseTaskDate(task.startDate) },
        { kind: "end", date: parseTaskDate(task.endDate) },
      ];
      for (const item of dates) {
        if (
          item.date &&
          !isBefore(item.date, monthBounds.start) &&
          !isAfter(item.date, monthBounds.end)
        ) {
          counts[item.kind] += 1;
          taskIds.add(task.id);
        }
      }
    }

    return { counts, taskCount: taskIds.size };
  }, [tasks, monthBounds]);

  const coverage = useMemo(() => {
    const withAnyDate = tasks.filter(
      (task) =>
        task.uatDate || task.prdDate || task.startDate || task.endDate,
    );
    const total = Math.max(withAnyDate.length, 1);
    const withUat = withAnyDate.filter((task) => task.uatDate).length;
    const withPrd = withAnyDate.filter((task) => task.prdDate).length;
    const withStart = withAnyDate.filter((task) => task.startDate).length;
    return {
      total: withAnyDate.length,
      uatPct: Math.round((withUat / total) * 100),
      prdPct: Math.round((withPrd / total) * 100),
      startPct: Math.round((withStart / total) * 100),
      uat: withUat,
      prd: withPrd,
      start: withStart,
    };
  }, [tasks]);

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

  const selectedDayEvents = useMemo(() => {
    return tasks
      .flatMap((task) => eventsForDay(task, selectedDate))
      .filter((event) => filters[event.kind]);
  }, [tasks, selectedDate, filters]);

  const selectedDayHasClash =
    uatTasksForDay.length > 0 && prdTasksForDay.length > 0;

  const selectedDayLabel = isSameDay(selectedDate, new Date())
    ? "วันนี้"
    : format(selectedDate, "d MMM", { locale: th });

  const upNext = useMemo(() => {
    const from = startOfDay(selectedDate);
    return tasks
      .map((task) => {
        const date = nearestUpcomingDate(task, from);
        if (!date) return null;
        const kind = kindForDate(task, date);
        if (!kind || !filters[kind]) return null;
        return { task, date, kind };
      })
      .filter(
        (
          item,
        ): item is { task: Task; date: Date; kind: EventKind } =>
          item !== null,
      )
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 6);
  }, [tasks, selectedDate, filters]);

  function getEventsOnDay(day: Date) {
    return tasks
      .flatMap((task) => eventsForDay(task, day))
      .filter((event) => filters[event.kind]);
  }

  function toggleFilter(kind: EventKind) {
    setFilters((prev) => ({ ...prev, [kind]: !prev[kind] }));
  }

  function startResize(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    resizeRef.current = {
      startX: event.clientX,
      startWidth: panelWidth,
    };
    setIsResizing(true);
    setPanelCollapsed(false);
    document.body.classList.add("task-calendar-resizing");
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

  function renderDetailPanel(showCollapse: boolean) {
    return (
      <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-slate-900">
              {format(selectedDate, "d MMMM yyyy", { locale: th })}
            </h3>
            <p className="mt-0.5 text-sm text-slate-500">
              {selectedDayEvents.length} รายการวันนี้
              {selectedDayHasClash ? " · มีการชนกันของ UAT/PRD" : ""}
            </p>
          </div>
          {showCollapse ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setPanelCollapsed(true)}
              aria-label="ซ่อนแผงรายละเอียด"
              title="ซ่อนแผงรายละเอียด"
            >
              <PanelRightClose className="h-4 w-4" />
            </Button>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
          <div className="space-y-2.5">
            <p className="text-caption font-semibold tracking-wide text-slate-500 uppercase">
              ความครอบคลุม Timeline
            </p>
            {(
              [
                {
                  key: "uat",
                  label: "มีวัน UAT",
                  pct: coverage.uatPct,
                  count: coverage.uat,
                  bar: "bg-amber-500",
                },
                {
                  key: "prd",
                  label: "มีวัน PRD",
                  pct: coverage.prdPct,
                  count: coverage.prd,
                  bar: "bg-emerald-500",
                },
                {
                  key: "start",
                  label: "มีวันเริ่ม",
                  pct: coverage.startPct,
                  count: coverage.start,
                  bar: "bg-sky-500",
                },
              ] as const
            ).map((row) => (
              <div key={row.key} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-caption">
                  <span className="font-medium text-slate-600">{row.label}</span>
                  <span className="tabular-nums text-slate-500">
                    {row.count}/{coverage.total} · {row.pct}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cn("h-full rounded-full transition-all", row.bar)}
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-caption font-semibold tracking-wide text-slate-500 uppercase">
              ถัดไป
            </p>
            {upNext.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-500">
                ไม่มีรายการถัดไป
              </p>
            ) : (
              <ul className="space-y-1">
                {upNext.map(({ task, date, kind }) => {
                  const assignees = taskAssigneeList(task);
                  const meta = EVENT_META[kind];
                  const when = isSameDay(date, new Date())
                    ? "วันนี้"
                    : isSameDay(date, selectedDate)
                      ? selectedDayLabel
                      : format(date, "d MMM", { locale: th });
                  return (
                    <li key={`${task.id}-${kind}-${date.toISOString()}`}>
                      <button
                        type="button"
                        onClick={() => onEditTask(task)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition hover:bg-slate-50"
                      >
                        {assignees[0] ? (
                          <AssigneeAvatar member={assignees[0]} size="sm" />
                        ) : (
                          <span
                            className={cn(
                              "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-micro font-semibold text-white",
                              meta.dot,
                            )}
                          >
                            {meta.short.slice(0, 1)}
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-900">
                            {task.name}
                          </span>
                          <span className="mt-0.5 block truncate text-caption text-slate-500">
                            {meta.short} · {when}
                            {assignees[0]
                              ? ` · ${assignees[0].nickname}`
                              : ""}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "shrink-0 rounded-md px-1.5 py-0.5 text-micro font-semibold",
                            meta.chip,
                          )}
                        >
                          {meta.short}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                สรุป Timeline วันนี้
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 px-2 text-caption"
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

            {selectedDayHasClash ? (
              <div className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-2 text-caption text-orange-800">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  วันนี้มีทั้ง UAT และ PRD — ตรวจตารางก่อนยืนยัน
                </span>
              </div>
            ) : null}

            <div className="rounded-lg border border-amber-200/80 bg-amber-50/80 p-2.5">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-amber-800">
                  Timeline UAT
                </span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-micro font-medium text-amber-700">
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
                          <span className="mt-0.5 block line-clamp-2 text-micro leading-relaxed text-amber-900/70">
                            <LinkifiedText text={task.description} />
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
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-micro font-medium text-emerald-700">
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
                          <span className="mt-0.5 block line-clamp-2 text-micro leading-relaxed text-emerald-900/70">
                            <LinkifiedText text={task.description} />
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-caption font-semibold tracking-wide text-slate-500 uppercase">
              Task วันนี้ ({tasksForDay.length})
            </p>
            {tasksForDay.length === 0 ? (
              <p className="rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-500">
                ไม่มี task ในวันนี้
              </p>
            ) : null}
            {tasksForDay.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => onEditTask(task)}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-primary/30 hover:bg-slate-50/80"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Badge color={task.priority.color}>
                    {task.priority.label}
                  </Badge>
                  <Badge color={task.status.color}>{task.status.name}</Badge>
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  {task.name}
                </p>
                <TaskAssigneeLine
                  task={task}
                  className="mt-1.5 text-xs text-slate-600"
                />
                {task.description ? (
                  <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-600">
                    <LinkifiedText text={task.description} />
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-slate-500">
                  {taskTypeLabel(task, taskTypes)}
                </p>
                {(isDateOnDay(task.uatDate, selectedDate) ||
                  isDateOnDay(task.prdDate, selectedDate)) && (
                  <div className="mt-2 flex flex-wrap gap-1.5 text-micro">
                    {isDateOnDay(task.uatDate, selectedDate) ? (
                      <span className="rounded-md bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800">
                        UAT {selectedDayLabel}
                      </span>
                    ) : null}
                    {isDateOnDay(task.prdDate, selectedDate) ? (
                      <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 font-medium text-emerald-800">
                        PRD {selectedDayLabel}
                      </span>
                    ) : null}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </aside>
    );
  }

  return (
    <div
      ref={layoutRef}
      className={cn(
        "flex h-full min-h-0 flex-col gap-3 md:flex-row md:gap-0",
        isResizing && "select-none",
      )}
    >
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <h2 className="text-lg font-semibold text-slate-900">
                {format(currentMonth, "MMMM yyyy", { locale: th })}
              </h2>
              <span className="text-sm text-slate-500">
                {monthEventStats.taskCount} task ในเดือนนี้
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {(Object.keys(EVENT_META) as EventKind[]).map((kind) => {
                const meta = EVENT_META[kind];
                const active = filters[kind];
                const count = monthEventStats.counts[kind];
                return (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => toggleFilter(kind)}
                    aria-pressed={active}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-caption font-medium transition",
                      active ? meta.pillOn : meta.pillOff,
                      !active && "opacity-70",
                    )}
                  >
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        active ? "bg-white/90" : meta.dot,
                      )}
                    />
                    {meta.label}
                    <span
                      className={cn(
                        "tabular-nums",
                        active ? "text-white/75" : "opacity-70",
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() =>
                setCurrentMonth((value) => addDays(startOfMonth(value), -1))
              }
              aria-label="เดือนก่อนหน้า"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
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
              className="h-8 w-8"
              onClick={() =>
                setCurrentMonth((value) => addDays(endOfMonth(value), 1))
              }
              aria-label="เดือนถัดไป"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            {panelCollapsed ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="hidden h-8 gap-1.5 md:inline-flex"
                onClick={() => setPanelCollapsed(false)}
              >
                <PanelRightOpen className="h-3.5 w-3.5" />
                รายละเอียด
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 sm:p-4">
          <div className="mb-2 grid shrink-0 grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400 sm:gap-1.5">
            {["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>

          <div
            className="grid min-h-0 flex-1 grid-cols-7 gap-1 sm:gap-1.5"
            style={{
              gridTemplateRows: `repeat(${weekCount}, minmax(5.5rem, 1fr))`,
            }}
          >
            {calendarDays.map((day) => {
              const dayEvents = getEventsOnDay(day);
              const uatCount = dayEvents.filter((e) => e.kind === "uat").length;
              const prdCount = dayEvents.filter((e) => e.kind === "prd").length;
              const hasClash = uatCount > 0 && prdCount > 0;
              const isBusy = dayEvents.length >= BUSY_DAY_THRESHOLD;
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              const visibleEvents = dayEvents.slice(0, MAX_EVENT_CHIPS);
              const overflow = dayEvents.length - visibleEvents.length;

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => {
                    setSelectedDate(day);
                    if (panelCollapsed) setPanelCollapsed(false);
                  }}
                  aria-pressed={isSelected}
                  aria-label={`เลือกวันที่ ${format(day, "d MMMM yyyy", { locale: th })}${dayEvents.length > 0 ? ` · ${dayEvents.length} รายการ` : ""}${hasClash ? " · มีการชนกัน" : ""}`}
                  className={cn(
                    "group flex min-h-0 flex-col overflow-hidden rounded-xl border p-1.5 text-left transition sm:p-2",
                    isSelected
                      ? "border-slate-900/20 bg-slate-50 ring-2 ring-slate-900/10"
                      : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/70",
                    !isSameMonth(day, currentMonth) && "opacity-40",
                    hasClash &&
                      !isSelected &&
                      "border-orange-200 bg-orange-50/40",
                  )}
                >
                  <span className="mb-1 flex w-full shrink-0 items-center justify-between gap-1">
                    <span
                      className={cn(
                        "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm",
                        isToday
                          ? "bg-slate-900 font-bold text-white"
                          : "font-medium text-slate-700",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    <span className="flex items-center gap-1">
                      {hasClash ? (
                        <span
                          title="UAT และ PRD ชนกัน"
                          className="inline-flex items-center gap-0.5 rounded-md bg-orange-100 px-1 py-0.5 text-micro font-semibold text-orange-700"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          ชน
                        </span>
                      ) : isBusy ? (
                        <span className="rounded-md bg-slate-100 px-1 py-0.5 text-micro font-medium text-slate-500">
                          แน่น
                        </span>
                      ) : null}
                    </span>
                  </span>

                  <span className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
                    {visibleEvents.map((event) => {
                      const meta = EVENT_META[event.kind];
                      return (
                        <span
                          key={event.key}
                          title={`${meta.short}: ${event.task.name}`}
                          className={cn(
                            "flex min-w-0 items-center gap-1 truncate rounded-md px-1 py-0.5 text-micro font-medium ring-1 ring-inset",
                            meta.bar,
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 shrink-0 rounded-full",
                              meta.dot,
                            )}
                          />
                          <span className="truncate">{event.task.name}</span>
                        </span>
                      );
                    })}
                    {overflow > 0 ? (
                      <span className="px-1 text-micro font-medium text-slate-400">
                        +{overflow} อื่นๆ
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="hidden md:flex md:items-stretch">
        {!panelCollapsed ? (
          <button
            type="button"
            aria-label="ลากเพื่อปรับความกว้างแผงรายละเอียด"
            title="ลากเพื่อปรับขนาด · ดับเบิลคลิกเพื่อรีเซ็ต"
            onPointerDown={startResize}
            onDoubleClick={() => setPanelWidth(PANEL_DEFAULT)}
            className={cn(
              "group relative z-10 flex w-3 shrink-0 cursor-col-resize items-center justify-center",
              isResizing && "bg-primary/10",
            )}
          >
            <span
              className={cn(
                "absolute inset-y-8 w-px bg-slate-200 transition group-hover:bg-primary/50",
                isResizing && "bg-primary",
              )}
            />
            <span className="relative flex h-10 w-4 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition group-hover:border-primary/40 group-hover:text-primary">
              <GripVertical className="h-3.5 w-3.5" />
            </span>
          </button>
        ) : null}
      </div>

      {!panelCollapsed ? (
        <div
          className="hidden min-h-0 shrink-0 md:block"
          style={{ width: panelWidth }}
        >
          {renderDetailPanel(true)}
        </div>
      ) : null}

      <div className="min-h-[22rem] md:hidden">{renderDetailPanel(false)}</div>
    </div>
  );
}
