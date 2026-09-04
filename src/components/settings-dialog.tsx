"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ColorTray, normalizeHex } from "@/components/ui/color-tray";
import { Input, Label } from "@/components/ui/input";
import { LoadingButtonContent } from "@/components/ui/loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Priority, Status, TaskTypeOption, TeamMember } from "@/lib/types";
import { cn } from "@/lib/utils";
import { GripVertical, Trash2 } from "lucide-react";

const COLOR_OPTIONS = [
  "#EF4444",
  "#F97316",
  "#22C55E",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#6BB82A",
  "#6B7280",
] as const;

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statuses: Status[];
  teamMembers: TeamMember[];
  priorities: Priority[];
  taskTypes: TaskTypeOption[];
  onChanged: () => void;
}

function SortableStatusRow({
  status,
  deleting,
  onDelete,
}: {
  status: Status;
  deleting: boolean;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: status.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2 py-2",
        isDragging && "z-10 border-primary/40 shadow-md",
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          className="cursor-grab touch-none rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing"
          aria-label={`ลากเพื่อเรียง ${status.name}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span
          className="h-4 w-4 shrink-0 rounded-full"
          style={{ backgroundColor: status.color }}
        />
        <span className="truncate text-sm font-medium text-slate-800">
          {status.name}
        </span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={deleting}
        onClick={onDelete}
      >
        <LoadingButtonContent loading={deleting} loadingText="">
          <Trash2 className="h-4 w-4 text-red-500" />
        </LoadingButtonContent>
      </Button>
    </div>
  );
}

export function SettingsDialog({
  open,
  onOpenChange,
  statuses,
  teamMembers,
  priorities,
  taskTypes,
  onChanged,
}: SettingsDialogProps) {
  const [orderedStatuses, setOrderedStatuses] = useState(statuses);
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusColor, setNewStatusColor] = useState<string>(COLOR_OPTIONS[3]);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberColor, setNewMemberColor] = useState<string>(COLOR_OPTIONS[2]);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeColor, setNewTypeColor] = useState<string>(COLOR_OPTIONS[3]);
  const [addingStatus, setAddingStatus] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [addingType, setAddingType] = useState(false);
  const [deletingStatusId, setDeletingStatusId] = useState<string | null>(null);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [deletingTypeId, setDeletingTypeId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  useEffect(() => {
    setOrderedStatuses(statuses);
  }, [statuses]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  async function addStatus() {
    if (!newStatusName.trim()) return;
    const color = normalizeHex(newStatusColor);
    if (!color) return;
    setAddingStatus(true);
    await fetch("/api/statuses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newStatusName.trim(), color }),
    });
    setNewStatusName("");
    setAddingStatus(false);
    onChanged();
  }

  async function deleteStatus(status: Status) {
    if (orderedStatuses.length <= 1) return;

    const fallback = orderedStatuses.find((item) => item.id !== status.id);
    if (!fallback) return;

    setDeletingStatusId(status.id);
    const response = await fetch(`/api/statuses/${status.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moveToStatusId: fallback.id }),
    });
    setDeletingStatusId(null);

    if (response.ok) onChanged();
  }

  async function persistStatusOrder(previous: Status[], next: Status[]) {
    const previousOrder = new Map(previous.map((status) => [status.id, status.sortOrder]));
    setReordering(true);
    await Promise.all(
      next.map((status, index) =>
        previousOrder.get(status.id) === index
          ? Promise.resolve()
          : fetch(`/api/statuses/${status.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sortOrder: index }),
            }),
      ),
    );
    setReordering(false);
    onChanged();
  }

  async function handleStatusDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedStatuses.findIndex((item) => item.id === active.id);
    const newIndex = orderedStatuses.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const previous = orderedStatuses;
    const next = arrayMove(previous, oldIndex, newIndex).map((status, index) => ({
      ...status,
      sortOrder: index,
    }));
    setOrderedStatuses(next);
    await persistStatusOrder(previous, next);
  }

  async function addMember() {
    if (!newMemberName.trim()) return;
    const color = normalizeHex(newMemberColor);
    if (!color) return;
    setAddingMember(true);
    await fetch("/api/team-members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nickname: newMemberName.trim(),
        color,
      }),
    });
    setNewMemberName("");
    setAddingMember(false);
    onChanged();
  }

  async function deleteMember(member: TeamMember) {
    setDeletingMemberId(member.id);
    await fetch(`/api/team-members/${member.id}`, { method: "DELETE" });
    setDeletingMemberId(null);
    onChanged();
  }

  async function addType() {
    if (!newTypeName.trim()) return;
    const color = normalizeHex(newTypeColor);
    if (!color) return;
    setAddingType(true);
    await fetch("/api/task-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newTypeName.trim(),
        color,
      }),
    });
    setNewTypeName("");
    setAddingType(false);
    onChanged();
  }

  async function deleteType(type: TaskTypeOption) {
    if (taskTypes.length <= 1) return;
    setDeletingTypeId(type.id);
    const response = await fetch(`/api/task-types/${type.id}`, {
      method: "DELETE",
    });
    setDeletingTypeId(null);
    if (response.ok) onChanged();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            จัดการสถานะ ทีม Task Type และ priority ของโปรเจกต์
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="status">
          <TabsList>
            <TabsTrigger value="status">สถานะ</TabsTrigger>
            <TabsTrigger value="team">ทีม</TabsTrigger>
            <TabsTrigger value="type">Type</TabsTrigger>
            <TabsTrigger value="priority">Priority</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="space-y-4">
            <p className="text-xs text-slate-500">
              ลากไอคอน{" "}
              <GripVertical className="inline h-3.5 w-3.5 align-text-bottom" />{" "}
              เพื่อเรียงลำดับสถานะ (ใช้ใน Kanban และฟอร์ม)
              {reordering ? " — กำลังบันทึก..." : null}
            </p>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleStatusDragEnd}
            >
              <SortableContext
                items={orderedStatuses.map((status) => status.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {orderedStatuses.map((status) => (
                    <SortableStatusRow
                      key={status.id}
                      status={status}
                      deleting={deletingStatusId === status.id}
                      onDelete={() => deleteStatus(status)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <div className="rounded-lg border border-dashed border-slate-300 p-4">
              <Label>เพิ่มสถานะใหม่</Label>
              <div className="mt-2 space-y-3">
                <Input
                  className="w-full"
                  placeholder="ชื่อสถานะ"
                  value={newStatusName}
                  onChange={(event) => setNewStatusName(event.target.value)}
                />
                <ColorTray
                  label="สีสถานะ"
                  value={newStatusColor}
                  onChange={(color) => setNewStatusColor(color)}
                  options={COLOR_OPTIONS}
                />
                <Button
                  type="button"
                  onClick={addStatus}
                  disabled={
                    addingStatus ||
                    !newStatusName.trim() ||
                    !normalizeHex(newStatusColor)
                  }
                >
                  <LoadingButtonContent loading={addingStatus} loadingText="กำลังเพิ่ม...">
                    เพิ่ม
                  </LoadingButtonContent>
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="team" className="space-y-4">
            <div className="space-y-2">
              {teamMembers.length === 0 && (
                <p className="rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-500">
                  ยังไม่มีสมาชิกทีม — เพิ่มชื่อเล่นเพื่อ assign task ได้
                </p>
              )}
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: member.color }}
                    />
                    <span className="text-sm font-medium text-slate-800">
                      {member.nickname}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={deletingMemberId === member.id}
                    onClick={() => deleteMember(member)}
                  >
                    <LoadingButtonContent
                      loading={deletingMemberId === member.id}
                      loadingText=""
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </LoadingButtonContent>
                  </Button>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-dashed border-slate-300 p-4">
              <Label>เพิ่มสมาชิกทีม</Label>
              <div className="mt-2 space-y-3">
                <Input
                  className="w-full"
                  placeholder="ชื่อเล่น"
                  value={newMemberName}
                  onChange={(event) => setNewMemberName(event.target.value)}
                />
                <ColorTray
                  label="สีสมาชิก"
                  value={newMemberColor}
                  onChange={(color) => setNewMemberColor(color)}
                  options={COLOR_OPTIONS}
                />
                <Button
                  type="button"
                  onClick={addMember}
                  disabled={
                    addingMember ||
                    !newMemberName.trim() ||
                    !normalizeHex(newMemberColor)
                  }
                >
                  <LoadingButtonContent loading={addingMember} loadingText="กำลังเพิ่ม...">
                    เพิ่ม
                  </LoadingButtonContent>
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="type" className="space-y-4">
            <div className="space-y-2">
              {taskTypes.length === 0 && (
                <p className="rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-500">
                  ยังไม่มี Task Type — เพิ่มเพื่อเลือกในฟอร์ม task ได้
                </p>
              )}
              {taskTypes.map((type) => (
                <div
                  key={type.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: type.color }}
                    />
                    <span className="text-sm font-medium text-slate-800">
                      {type.name}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={
                      deletingTypeId === type.id || taskTypes.length <= 1
                    }
                    onClick={() => deleteType(type)}
                  >
                    <LoadingButtonContent
                      loading={deletingTypeId === type.id}
                      loadingText=""
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </LoadingButtonContent>
                  </Button>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-dashed border-slate-300 p-4">
              <Label>เพิ่ม Task Type</Label>
              <div className="mt-2 space-y-3">
                <Input
                  className="w-full"
                  placeholder="เช่น QA, DevOps, Design"
                  value={newTypeName}
                  onChange={(event) => setNewTypeName(event.target.value)}
                />
                <ColorTray
                  label="สี Type"
                  value={newTypeColor}
                  onChange={(color) => setNewTypeColor(color)}
                  options={COLOR_OPTIONS}
                />
                <Button
                  type="button"
                  onClick={addType}
                  disabled={
                    addingType ||
                    !newTypeName.trim() ||
                    !normalizeHex(newTypeColor)
                  }
                >
                  <LoadingButtonContent loading={addingType} loadingText="กำลังเพิ่ม...">
                    เพิ่ม
                  </LoadingButtonContent>
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="priority" className="space-y-2">
            {priorities.map((priority) => (
              <div
                key={priority.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: priority.color }}
                  />
                  <span className="text-sm font-medium text-slate-800">
                    {priority.label}
                  </span>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
