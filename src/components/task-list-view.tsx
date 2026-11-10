"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { InlineAssigneePicker, AssigneesDisplay } from "@/components/assignee-multi-select";
import { TaskTypesDisplay } from "@/components/task-type-multi-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/input";
import { LoadingButtonContent, LoadingOverlay } from "@/components/ui/loading";
import { TaskInlineCreate } from "@/components/task-inline-create";
import { taskSourceLabel } from "@/lib/task-source";
import type { Priority, Status, Task, TaskTypeOption, TeamMember } from "@/lib/types";
import {
  cn,
  formatDate,
  formatDateTime,
  getTaskOverdueState,
} from "@/lib/utils";
import { CalendarRange, ClipboardList, Trash2, X } from "lucide-react";

interface TaskListViewProps {
  tasks: Task[];
  statuses: Status[];
  priorities: Priority[];
  teamMembers: TeamMember[];
  taskTypes: TaskTypeOption[];
  projectId: string;
  onEditTask: (task: Task) => void;
  onStatusChange: (taskId: string, statusId: string) => void;
  onTaskUpdated: (task: Task) => void;
  onSaved: () => void;
  focusCreateTrigger?: number;
}

type TimelineDraft = {
  startDate: string;
  endDate: string;
  uatDate: string;
  prdDate: string;
  applyStart: boolean;
  applyEnd: boolean;
  applyUat: boolean;
  applyPrd: boolean;
  clearStart: boolean;
  clearEnd: boolean;
  clearUat: boolean;
  clearPrd: boolean;
};

const emptyTimelineDraft = (): TimelineDraft => ({
  startDate: "",
  endDate: "",
  uatDate: "",
  prdDate: "",
  applyStart: false,
  applyEnd: false,
  applyUat: true,
  applyPrd: true,
  clearStart: false,
  clearEnd: false,
  clearUat: false,
  clearPrd: false,
});

const stickyHead = "sticky top-0 z-30 bg-slate-50";
/** Fixed widths so sticky `left` offsets stay aligned (checkbox 2.5rem + priority 4rem). */
const stickyCheckbox = "sticky left-0 z-10 w-10 min-w-10 max-w-10";
const stickyPriority = "sticky left-10 z-10 w-16 min-w-16 max-w-16";
const stickyName = "sticky left-[6.5rem] z-20";

