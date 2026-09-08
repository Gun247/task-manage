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
import {
  getStatusDescription,
  isDefaultStatusName,
} from "@/lib/default-statuses";
import {
  Check,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

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

function memberInitials(nickname: string) {
  const parts = nickname.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
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
  const description = getStatusDescription(status.name);
  const isDefault = isDefaultStatusName(status.name);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2.5",
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
          className="h-3.5 w-3.5 shrink-0 rounded-full"
          style={{ backgroundColor: status.color }}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-slate-800">
              {status.name}
            </span>
            {isDefault ? (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                default
              </span>
            ) : null}
          </div>
          {description ? (
            <p className="truncate text-xs text-slate-500">{description}</p>
          ) : null}
        </div>
      </div>
      {isDefault ? (
        <span className="shrink-0 px-2 text-[10px] text-slate-400">ลบไม่ได้</span>
      ) : (
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
      )}
    </div>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <Label htmlFor={id} className="mb-1 text-xs text-slate-500">
        {label}
      </Label>
      {children}
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
  const [activeTab, setActiveTab] = useState("status");
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusColor, setNewStatusColor] = useState<string>(COLOR_OPTIONS[3]);
  const [memberForm, setMemberForm] = useState({
    name: "",
    nickname: "",
    email: "",
    employeeId: "",
    color: COLOR_OPTIONS[2] as string,
  });
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeColor, setNewTypeColor] = useState<string>(COLOR_OPTIONS[3]);
  const [addingStatus, setAddingStatus] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [addingType, setAddingType] = useState(false);
  const [deletingStatusId, setDeletingStatusId] = useState<string | null>(null);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const [deletingTypeId, setDeletingTypeId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  useEffect(() => {
    setOrderedStatuses(statuses);
  }, [statuses]);

  useEffect(() => {
    if (!open) {
      setEditingMemberId(null);
      setMemberForm({
        name: "",
        nickname: "",
        email: "",
        employeeId: "",
        color: COLOR_OPTIONS[2],
      });
      setActiveTab("status");
    }
  }, [open]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const isEditingMember = Boolean(editingMemberId);

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
    if (isDefaultStatusName(status.name)) return;
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
    const previousOrder = new Map(
      previous.map((status) => [status.id, status.sortOrder]),
    );
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
    const next = arrayMove(previous, oldIndex, newIndex).map(
      (status, index) => ({
        ...status,
        sortOrder: index,
      }),
    );
    setOrderedStatuses(next);
    await persistStatusOrder(previous, next);
  }

  function resetMemberForm() {
    setEditingMemberId(null);
    setMemberForm({
      name: "",
      nickname: "",
      email: "",
      employeeId: "",
      color: COLOR_OPTIONS[2],
    });
  }

  function startEditMember(member: TeamMember) {
    setEditingMemberId(member.id);
    setMemberForm({
      name: member.name ?? "",
      nickname: member.nickname,
      email: member.email ?? "",
      employeeId: member.employeeId ?? "",
      color: member.color,
    });
  }

  async function submitMember() {
    const nickname = memberForm.nickname.trim();
    const color = normalizeHex(memberForm.color);
    if (!nickname || !color) return;

    const payload = {
      name: memberForm.name.trim(),
      nickname,
      email: memberForm.email.trim(),
      employeeId: memberForm.employeeId.trim(),
      color,
    };

    if (editingMemberId) {
      setSavingMemberId(editingMemberId);
      const response = await fetch(`/api/team-members/${editingMemberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setSavingMemberId(null);
      if (response.ok) {
        resetMemberForm();
        onChanged();
      }
      return;
    }

    setAddingMember(true);
    const response = await fetch("/api/team-members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setAddingMember(false);
    if (response.ok) {
      resetMemberForm();
      onChanged();
    }
  }

  async function deleteMember(member: TeamMember) {
    setDeletingMemberId(member.id);
    await fetch(`/api/team-members/${member.id}`, { method: "DELETE" });
    setDeletingMemberId(null);
    if (editingMemberId === member.id) {
      resetMemberForm();
    }
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

  const memberBusy = addingMember || savingMemberId !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(90vh,720px)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="mb-0 shrink-0 border-b border-slate-100 px-6 py-4 pr-12">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            จัดการสถานะ ทีม Task Type และ priority ของโปรเจกต์
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value);
            if (value !== "team") resetMemberForm();
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="shrink-0 px-6 pt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="status">สถานะ</TabsTrigger>
              <TabsTrigger value="team">ทีม</TabsTrigger>
              <TabsTrigger value="type">Type</TabsTrigger>
              <TabsTrigger value="priority">Priority</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="status"
            className="mt-0 min-h-0 flex-1 flex-col data-[state=active]:flex"
          >
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-4">
              <p className="text-xs text-slate-500">
                สถานะเริ่มต้น 5 รายการจะมีเสมอ และลบไม่ได้ — ลากไอคอน{" "}
                <GripVertical className="inline h-3.5 w-3.5 align-text-bottom" />{" "}
                เพื่อเรียงลำดับ
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
            </div>
            <div className="shrink-0 border-t border-slate-100 bg-slate-50/80 px-6 py-4">
              <p className="mb-2 text-sm font-medium text-slate-800">
                เพิ่มสถานะใหม่
              </p>
              <div className="space-y-3">
                <Input
                  className="w-full bg-white"
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
                  <LoadingButtonContent
                    loading={addingStatus}
                    loadingText="กำลังเพิ่ม..."
                  >
                    <Plus className="h-4 w-4" />
                    เพิ่ม
                  </LoadingButtonContent>
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="team"
            className="mt-0 min-h-0 flex-1 flex-col data-[state=active]:flex"
          >
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-6 py-4">
              {teamMembers.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
                  <UserRound className="mb-2 h-8 w-8 text-slate-300" />
                  <p className="text-sm font-medium text-slate-700">
                    ยังไม่มีสมาชิกทีม
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    กรอกฟอร์มด้านล่างเพื่อเพิ่มและ assign task ได้
                  </p>
                </div>
              ) : (
                teamMembers.map((member) => {
                  const selected = editingMemberId === member.id;
                  const secondary = [member.name, member.employeeId, member.email]
                    .map((value) => value?.trim())
                    .filter(Boolean)
                    .join(" · ");

                  return (
                    <div
                      key={member.id}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition",
                        selected
                          ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                          : "border-slate-200 bg-white hover:border-slate-300",
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                          style={{ backgroundColor: member.color }}
                        >
                          {memberInitials(member.nickname)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800">
                            {member.nickname}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {secondary || "ยังไม่มีรายละเอียดเพิ่มเติม"}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditMember(member)}
                          disabled={
                            deletingMemberId === member.id || memberBusy
                          }
                          aria-label={`แก้ไข ${member.nickname}`}
                        >
                          <Pencil className="h-4 w-4 text-slate-500" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={deletingMemberId === member.id}
                          onClick={() => deleteMember(member)}
                          aria-label={`ลบ ${member.nickname}`}
                        >
                          <LoadingButtonContent
                            loading={deletingMemberId === member.id}
                            loadingText=""
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </LoadingButtonContent>
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="shrink-0 border-t border-slate-100 bg-slate-50/80 px-6 py-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {isEditingMember ? "แก้ไขสมาชิก" : "เพิ่มสมาชิกทีม"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {isEditingMember
                      ? "แก้ข้อมูลแล้วกดบันทึก — รายการด้านบนจะไฮไลต์สมาชิกที่กำลังแก้"
                      : "ชื่อเล่นจำเป็น ใช้แสดงตอน assign task"}
                  </p>
                </div>
                {isEditingMember ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetMemberForm}
                    disabled={memberBusy}
                  >
                    <X className="h-4 w-4" />
                    ยกเลิก
                  </Button>
                ) : null}
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                <Field id="member-name" label="ชื่อ">
                  <Input
                    id="member-name"
                    className="h-9 bg-white"
                    placeholder="ชื่อ-นามสกุล"
                    value={memberForm.name}
                    onChange={(event) =>
                      setMemberForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field id="member-nickname" label="ชื่อเล่น *">
                  <Input
                    id="member-nickname"
                    className="h-9 bg-white"
                    placeholder="ชื่อเล่น"
                    value={memberForm.nickname}
                    onChange={(event) =>
                      setMemberForm((current) => ({
                        ...current,
                        nickname: event.target.value,
                      }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void submitMember();
                      }
                      if (event.key === "Escape" && isEditingMember) {
                        resetMemberForm();
                      }
                    }}
                  />
                </Field>
                <Field id="member-email" label="เมล">
                  <Input
                    id="member-email"
                    type="email"
                    className="h-9 bg-white"
                    placeholder="name@example.com"
                    value={memberForm.email}
                    onChange={(event) =>
                      setMemberForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field id="member-employee" label="รหัสพนักงาน">
                  <Input
                    id="member-employee"
                    className="h-9 bg-white"
                    placeholder="รหัสพนักงาน"
                    value={memberForm.employeeId}
                    onChange={(event) =>
                      setMemberForm((current) => ({
                        ...current,
                        employeeId: event.target.value,
                      }))
                    }
                  />
                </Field>
              </div>

              <div className="mt-3">
                <ColorTray
                  label="สีสมาชิก"
                  value={memberForm.color}
                  onChange={(color) =>
                    setMemberForm((current) => ({ ...current, color }))
                  }
                  options={COLOR_OPTIONS}
                />
              </div>

              <div className="mt-3 flex justify-end">
                <Button
                  type="button"
                  onClick={submitMember}
                  disabled={
                    memberBusy ||
                    !memberForm.nickname.trim() ||
                    !normalizeHex(memberForm.color)
                  }
                >
                  <LoadingButtonContent
                    loading={memberBusy}
                    loadingText={
                      isEditingMember ? "กำลังบันทึก..." : "กำลังเพิ่ม..."
                    }
                  >
                    {isEditingMember ? (
                      <>
                        <Check className="h-4 w-4" />
                        บันทึก
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        เพิ่มสมาชิก
                      </>
                    )}
                  </LoadingButtonContent>
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="type"
            className="mt-0 min-h-0 flex-1 flex-col data-[state=active]:flex"
          >
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-6 py-4">
              {taskTypes.length === 0 ? (
                <p className="rounded-xl bg-slate-50 px-3 py-8 text-center text-sm text-slate-500">
                  ยังไม่มี Task Type — เพิ่มเพื่อเลือกในฟอร์ม task ได้
                </p>
              ) : (
                taskTypes.map((type) => (
                  <div
                    key={type.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3.5 w-3.5 rounded-full"
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
                ))
              )}
            </div>
            <div className="shrink-0 border-t border-slate-100 bg-slate-50/80 px-6 py-4">
              <p className="mb-2 text-sm font-medium text-slate-800">
                เพิ่ม Task Type
              </p>
              <div className="space-y-3">
                <Input
                  className="w-full bg-white"
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
                  <LoadingButtonContent
                    loading={addingType}
                    loadingText="กำลังเพิ่ม..."
                  >
                    <Plus className="h-4 w-4" />
                    เพิ่ม
                  </LoadingButtonContent>
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="priority"
            className="mt-0 min-h-0 flex-1 overflow-y-auto px-6 py-4 data-[state=active]:block"
          >
            <p className="mb-3 text-xs text-slate-500">
              Priority ใช้ค่าเริ่มต้นของระบบ (P0 / P1 / P2)
            </p>
            <div className="space-y-2">
              {priorities.map((priority) => (
                <div
                  key={priority.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                >
                  <span
                    className="h-3.5 w-3.5 rounded-full"
                    style={{ backgroundColor: priority.color }}
                  />
                  <span className="text-sm font-medium text-slate-800">
                    {priority.label}
                  </span>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
