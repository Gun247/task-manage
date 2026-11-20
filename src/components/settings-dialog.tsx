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
import { ThemeManager } from "@/components/theme-manager";
import { ProjectThemeField } from "@/components/theme-picker";
import { DEFAULT_THEME_ID, themeAccentColor } from "@/lib/themes";
import type {
  Priority,
  Project,
  Status,
  TaskTypeOption,
  TeamMember,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  getReservedStatusNameError,
  getStatusDescription,
  HOLD_STATUS_NAME,
  isDefaultStatusName,
  MODIFY_STATUS_NAME,
} from "@/lib/default-statuses";
import {
  MEMBER_ROLES,
  ROLE_LABELS,
  parseMemberRole,
  type MemberRole,
} from "@/lib/roles";
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
  project?: Project | null;
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
  editing,
  busy,
  onDelete,
  onEdit,
}: {
  status: Status;
  deleting: boolean;
  editing: boolean;
  busy: boolean;
  onDelete: () => void;
  onEdit: () => void;
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
        "flex items-center justify-between gap-2 rounded-xl border px-2.5 py-2.5",
        editing
          ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
          : "border-slate-200 bg-white",
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
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-micro font-medium text-slate-500">
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
        <span className="shrink-0 px-2 text-micro text-slate-400">
          แก้ไขไม่ได้
        </span>
      ) : (
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onEdit}
            disabled={deleting || busy}
            aria-label={`แก้ไข ${status.name}`}
          >
            <Pencil className="h-4 w-4 text-slate-500" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={deleting || busy}
            onClick={onDelete}
            aria-label={`ลบ ${status.name}`}
          >
            <LoadingButtonContent loading={deleting} loadingText="">
              <Trash2 className="h-4 w-4 text-red-500" />
            </LoadingButtonContent>
          </Button>
        </div>
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
  project,
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
    role: "member" as MemberRole,
    color: COLOR_OPTIONS[2] as string,
  });
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeColor, setNewTypeColor] = useState<string>(COLOR_OPTIONS[3]);
  const [addingStatus, setAddingStatus] = useState(false);
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);
  const [addingMember, setAddingMember] = useState(false);
  const [addingType, setAddingType] = useState(false);
  const [deletingStatusId, setDeletingStatusId] = useState<string | null>(null);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const [deletingTypeId, setDeletingTypeId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [wipInProgress, setWipInProgress] = useState("");
  const [wipModify, setWipModify] = useState("");
  const [wipHold, setWipHold] = useState("");
  const [savingWip, setSavingWip] = useState(false);
  const [projectTheme, setProjectTheme] = useState(DEFAULT_THEME_ID);
  const [savingTheme, setSavingTheme] = useState(false);

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
        role: "member",
        color: COLOR_OPTIONS[2],
      });
      setEditingStatusId(null);
      setNewStatusName("");
      setNewStatusColor(COLOR_OPTIONS[3]);
      setActiveTab("status");
      return;
    }

    const limits = project?.wipLimits ?? {};
    setWipInProgress(
      limits["In Progress"] ? String(limits["In Progress"]) : "",
    );
    setWipModify(
      limits[MODIFY_STATUS_NAME] ? String(limits[MODIFY_STATUS_NAME]) : "",
    );
    setWipHold(
      limits[HOLD_STATUS_NAME] ? String(limits[HOLD_STATUS_NAME]) : "",
    );
    setProjectTheme(project?.theme || DEFAULT_THEME_ID);
  }, [open, project]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const isEditingMember = Boolean(editingMemberId);
  const isEditingStatus = Boolean(editingStatusId);
  const statusBusy = addingStatus || savingStatusId !== null;
  const editingStatus = orderedStatuses.find(
    (status) => status.id === editingStatusId,
  );
  const statusNameError = newStatusName.trim()
    ? getReservedStatusNameError(newStatusName, editingStatus?.name)
    : null;

  function resetStatusForm() {
    setEditingStatusId(null);
    setNewStatusName("");
    setNewStatusColor(COLOR_OPTIONS[3]);
  }

  function startEditStatus(status: Status) {
    if (isDefaultStatusName(status.name)) return;
    setEditingStatusId(status.id);
    setNewStatusName(status.name);
    setNewStatusColor(status.color);
  }

  async function submitStatus() {
    const name = newStatusName.trim();
    const color = normalizeHex(newStatusColor);
    if (!name || !color || statusNameError) return;

    if (editingStatusId) {
      const existing = orderedStatuses.find((item) => item.id === editingStatusId);
      if (!existing || isDefaultStatusName(existing.name)) return;

      setSavingStatusId(editingStatusId);
      const response = await fetch(`/api/statuses/${editingStatusId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color }),
      });
      setSavingStatusId(null);
      if (response.ok) {
        resetStatusForm();
        onChanged();
      }
      return;
    }

    setAddingStatus(true);
    await fetch("/api/statuses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color }),
    });
    setAddingStatus(false);
    resetStatusForm();
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

    if (response.ok) {
      if (editingStatusId === status.id) {
        resetStatusForm();
      }
      onChanged();
    }
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
      role: "member",
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
      role: parseMemberRole(member.role),
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
      role: memberForm.role,
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

  function buildWipLimits() {
    const limits: Record<string, number> = {};
    const inProgress = Number(wipInProgress);
    const modify = Number(wipModify);
    const hold = Number(wipHold);
    if (Number.isFinite(inProgress) && inProgress > 0) {
      limits["In Progress"] = Math.floor(inProgress);
    }
    if (Number.isFinite(modify) && modify > 0) {
      limits[MODIFY_STATUS_NAME] = Math.floor(modify);
    }
    if (Number.isFinite(hold) && hold > 0) {
      limits[HOLD_STATUS_NAME] = Math.floor(hold);
    }
    return limits;
  }

  async function saveWipLimits() {
    if (!project || savingWip) return;
    setSavingWip(true);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wipLimits: buildWipLimits() }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        window.alert(data?.error ?? "บันทึก WIP ไม่สำเร็จ");
        return;
      }
      onChanged();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("fwf-projects-changed"));
      }
    } finally {
      setSavingWip(false);
    }
  }

  async function saveProjectTheme(themeId: string) {
    if (!project || savingTheme) return;
    setProjectTheme(themeId);
    setSavingTheme(true);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: themeId,
          color: themeAccentColor(themeId),
        }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        window.alert(data?.error ?? "บันทึกธีมโปรเจกต์ไม่สำเร็จ");
        setProjectTheme(project.theme || DEFAULT_THEME_ID);
        return;
      }
      onChanged();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("fwf-projects-changed"));
      }
    } finally {
      setSavingTheme(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(92dvh,720px)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="mb-0 shrink-0 border-b border-slate-100 px-4 py-4 pr-12 sm:px-6">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            {project
              ? `ตั้งค่าโปรเจกต์ ${project.name} — ธีมและ WIP ตามโปรเจกต์นี้`
              : "จัดการสถานะ ทีม Task Type priority ธีมสี และ WIP"}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value);
            if (value !== "team") resetMemberForm();
            if (value !== "status") resetStatusForm();
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="shrink-0 overflow-x-auto px-4 pt-4 sm:px-6">
            <TabsList className="inline-flex h-auto min-w-full w-max gap-1 sm:grid sm:w-full sm:grid-cols-6">
              <TabsTrigger value="status" className="px-2.5 text-xs sm:px-2 sm:text-sm">
                สถานะ
              </TabsTrigger>
              <TabsTrigger value="team" className="px-2.5 text-xs sm:px-2 sm:text-sm">
                ทีม
              </TabsTrigger>
              <TabsTrigger value="type" className="px-2.5 text-xs sm:px-2 sm:text-sm">
                Type
              </TabsTrigger>
              <TabsTrigger value="priority" className="px-2.5 text-xs sm:px-2 sm:text-sm">
                Priority
              </TabsTrigger>
              <TabsTrigger value="themes" className="px-2.5 text-xs sm:px-2 sm:text-sm">
                ธีมสี
              </TabsTrigger>
              <TabsTrigger value="wip" className="px-2.5 text-xs sm:px-2 sm:text-sm">
                WIP
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="status"
            className="mt-0 min-h-0 flex-1 flex-col data-[state=active]:flex"
          >
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-6">
              <p className="text-xs text-slate-500">
                สถานะเริ่มต้นแก้และลบไม่ได้ — สถานะที่เพิ่มเองแก้ชื่อกับสีได้
                ลากไอคอน{" "}
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
                        editing={editingStatusId === status.id}
                        busy={statusBusy}
                        onDelete={() => deleteStatus(status)}
                        onEdit={() => startEditStatus(status)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
            <div className="shrink-0 border-t border-slate-100 bg-slate-50/80 px-4 py-4 sm:px-6">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-800">
                  {isEditingStatus ? "แก้ไขสถานะ" : "เพิ่มสถานะใหม่"}
                </p>
                {isEditingStatus ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetStatusForm}
                    disabled={statusBusy}
                  >
                    <X className="h-4 w-4" />
                    ยกเลิก
                  </Button>
                ) : null}
              </div>
              <div className="space-y-3">
                <Input
                  className="w-full bg-white"
                  placeholder="ชื่อสถานะ"
                  value={newStatusName}
                  onChange={(event) => setNewStatusName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void submitStatus();
                    }
                    if (event.key === "Escape" && isEditingStatus) {
                      resetStatusForm();
                    }
                  }}
                />
                {statusNameError ? (
                  <p className="text-xs text-red-600">{statusNameError}</p>
                ) : null}
                <ColorTray
                  label="สีสถานะ"
                  value={newStatusColor}
                  onChange={(color) => setNewStatusColor(color)}
                  options={COLOR_OPTIONS}
                />
                <Button
                  type="button"
                  onClick={submitStatus}
                  disabled={
                    statusBusy ||
                    Boolean(statusNameError) ||
                    !newStatusName.trim() ||
                    !normalizeHex(newStatusColor)
                  }
                >
                  <LoadingButtonContent
                    loading={statusBusy}
                    loadingText={
                      isEditingStatus ? "กำลังบันทึก..." : "กำลังเพิ่ม..."
                    }
                  >
                    {isEditingStatus ? (
                      <>
                        <Check className="h-4 w-4" />
                        บันทึก
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        เพิ่ม
                      </>
                    )}
                  </LoadingButtonContent>
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="team"
            className="mt-0 min-h-0 flex-1 flex-col data-[state=active]:flex"
          >
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4 sm:px-6">
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
                  const secondary = [
                    ROLE_LABELS[parseMemberRole(member.role)],
                    member.name,
                    member.employeeId,
                    member.email,
                  ]
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

            <div className="shrink-0 border-t border-slate-100 bg-slate-50/80 px-4 py-4 sm:px-6">
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
                <Field id="member-employee" label="เลขพนักงาน">
                  <Input
                    id="member-employee"
                    className="h-9 bg-white"
                    placeholder="ใช้ตอนเข้าสู่ระบบ"
                    value={memberForm.employeeId}
                    onChange={(event) =>
                      setMemberForm((current) => ({
                        ...current,
                        employeeId: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field id="member-role" label="Role (แบบ Jira)">
                  <select
                    id="member-role"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                    value={memberForm.role}
                    onChange={(event) =>
                      setMemberForm((current) => ({
                        ...current,
                        role: parseMemberRole(event.target.value),
                      }))
                    }
                  >
                    {MEMBER_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
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
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4 sm:px-6">
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
            <div className="shrink-0 border-t border-slate-100 bg-slate-50/80 px-4 py-4 sm:px-6">
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
            className="mt-0 min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 data-[state=active]:block"
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

          <TabsContent
            value="themes"
            className="mt-0 min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 data-[state=active]:block"
          >
            {activeTab === "themes" ? (
              <div className="space-y-6">
                {project ? (
                  <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        ธีมของโปรเจกต์ · {project.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        เลือกแล้วจะใช้ทันทีในหน้า tasks / timeline / history
                        ของโปรเจกต์นี้
                      </p>
                    </div>
                    <ProjectThemeField
                      value={projectTheme}
                      onChange={(themeId) => void saveProjectTheme(themeId)}
                    />
                    {savingTheme ? (
                      <p className="text-xs text-slate-500">กำลังบันทึกธีม...</p>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
                    <p className="text-sm font-medium text-slate-700">
                      ยังไม่ได้เลือกโปรเจกต์
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      เปิด Settings จากโปรเจกต์เพื่อเลือกธีมของโปรเจกต์นั้น
                    </p>
                  </div>
                )}
                <div>
                  <p className="mb-3 text-sm font-medium text-slate-800">
                    คลังธีมสี (ใช้ร่วมทั้งระบบ)
                  </p>
                  <ThemeManager key="theme-manager" />
                </div>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent
            value="wip"
            className="mt-0 min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 data-[state=active]:block"
          >
            {!project ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
                <p className="text-sm font-medium text-slate-700">
                  ยังไม่ได้เลือกโปรเจกต์
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  เปิด Settings จากหน้า tasks ของโปรเจกต์เพื่อตั้ง WIP limit
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    WIP limit · {project.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    เว้นว่าง = ไม่จำกัด · ลากการ์ดบน Kanban เกิน limit จะถูกบล็อก
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="settings-wip-ip" className="text-xs text-slate-500">
                      In Progress
                    </Label>
                    <Input
                      id="settings-wip-ip"
                      type="number"
                      min={1}
                      placeholder="ไม่จำกัด"
                      value={wipInProgress}
                      onChange={(event) => setWipInProgress(event.target.value)}
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="settings-wip-modify"
                      className="text-xs text-slate-500"
                    >
                      {MODIFY_STATUS_NAME}
                    </Label>
                    <Input
                      id="settings-wip-modify"
                      type="number"
                      min={1}
                      placeholder="ไม่จำกัด"
                      value={wipModify}
                      onChange={(event) => setWipModify(event.target.value)}
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="settings-wip-hold"
                      className="text-xs text-slate-500"
                    >
                      {HOLD_STATUS_NAME}
                    </Label>
                    <Input
                      id="settings-wip-hold"
                      type="number"
                      min={1}
                      placeholder="ไม่จำกัด"
                      value={wipHold}
                      onChange={(event) => setWipHold(event.target.value)}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => void saveWipLimits()}
                  disabled={savingWip}
                >
                  <LoadingButtonContent
                    loading={savingWip}
                    loadingText="กำลังบันทึก..."
                  >
                    บันทึก WIP
                  </LoadingButtonContent>
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