export function TaskListView({
  tasks,
  statuses,
  priorities,
  teamMembers,
  taskTypes,
  projectId,
  onEditTask,
  onStatusChange,
  onTaskUpdated,
  onSaved,
  focusCreateTrigger = 0,
}: TaskListViewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [paintDelays, setPaintDelays] = useState<Map<string, number>>(
    () => new Map(),
  );
  const [bulkStatusId, setBulkStatusId] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("กำลังอัปเดต...");
  const [error, setError] = useState<string | null>(null);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timelineDraft, setTimelineDraft] = useState<TimelineDraft>(emptyTimelineDraft);
  const paintRef = useRef<{
    active: boolean;
    mode: boolean;
    anchor: number;
    snapshot: Set<string>;
  } | null>(null);
  const lastAnchorRef = useRef<number | null>(null);
  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const paintCleanupRef = useRef<(() => void) | null>(null);

  const taskIds = useMemo(() => tasks.map((task) => task.id), [tasks]);

  useEffect(() => {
    setSelectedIds((current) => {
      const next = new Set([...current].filter((id) => taskIds.includes(id)));
      return next.size === current.size ? current : next;
    });
  }, [taskIds]);

  useEffect(() => {
    return () => {
      paintCleanupRef.current?.();
    };
  }, []);

  const allSelected =
    tasks.length > 0 && tasks.every((task) => selectedIds.has(task.id));
  const selectedCount = selectedIds.size;

  function applyPaintRange(
    from: number,
    to: number,
    mode: boolean,
    snapshot: Set<string>,
  ) {
    const list = tasksRef.current;
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    const next = new Set(snapshot);
    const delays = new Map<string, number>();
    for (let i = lo; i <= hi; i++) {
      const task = list[i];
      if (!task) continue;
      if (mode) next.add(task.id);
      else next.delete(task.id);
      delays.set(task.id, Math.abs(i - from) * 18);
    }
    setSelectedIds(next);
    setPaintDelays(delays);
  }

  function finishPaint() {
    if (!paintRef.current?.active) return;
    paintRef.current.active = false;
    paintCleanupRef.current?.();
    paintCleanupRef.current = null;
    document.body.classList.remove("task-painting");
    window.setTimeout(() => setPaintDelays(new Map()), 320);
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(taskIds));
  }

  function paintThroughIndex(index: number) {
    const paint = paintRef.current;
    if (!paint?.active) return;
    applyPaintRange(paint.anchor, index, paint.mode, paint.snapshot);
  }

  function startPaint(index: number, event: ReactPointerEvent<HTMLElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    if (event.shiftKey && lastAnchorRef.current != null) {
      const snapshot = new Set(selectedIdsRef.current);
      applyPaintRange(lastAnchorRef.current, index, true, snapshot);
      lastAnchorRef.current = index;
      return;
    }

    const list = tasksRef.current;
    const task = list[index];
    if (!task) return;
    const mode = !selectedIdsRef.current.has(task.id);
    const snapshot = new Set(selectedIdsRef.current);
    paintRef.current = {
      active: true,
      mode,
      anchor: index,
      snapshot,
    };
    lastAnchorRef.current = index;
    document.body.classList.add("task-painting");
    applyPaintRange(index, index, mode, snapshot);

    const onMove = (moveEvent: PointerEvent) => {
      const cell = document
        .elementFromPoint(moveEvent.clientX, moveEvent.clientY)
        ?.closest<HTMLElement>("[data-paint-index]");
      if (!cell) return;
      const nextIndex = Number(cell.dataset.paintIndex);
      if (!Number.isFinite(nextIndex)) return;
      paintThroughIndex(nextIndex);
    };
    const onUp = () => finishPaint();

    paintCleanupRef.current?.();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    paintCleanupRef.current = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }

  async function runBulkUpdate(
    payload: Record<string, unknown>,
    label = "กำลังอัปเดตรายการที่เลือก...",
  ) {
    if (selectedCount === 0 || busy) return false;
    setBusy(true);
    setBusyLabel(label);
    setError(null);
    try {
      const response = await fetch("/api/tasks/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: [...selectedIds],
          ...payload,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "อัปเดตหลายรายการไม่สำเร็จ");
        return false;
      }
      await onSaved();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "อัปเดตหลายรายการไม่สำเร็จ");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleBulkStatus() {
    if (!bulkStatusId) return;
    const ok = await runBulkUpdate(
      { statusId: bulkStatusId },
      "กำลังเปลี่ยนสถานะรายการที่เลือก...",
    );
    if (ok) {
      setBulkStatusId("");
      setSelectedIds(new Set());
    }
  }

  async function handleBulkDelete() {
    if (selectedCount === 0 || busy) return;
    const confirmed = window.confirm(
      `ลบ ${selectedCount.toLocaleString("th-TH")} รายการที่เลือก?\nการลบนี้ย้อนกลับไม่ได้`,
    );
    if (!confirmed) return;

    setBusy(true);
    setBusyLabel("กำลังลบรายการที่เลือก...");
    setError(null);
    try {
      const response = await fetch("/api/tasks/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selectedIds] }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "ลบหลายรายการไม่สำเร็จ");
        return;
      }
      setSelectedIds(new Set());
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ลบหลายรายการไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function handleBulkTimeline() {
    const payload: Record<string, string | null> = {};
    const missing: string[] = [];

    const applyField = (
      apply: boolean,
      clear: boolean,
      value: string,
      key: "startDate" | "endDate" | "uatDate" | "prdDate",
      label: string,
    ) => {
      if (!apply) return;
      if (clear) {
        payload[key] = null;
        return;
      }
      if (!value) {
        missing.push(label);
        return;
      }
      payload[key] = value;
    };

    applyField(
      timelineDraft.applyStart,
      timelineDraft.clearStart,
      timelineDraft.startDate,
      "startDate",
      "Start",
    );
    applyField(
      timelineDraft.applyEnd,
      timelineDraft.clearEnd,
      timelineDraft.endDate,
      "endDate",
      "End",
    );
    applyField(
      timelineDraft.applyUat,
      timelineDraft.clearUat,
      timelineDraft.uatDate,
      "uatDate",
      "UAT",
    );
    applyField(
      timelineDraft.applyPrd,
      timelineDraft.clearPrd,
      timelineDraft.prdDate,
      "prdDate",
      "PRD",
    );

    if (missing.length > 0) {
      setError(`กรุณาเลือกวันที่สำหรับ: ${missing.join(", ")} หรือติ๊ก “ล้างค่า”`);
      return;
    }

    if (Object.keys(payload).length === 0) {
      setError("เลือกอย่างน้อย 1 ฟิลด์วันที่ที่ต้องการเปลี่ยน");
      return;
    }

    const ok = await runBulkUpdate(
      payload,
      "กำลังปรับ Timeline รายการที่เลือก...",
    );
    if (ok) {
      setTimelineOpen(false);
      setTimelineDraft(emptyTimelineDraft());
      setSelectedIds(new Set());
    }
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {busy ? (
        <LoadingOverlay
          label={busyLabel}
          className="z-30 rounded-2xl"
        />
      ) : null}

      <div className="shrink-0 border-b border-slate-100">
        <TaskInlineCreate
          statuses={statuses}
          priorities={priorities}
          teamMembers={teamMembers}
          taskTypes={taskTypes}
          projectId={projectId}
          onSaved={onSaved}
          focusTrigger={focusCreateTrigger}
        />
      </div>

      <div
        className={cn(
          "min-h-0 flex-1 overflow-auto overscroll-contain",
          selectedCount > 0 && "pb-24",
        )}
      >
        {tasks.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center p-10 text-center">
            <ClipboardList className="mb-4 h-10 w-10 text-slate-300" />
            <h3 className="text-base font-semibold text-slate-800">
              ยังไม่มี task
            </h3>
            <p className="mt-2 max-w-md text-sm text-slate-500">
              พิมพ์ชื่อ task ด้านบนแล้วกด Enter หรือปุ่มสร้างเพื่อเพิ่มงานใหม่
            </p>
          </div>
        ) : (
          <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th
                  className={cn(
                    stickyHead,
                    stickyCheckbox,
                    "z-30 box-border border-b border-slate-200 px-3 py-2.5",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={allSelected}
                    aria-label="เลือกทั้งหมด"
                    className="h-4 w-4 rounded border-slate-300 text-primary accent-primary focus:ring-primary/30"
                    onChange={toggleAll}
                  />
                </th>
                <th
                  className={cn(
                    stickyHead,
                    stickyPriority,
                    "z-30 box-border overflow-hidden border-b border-slate-200 px-2 py-2.5 font-medium",
                  )}
                >
                  Priority
                </th>
                <th
                  className={cn(
                    stickyHead,
                    stickyName,
                    "z-40 min-w-[16rem] border-b border-slate-200 px-3 py-2.5 font-medium shadow-[6px_0_10px_-6px_rgba(15,23,42,0.22)]",
                  )}
                >
                  Task Name
                </th>
                <th
                  className={cn(
                    stickyHead,
                    "hidden border-b border-slate-200 px-3 py-2.5 font-medium xl:table-cell",
                  )}
                >
                  Subtasks
                </th>
                <th
                  className={cn(
                    stickyHead,
                    "whitespace-nowrap border-b border-slate-200 px-3 py-2.5 font-medium",
                  )}
                >
                  Status
                </th>
                <th
                  className={cn(
                    stickyHead,
                    "hidden whitespace-nowrap border-b border-slate-200 px-3 py-2.5 font-medium 2xl:table-cell",
                  )}
                >
                  เปลี่ยนสถานะล่าสุด
                </th>
                <th
                  className={cn(
                    stickyHead,
                    "hidden whitespace-nowrap border-b border-slate-200 px-3 py-2.5 font-medium lg:table-cell",
                  )}
                >
                  ผู้ดูแล
                </th>
                <th
                  className={cn(
                    stickyHead,
                    "hidden whitespace-nowrap border-b border-slate-200 px-3 py-2.5 font-medium xl:table-cell",
                  )}
                >
                  Assignee
                </th>
                <th
                  className={cn(
                    stickyHead,
                    "hidden whitespace-nowrap border-b border-slate-200 px-3 py-2.5 font-medium xl:table-cell",
                  )}
                >
                  Start
                </th>
                <th
                  className={cn(
                    stickyHead,
                    "hidden whitespace-nowrap border-b border-slate-200 px-3 py-2.5 font-medium xl:table-cell",
                  )}
                >
                  End
                </th>
                <th
                  className={cn(
                    stickyHead,
                    "whitespace-nowrap border-b border-slate-200 px-3 py-2.5 font-medium",
                  )}
                >
                  UAT
                </th>
                <th
                  className={cn(
                    stickyHead,
                    "whitespace-nowrap border-b border-slate-200 px-3 py-2.5 font-medium",
                  )}
                >
                  PRD
                </th>
                <th
                  className={cn(
                    stickyHead,
                    "whitespace-nowrap border-b border-slate-200 px-3 py-2.5 font-medium",
                  )}
                >
                  Type
                </th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task, index) => {
                const { overdue, field: overdueField } =
                  getTaskOverdueState(task);
                const sourceLabel = taskSourceLabel(task.source);
                const selected = selectedIds.has(task.id);
                const paintDelay = paintDelays.get(task.id);
                const rowBg = selected
                  ? overdue
                    ? "bg-[color-mix(in_srgb,var(--danger)_10%,white)]"
                    : "bg-[color-mix(in_srgb,var(--primary)_12%,white)]"
                  : overdue
                    ? "bg-red-50"
                    : index % 2 === 0
                      ? "bg-white"
                      : "bg-slate-50";
                const borderClass = selected
                  ? overdue
                    ? "border-[color-mix(in_srgb,var(--danger)_20%,#fecaca)]"
                    : "border-[color-mix(in_srgb,var(--primary)_18%,#e2e8f0)]"
                  : overdue
                    ? "border-red-100"
                    : "border-slate-100";
                return (
                  <tr
                    key={task.id}
                    className={cn(
                      "task-row-paint cursor-pointer",
                      !selected &&
                        (overdue ? "hover:bg-red-50" : "hover:bg-slate-50"),
                    )}
                    data-selected={selected ? "true" : "false"}
                    data-overdue={overdue ? "true" : "false"}
                    style={
                      paintDelay != null
                        ? ({
                            "--paint-delay": `${paintDelay}ms`,
                          } as CSSProperties)
                        : undefined
                    }
                    onClick={() => onEditTask(task)}
                  >
                    <td
                      data-paint-index={index}
                      className={cn(
                        stickyCheckbox,
                        rowBg,
                        borderClass,
                        "touch-none border-b px-3 py-2 select-none",
                      )}
                      onClick={(event) => event.stopPropagation()}
                      onPointerDown={(event) => startPaint(index, event)}
                      onPointerEnter={() => paintThroughIndex(index)}
                      onMouseOver={() => paintThroughIndex(index)}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        tabIndex={-1}
                        readOnly
                        aria-label={`เลือก ${task.name}`}
                        className="pointer-events-none h-4 w-4 rounded border-slate-300 text-primary accent-primary focus:ring-primary/30"
                      />
                    </td>
                    <td
                      className={cn(
                        stickyPriority,
                        rowBg,
                        borderClass,
                        "box-border overflow-hidden border-b px-2 py-2",
                      )}
                    >
                      <Badge color={task.priority.color}>
                        {task.priority.label}
                      </Badge>
                    </td>
                    <td
                      className={cn(
                        stickyName,
                        rowBg,
                        borderClass,
                        "min-w-[16rem] max-w-[24rem] border-b px-3 py-2 shadow-[6px_0_10px_-6px_rgba(15,23,42,0.22)]",
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p
                          className={cn(
                            "line-clamp-2 font-medium",
                            overdue ? "text-red-800" : "text-slate-900",
                          )}
                        >
                          {task.name}
                        </p>
                        {overdue ? (
                          <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-micro font-semibold text-red-700">
                            เกินกำหนด
                          </span>
                        ) : null}
                        {sourceLabel ? (
                          <span
                            className="rounded-md bg-sky-50 px-1.5 py-0.5 text-micro font-semibold text-sky-700"
                            title="นำเข้าจาก Google Sheet"
                          >
                            {sourceLabel}
                          </span>
                        ) : null}
                      </div>
                      {task.description?.trim() ? (
                        <p
                          className={cn(
                            "mt-0.5 line-clamp-1 text-xs leading-relaxed",
                            overdue ? "text-red-700/70" : "text-slate-500",
                          )}
                        >
                          {task.description.trim()}
                        </p>
                      ) : null}
                    </td>
                    <td
                      className={cn(
                        borderClass,
                        "hidden border-b px-3 py-2 text-xs text-slate-500 xl:table-cell",
                      )}
                    >
                      {(task.subtasks ?? []).length > 0
                        ? `${(task.subtasks ?? []).filter((item) => item.isDone).length}/${(task.subtasks ?? []).length}`
                        : "-"}
                    </td>
                    <td
                      className={cn(
                        borderClass,
                        "whitespace-nowrap border-b px-3 py-2",
                      )}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Select
                        aria-label={`สถานะของ ${task.name}`}
                        className="h-6 min-w-[5.5rem] max-w-[7.5rem] rounded-md border-0 px-1.5 py-0 text-micro font-medium leading-6 focus-visible:ring-1 focus-visible:ring-primary/30"
                        style={{
                          backgroundColor: `${task.status.color}1a`,
                          color: task.status.color,
                        }}
                        value={task.statusId}
                        onChange={(event) => {
                          const nextId = event.target.value;
                          if (nextId && nextId !== task.statusId) {
                            onStatusChange(task.id, nextId);
                          }
                        }}
                      >
                        {statuses.map((status) => (
                          <option key={status.id} value={status.id}>
                            {status.name}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td
                      className={cn(
                        borderClass,
                        "hidden whitespace-nowrap border-b px-3 py-2 text-xs text-slate-500 2xl:table-cell",
                      )}
                    >
                      {formatDateTime(
                        task.statusHistory?.[task.statusHistory.length - 1]
                          ?.changedAt,
                      )}
                    </td>
                    <td
                      className={cn(
                        borderClass,
                        "hidden whitespace-nowrap border-b px-3 py-2 lg:table-cell",
                      )}
                    >
                      {task.owner ? (
                        <div className="flex max-w-[8rem] items-center gap-2">
                          <AssigneesDisplay
                            assignees={[task.owner]}
                            empty=""
                          />
                          <span className="truncate text-sm font-medium text-slate-700">
                            {task.owner.nickname}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td
                      className={cn(
                        borderClass,
                        "hidden border-b px-3 py-2 xl:table-cell",
                      )}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <InlineAssigneePicker
                        taskId={task.id}
                        members={teamMembers}
                        assignees={
                          task.assignees?.length
                            ? task.assignees
                            : task.assignee
                              ? [task.assignee]
                              : []
                        }
                        onUpdated={onTaskUpdated}
                      />
                    </td>
                    <td
                      className={cn(
                        borderClass,
                        "hidden whitespace-nowrap border-b px-3 py-2 text-slate-600 xl:table-cell",
                      )}
                    >
                      {formatDate(task.startDate)}
                    </td>
                    <td
                      className={cn(
                        borderClass,
                        "hidden whitespace-nowrap border-b px-3 py-2 xl:table-cell",
                        overdueField === "endDate"
                          ? "font-semibold text-red-600"
                          : "text-slate-600",
                      )}
                    >
                      {formatDate(task.endDate)}
                    </td>
                    <td
                      className={cn(
                        borderClass,
                        "whitespace-nowrap border-b px-3 py-2",
                        overdueField === "uatDate"
                          ? "font-semibold text-red-600"
                          : "text-slate-600",
                      )}
                    >
                      {formatDate(task.uatDate)}
                    </td>
                    <td
                      className={cn(
                        borderClass,
                        "whitespace-nowrap border-b px-3 py-2",
                        overdueField === "prdDate"
                          ? "font-semibold text-red-600"
                          : "text-slate-600",
                      )}
                    >
                      {formatDate(task.prdDate)}
                    </td>
                    <td
                      className={cn(
                        borderClass,
                        "whitespace-nowrap border-b px-3 py-2 text-slate-600",
                      )}
                    >
                      <TaskTypesDisplay
                        options={taskTypes}
                        types={
                          task.taskTypes?.length
                            ? task.taskTypes
                            : task.taskType
                              ? [task.taskType]
                              : []
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {tasks.length > 0 ? (
          <p className="task-paint-hint px-4 py-3 text-center text-caption text-slate-400">
            ลากที่ช่องเลือกเพื่อทาสีเลือกหลายแถว · Shift+คลิกเลือกเป็นช่วง
          </p>
        ) : null}
      </div>

      {selectedCount > 0 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-40 flex flex-col items-center gap-2 px-3">
          {error ? (
            <p className="task-bulk-bar pointer-events-auto rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 shadow-sm">
              {error}
            </p>
          ) : null}
          <div className="task-bulk-bar pointer-events-auto flex max-w-full flex-wrap items-center gap-2 rounded-full border border-white/10 bg-slate-950/95 px-2 py-2 text-white shadow-2xl shadow-slate-950/40 backdrop-blur-md sm:gap-2.5 sm:px-2.5">
            <div className="flex items-center gap-1.5 pl-0.5">
              <button
                type="button"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white disabled:opacity-40"
                onClick={() => {
                  setSelectedIds(new Set());
                  setBulkStatusId("");
                  setError(null);
                }}
                disabled={busy}
                aria-label="ยกเลิกการเลือก"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <span className="pr-1 text-sm font-medium whitespace-nowrap">
                <span className="tabular-nums">
                  {selectedCount.toLocaleString("th-TH")}
                </span>{" "}
                รายการที่เลือก
              </span>
            </div>

            <div className="hidden h-6 w-px shrink-0 bg-white/15 sm:block" />

            <div className="flex flex-wrap items-center gap-1.5">
              <div className="flex items-center gap-1.5 rounded-full bg-white/10 p-1">
                <Select
                  aria-label="เปลี่ยนสถานะรายการที่เลือก"
                  className="h-8 min-w-[8.5rem] rounded-full border-0 bg-white px-3 py-0 text-sm leading-8 text-slate-900 shadow-sm focus-visible:ring-2 focus-visible:ring-primary/40 sm:w-[9.5rem]"
                  value={bulkStatusId}
                  disabled={busy}
                  onChange={(event) => {
                    setBulkStatusId(event.target.value);
                    setError(null);
                  }}
                >
                  <option value="">เปลี่ยนสถานะ...</option>
                  {statuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.name}
                    </option>
                  ))}
                </Select>
                <Button
                  type="button"
                  size="sm"
                  className={cn(
                    "h-8 rounded-full px-3.5 shadow-sm disabled:opacity-100",
                    bulkStatusId
                      ? "bg-primary text-white hover:bg-primary-dark"
                      : "bg-white/15 text-white/50 hover:bg-white/15 hover:text-white/50",
                  )}
                  disabled={busy || !bulkStatusId}
                  onClick={() => void handleBulkStatus()}
                >
                  <LoadingButtonContent loading={busy && Boolean(bulkStatusId)}>
                    ใช้สถานะ
                  </LoadingButtonContent>
                </Button>
              </div>

              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 rounded-full px-3 text-white hover:bg-white/15 hover:text-white"
                disabled={busy}
                onClick={() => {
                  setError(null);
                  setTimelineDraft(emptyTimelineDraft());
                  setTimelineOpen(true);
                }}
              >
                <CalendarRange className="h-3.5 w-3.5" />
                Timeline
              </Button>

              <Button
                type="button"
                size="sm"
                className="h-8 rounded-full bg-red-500 px-3 text-white hover:bg-red-400"
                disabled={busy}
                onClick={() => void handleBulkDelete()}
              >
                <Trash2 className="h-3.5 w-3.5" />
                ลบ
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Dialog open={timelineOpen} onOpenChange={setTimelineOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>ปรับ Timeline หลายรายการ</DialogTitle>
            <DialogDescription>
              จะอัปเดตเฉพาะฟิลด์ที่ติ๊กไว้ กับ{" "}
              {selectedCount.toLocaleString("th-TH")} รายการที่เลือก
              โดยไม่แตะฟิลด์อื่น
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {(
              [
                {
                  key: "start",
                  label: "Start",
                  apply: "applyStart",
                  clear: "clearStart",
                  value: "startDate",
                },
                {
                  key: "end",
                  label: "End",
                  apply: "applyEnd",
                  clear: "clearEnd",
                  value: "endDate",
                },
                {
                  key: "uat",
                  label: "Timeline UAT",
                  apply: "applyUat",
                  clear: "clearUat",
                  value: "uatDate",
                },
                {
                  key: "prd",
                  label: "Timeline PRD",
                  apply: "applyPrd",
                  clear: "clearPrd",
                  value: "prdDate",
                },
              ] as const
            ).map((field) => (
              <div
                key={field.key}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={timelineDraft[field.apply]}
                      className="h-4 w-4 rounded border-slate-300 text-primary accent-primary focus:ring-primary/30"
                      onChange={(event) =>
                        setTimelineDraft((current) => ({
                          ...current,
                          [field.apply]: event.target.checked,
                        }))
                      }
                    />
                    {field.label}
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                    <input
                      type="checkbox"
                      checked={timelineDraft[field.clear]}
                      disabled={!timelineDraft[field.apply]}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-primary accent-primary focus:ring-primary/30"
                      onChange={(event) =>
                        setTimelineDraft((current) => ({
                          ...current,
                          [field.clear]: event.target.checked,
                        }))
                      }
                    />
                    ล้างค่า
                  </label>
                </div>
                <DateInput
                  id={`bulk-${field.value}`}
                  compact
                  disabled={
                    !timelineDraft[field.apply] || timelineDraft[field.clear]
                  }
                  value={timelineDraft[field.value]}
                  onChange={(event) =>
                    setTimelineDraft((current) => ({
                      ...current,
                      [field.value]: event.target.value,
                    }))
                  }
                />
              </div>
            ))}

            {error ? <p className="text-xs text-amber-700">{error}</p> : null}

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setTimelineOpen(false)}
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                disabled={busy}
                onClick={() => void handleBulkTimeline()}
              >
                <LoadingButtonContent loading={busy}>
                  บันทึก Timeline
                </LoadingButtonContent>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
