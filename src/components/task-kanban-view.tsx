"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useEffect, useMemo, useState } from "react";
import { TaskCard } from "@/components/task-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DONE_STATUS_NAME } from "@/lib/default-statuses";
import type { Status, Task } from "@/lib/types";
import { calendarDateKey, cn, formatDate } from "@/lib/utils";
import { CalendarDays, LayoutGrid, Plus } from "lucide-react";

const DONE_VIEW_KEY = "fwf-kanban-done-view";

type DoneViewMode = "dates" | "cards";

interface TaskKanbanViewProps {
  tasks: Task[];
  statuses: Status[];
  onStatusChange: (taskId: string, statusId: string) => void;
  onEditTask: (task: Task) => void;
  onStartCreate?: (statusId: string) => void;
}

function withAlpha(hex: string, alpha: string) {
  const normalized = hex.startsWith("#") ? hex.slice(0, 7) : `#${hex.slice(0, 6)}`;
  return `${normalized}${alpha}`;
}

function isDoneStatus(status: Status) {
  return status.name.trim().toLowerCase() === DONE_STATUS_NAME.toLowerCase();
}

function doneTaskDateKey(task: Task) {
  const enteredDone = [...(task.statusHistory ?? [])]
    .reverse()
    .find(
      (entry) => entry.toStatusName.trim().toLowerCase() === "done",
    )?.changedAt;

  return (
    calendarDateKey(task.prdDate) ??
    calendarDateKey(enteredDone) ??
    calendarDateKey(task.uatDate) ??
    "none"
  );
}

function formatDoneGroupDate(dateKey: string) {
  if (dateKey === "none") return "ไม่ระบุวันที่";
  const [year, month, day] = dateKey.split("-").map(Number);
  return formatDate(new Date(year, month - 1, day));
}

function groupDoneTasksByDate(tasks: Task[]) {
  const groups = new Map<string, Task[]>();
  for (const task of tasks) {
    const key = doneTaskDateKey(task);
    const list = groups.get(key) ?? [];
    list.push(task);
    groups.set(key, list);
  }

  return [...groups.entries()].sort(([a], [b]) => {
    if (a === "none") return 1;
    if (b === "none") return -1;
    return b.localeCompare(a);
  });
}

function DraggableTaskCard({
  task,
  onEditTask,
}: {
  task: Task;
  onEditTask: (task: Task) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? "opacity-40" : ""}
      {...listeners}
      {...attributes}
    >
      <TaskCard task={task} draggable onClick={() => onEditTask(task)} />
    </div>
  );
}

function DraggableDoneRow({
  task,
  onEditTask,
}: {
  task: Task;
  onEditTask: (task: Task) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? "opacity-40" : ""}
      {...listeners}
      {...attributes}
    >
      <button
        type="button"
        onClick={() => onEditTask(task)}
        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-left transition hover:border-slate-300 hover:bg-white"
      >
        <p className="truncate text-xs font-medium text-slate-800">{task.name}</p>
        {task.description?.trim() ? (
          <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-slate-500">
            {task.description.trim()}
          </p>
        ) : null}
      </button>
    </div>
  );
}

