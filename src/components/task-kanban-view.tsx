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
import { useMemo, useState } from "react";
import { TaskCard } from "@/components/task-card";
import { TaskInlineCreate } from "@/components/task-inline-create";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Priority, Status, Task, TeamMember } from "@/lib/types";
import { Plus } from "lucide-react";

interface TaskKanbanViewProps {
  tasks: Task[];
  statuses: Status[];
  priorities: Priority[];
  teamMembers: TeamMember[];
  projectId: string;
  onStatusChange: (taskId: string, statusId: string) => void;
  onEditTask: (task: Task) => void;
  onSaved: () => void;
  creatingInStatusId?: string | null;
  onStartCreate?: (statusId: string) => void;
  onCancelCreate?: () => void;
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

function KanbanColumn({
  status,
  tasks,
  priorities,
  teamMembers,
  projectId,
  isCreating,
  onStartCreate,
  onCancelCreate,
  onSaved,
  onEditTask,
}: {
  status: Status;
  tasks: Task[];
  priorities: Priority[];
  teamMembers: TeamMember[];
  projectId: string;
  isCreating: boolean;
  onStartCreate: (statusId: string) => void;
  onCancelCreate: () => void;
  onSaved: () => void;
  onEditTask: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[560px] w-[280px] shrink-0 flex-col rounded-2xl border bg-white p-3 transition ${
        isOver ? "border-primary bg-primary/5" : "border-slate-200"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge color={status.color}>{status.name}</Badge>
          <span className="text-xs text-slate-400">{tasks.length}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onStartCreate(status.id)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-1 flex-col gap-3">
        {isCreating ? (
          <TaskInlineCreate
            variant="kanban"
            statuses={[status]}
            priorities={priorities}
            teamMembers={teamMembers}
            projectId={projectId}
            defaultStatusId={status.id}
            onSaved={() => {
              onSaved();
              onCancelCreate();
            }}
            onCancel={onCancelCreate}
          />
        ) : null}
        {tasks.map((task) => (
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
  priorities,
  teamMembers,
  projectId,
  onStatusChange,
  onEditTask,
  onSaved,
  creatingInStatusId = null,
  onStartCreate,
  onCancelCreate,
}: TaskKanbanViewProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

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
    <div>
      <p className="mb-4 text-sm text-slate-500">
        ลาก task card ข้ามคอลัมน์เพื่อเปลี่ยนสถานะ
      </p>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {statuses.map((status) => (
            <KanbanColumn
              key={status.id}
              status={status}
              tasks={tasksByStatus.get(status.id) ?? []}
              priorities={priorities}
              teamMembers={teamMembers}
              projectId={projectId}
              isCreating={creatingInStatusId === status.id}
              onStartCreate={onStartCreate ?? (() => {})}
              onCancelCreate={onCancelCreate ?? (() => {})}
              onSaved={onSaved}
              onEditTask={onEditTask}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? (
            <div className="w-[260px] rotate-2 opacity-90">
              <TaskCard task={activeTask} draggable />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
