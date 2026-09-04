"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Input, Select, Textarea } from "@/components/ui/input";
import { LoadingButtonContent } from "@/components/ui/loading";
import type { Priority, Status, TaskType, TeamMember } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";

interface TaskInlineCreateProps {
  statuses: Status[];
  priorities: Priority[];
  teamMembers: TeamMember[];
  projectId: string;
  defaultStatusId?: string;
  onSaved: () => void;
  variant?: "list" | "kanban";
  focusTrigger?: number;
  onCancel?: () => void;
}

const emptyForm = {
  name: "",
  description: "",
  remarks: "",
  taskType: "Back End" as TaskType,
  startDate: "",
  endDate: "",
  priorityId: "",
  statusId: "",
  assigneeId: "",
};

export function TaskInlineCreate({
  statuses,
  priorities,
  teamMembers,
  projectId,
  defaultStatusId,
  onSaved,
  variant = "list",
  focusTrigger = 0,
  onCancel,
}: TaskInlineCreateProps) {
  const [expanded, setExpanded] = useState(variant === "kanban");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm({
      ...emptyForm,
      priorityId: priorities[0]?.id ?? "",
      statusId: defaultStatusId ?? statuses[0]?.id ?? "",
    });
    setExpanded(variant === "kanban");
  }, [defaultStatusId, priorities, statuses, variant]);

  useEffect(() => {
    if (focusTrigger > 0) {
      nameInputRef.current?.focus();
      setExpanded(true);
    }
  }, [focusTrigger]);

  function resetForm() {
    setForm({
      ...emptyForm,
      priorityId: priorities[0]?.id ?? "",
      statusId: defaultStatusId ?? statuses[0]?.id ?? "",
    });
    setExpanded(variant === "kanban");
  }

  function handleCancel() {
    resetForm();
    onCancel?.();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) return;

    setSaving(true);

    const payload = {
      ...form,
      projectId,
      name: form.name.trim(),
      assigneeId: form.assigneeId || null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
    };

    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (response.ok) {
      resetForm();
      onSaved();
      nameInputRef.current?.focus();
    }
  }

  const fieldSelectClass = "h-9 py-0 text-sm leading-9";
  const fieldInputClass = "h-9 py-0 text-sm leading-9";

  if (variant === "kanban") {
    return (
      <form
        onSubmit={handleSubmit}
        className="mb-3 rounded-xl border border-[#1E3A5F]/20 bg-blue-50/50 p-3"
      >
        <Input
          ref={nameInputRef}
          required
          placeholder="ชื่อ task..."
          value={form.name}
          onChange={(event) =>
            setForm((current) => ({ ...current, name: event.target.value }))
          }
          className={cn(fieldInputClass, "mb-2 bg-white")}
        />

        <div className="mb-2 grid grid-cols-2 gap-2">
          <Select
            value={form.priorityId}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                priorityId: event.target.value,
              }))
            }
            className={cn(fieldSelectClass, "bg-white")}
          >
            {priorities.map((priority) => (
              <option key={priority.id} value={priority.id}>
                {priority.label}
              </option>
            ))}
          </Select>
          <Select
            value={form.assigneeId}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                assigneeId: event.target.value,
              }))
            }
            className={cn(fieldSelectClass, "bg-white")}
          >
            <option value="">ยังไม่ระบุ</option>
            {teamMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.nickname}
              </option>
            ))}
          </Select>
        </div>

        <div className="mb-2 grid grid-cols-2 gap-2">
          <Select
            value={form.taskType}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                taskType: event.target.value as TaskType,
              }))
            }
            className={cn(fieldSelectClass, "bg-white")}
          >
            <option value="Back End">Back End</option>
            <option value="Front End">Front End</option>
          </Select>
          <DateInput
            compact
            label="สิ้นสุด"
            value={form.endDate}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                endDate: event.target.value,
              }))
            }
          />
        </div>

        {expanded ? (
          <div className="mb-2 space-y-2">
            <Textarea
              placeholder="Description"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              className="min-h-[60px] bg-white text-xs"
            />
            <Textarea
              placeholder="Remarks"
              value={form.remarks}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  remarks: event.target.value,
                }))
              }
              className="min-h-[50px] bg-white text-xs"
            />
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3" />
                ซ่อนรายละเอียด
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                เพิ่มรายละเอียด
              </>
            )}
          </button>
          <div className="flex gap-1">
            {onCancel ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancel}
              >
                ยกเลิก
              </Button>
            ) : null}
            <Button type="submit" size="sm" disabled={saving || !form.name.trim()}>
              <LoadingButtonContent loading={saving} loadingText="...">
                สร้าง
              </LoadingButtonContent>
            </Button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-b border-[#1E3A5F]/15 bg-blue-50/40"
    >
      <div className="flex items-center gap-2 px-4 py-2">
        <Plus className="h-4 w-4 shrink-0 text-[#1E3A5F]" />
        <Input
          ref={nameInputRef}
          required
          placeholder="สร้าง task ใหม่... (กด Enter เพื่อบันทึก)"
          value={form.name}
          onChange={(event) =>
            setForm((current) => ({ ...current, name: event.target.value }))
          }
          onFocus={() => setExpanded(true)}
          className={cn(
            fieldInputClass,
            "border-transparent bg-transparent shadow-none focus-visible:border-slate-200 focus-visible:bg-white",
          )}
        />
        <Button
          type="submit"
          size="sm"
          disabled={saving || !form.name.trim()}
          className="shrink-0"
        >
          <LoadingButtonContent loading={saving} loadingText="กำลังบันทึก...">
            สร้าง
          </LoadingButtonContent>
        </Button>
      </div>

      {expanded ? (
        <div className="space-y-3 border-t border-[#1E3A5F]/10 px-4 py-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              value={form.priorityId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  priorityId: event.target.value,
                }))
              }
              className={cn(fieldSelectClass, "bg-white")}
            >
              {priorities.map((priority) => (
                <option key={priority.id} value={priority.id}>
                  {priority.label}
                </option>
              ))}
            </Select>
            <Select
              value={form.statusId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  statusId: event.target.value,
                }))
              }
              className={cn(fieldSelectClass, "bg-white")}
            >
              {statuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </Select>
            <Select
              value={form.assigneeId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  assigneeId: event.target.value,
                }))
              }
              className={cn(fieldSelectClass, "bg-white")}
            >
              <option value="">ยังไม่ระบุ</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.nickname}
                </option>
              ))}
            </Select>
            <Select
              value={form.taskType}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  taskType: event.target.value as TaskType,
                }))
              }
              className={cn(fieldSelectClass, "bg-white")}
            >
              <option value="Back End">Back End</option>
              <option value="Front End">Front End</option>
            </Select>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:max-w-md">
            <DateInput
              compact
              id="inline-start-date"
              label="วันเริ่ม"
              value={form.startDate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  startDate: event.target.value,
                }))
              }
              max={form.endDate || undefined}
            />
            <DateInput
              compact
              id="inline-end-date"
              label="วันสิ้นสุด"
              value={form.endDate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  endDate: event.target.value,
                }))
              }
              min={form.startDate || undefined}
            />
          </div>

          <div className="grid gap-2 lg:grid-cols-2">
            <Textarea
              placeholder="Description"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              className="min-h-[60px] bg-white text-sm"
            />
            <Textarea
              placeholder="Remarks"
              value={form.remarks}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  remarks: event.target.value,
                }))
              }
              className="min-h-[60px] bg-white text-sm"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
            >
              <ChevronUp className="h-3 w-3" />
              ย่อฟอร์ม
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 pb-2">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
          >
            <ChevronDown className="h-3 w-3" />
            เพิ่มรายละเอียด (Priority, Status, Assignee...)
          </button>
        </div>
      )}
    </form>
  );
}