function KanbanColumn({
  status,
  tasks,
  onStartCreate,
  onEditTask,
  doneView,
  onDoneViewChange,
}: {
  status: Status;
  tasks: Task[];
  onStartCreate: (statusId: string) => void;
  onEditTask: (task: Task) => void;
  doneView: DoneViewMode;
  onDoneViewChange: (mode: DoneViewMode) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id });
  const showDateSummary = isDoneStatus(status) && doneView === "dates";
  const dateGroups = useMemo(
    () => (showDateSummary ? groupDoneTasksByDate(tasks) : []),
    [showDateSummary, tasks],
  );
  const tint = status.color || "#94A3B8";

  return (
    <div
      ref={setNodeRef}
      className="flex h-full w-[280px] shrink-0 flex-col rounded-2xl border p-3 transition"
      style={{
        backgroundColor: withAlpha(tint, isOver ? "28" : "16"),
        borderColor: withAlpha(tint, isOver ? "80" : "40"),
      }}
    >
      <div className="mb-3 flex shrink-0 items-center justify-between gap-1">
        <div className="flex min-w-0 items-center gap-2">
          <Badge color={status.color}>{status.name}</Badge>
          <span className="text-xs text-slate-400">{tasks.length}</span>
        </div>
        <div className="flex shrink-0 items-center">
          {isDoneStatus(status) ? (
            <div className="mr-0.5 inline-flex rounded-lg bg-slate-100 p-0.5">
              <button
                type="button"
                title="สรุปเป็นวันที่"
                aria-label="สรุปเป็นวันที่"
                aria-pressed={doneView === "dates"}
                onClick={() => onDoneViewChange("dates")}
                className={cn(
                  "rounded-md p-1 transition",
                  doneView === "dates"
                    ? "bg-white text-primary shadow-sm"
                    : "text-slate-400 hover:text-slate-600",
                )}
              >
                <CalendarDays className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="การ์ด task"
                aria-label="การ์ด task"
                aria-pressed={doneView === "cards"}
                onClick={() => onDoneViewChange("cards")}
                className={cn(
                  "rounded-md p-1 transition",
                  doneView === "cards"
                    ? "bg-white text-primary shadow-sm"
                    : "text-slate-400 hover:text-slate-600",
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onStartCreate(status.id)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain">
        {showDateSummary
          ? dateGroups.map(([dateKey, groupTasks]) => (
              <div key={dateKey} className="space-y-1.5">
                <div
                  className="sticky top-0 z-[1] -mx-1 px-1 py-1 backdrop-blur-sm"
                  style={{ backgroundColor: withAlpha(tint, "2E") }}
                >
                  <p className="text-[11px] font-semibold text-slate-500">
                    {formatDoneGroupDate(dateKey)}
                    <span className="ml-1 font-medium text-slate-400">
                      {groupTasks.length}
                    </span>
                  </p>
                </div>
                {groupTasks.map((task) => (
                  <DraggableDoneRow
                    key={task.id}
                    task={task}
                    onEditTask={onEditTask}
                  />
                ))}
              </div>
            ))
          : tasks.map((task) => (
              <DraggableTaskCard
                key={task.id}
                task={task}
                onEditTask={onEditTask}
              />
            ))}
      </div>
    </div>
  );
}

export function TaskKanbanView({
  tasks,
  statuses,
  onStatusChange,
  onEditTask,
  onStartCreate,
}: TaskKanbanViewProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [doneView, setDoneView] = useState<DoneViewMode>("dates");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  useEffect(() => {
    try {
      const stored = localStorage.getItem(DONE_VIEW_KEY);
      if (stored === "cards" || stored === "dates") {
        setDoneView(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  function handleDoneViewChange(mode: DoneViewMode) {
    setDoneView(mode);
    try {
      localStorage.setItem(DONE_VIEW_KEY, mode);
    } catch {
      // ignore
    }
  }

  const tasksByStatus = useMemo(() => {
    const grouped = new Map<string, Task[]>();
    statuses.forEach((status) => grouped.set(status.id, []));
    tasks.forEach((task) => {
      const list = grouped.get(task.statusId) ?? [];
      list.push(task);
      grouped.set(task.statusId, list);
    });
    return grouped;
  }, [tasks, statuses]);

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((item) => item.id === event.active.id);
    setActiveTask(task ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const taskId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : null;
    if (!overId) return;

    const targetStatus = statuses.find((status) => status.id === overId);
    if (!targetStatus) return;

    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.statusId === targetStatus.id) return;

    onStatusChange(taskId, targetStatus.id);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="mb-3 shrink-0 text-sm text-slate-500">
        ลาก task card ข้ามคอลัมน์เพื่อเปลี่ยนสถานะ
      </p>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="min-h-0 flex-1 overflow-x-auto">
          <div className="flex h-full min-h-0 gap-4 pb-1">
            {statuses.map((status) => (
              <KanbanColumn
                key={status.id}
                status={status}
                tasks={tasksByStatus.get(status.id) ?? []}
                onStartCreate={onStartCreate ?? (() => {})}
                onEditTask={onEditTask}
                doneView={doneView}
                onDoneViewChange={handleDoneViewChange}
              />
            ))}
          </div>
        </div>
        <DragOverlay>
          {activeTask ? (
            <div className="w-[260px] rotate-2 opacity-90">
              {doneView === "dates" &&
              activeTask.status.name.trim().toLowerCase() === "done" ? (
                <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium shadow-sm">
                  {activeTask.name}
                </div>
              ) : (
                <TaskCard task={activeTask} draggable />
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
