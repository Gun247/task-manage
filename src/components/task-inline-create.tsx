"use client";

import { useEffect, useRef, useState } from "react";
import { AssigneeMultiSelect } from "@/components/assignee-multi-select";
import {
  PendingSubtasksEditor,
  type PendingSubtask,
} from "@/components/pending-subtasks-editor";
import { TaskTypeMultiSelect } from "@/components/task-type-multi-select";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Input, Select, Textarea } from "@/components/ui/input";
import { LoadingButtonContent } from "@/components/ui/loading";
import type {
  Priority,
  Status,
  TaskType,
  TaskTypeOption,
  TeamMember,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";

interface TaskInlineCreateProps {
  statuses: Status[];
  priorities: Priority[];
  teamMembers: TeamMember[];
  taskTypes: TaskTypeOption[];
  projectId: string;
  defaultStatusId?: string;
  onSaved: () => void;
  focusTrigger?: number;
}

const emptyForm = {
  name: "",
  description: "",
  remarks: "",
  taskType: "Back End" as TaskType,
  taskTypes: ["Back End"] as TaskType[],
  startDate: "",
  endDate: "",
  uatDate: "",
  prdDate: "",
  priorityId: "",
  statusId: "",
  assigneeIds: [] as string[],
  ownerId: "",
};

export function TaskInlineCreate({
  statuses,
  priorities,
  teamMembers,
  taskTypes,
  projectId,
  defaultStatusId,
  onSaved,
  focusTrigger = 0,
}: TaskInlineCreateProps) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [pendingSubtasks, setPendingSubtasks] = useState<PendingSubtask[]>([]);
  const [newSubtaskName, setNewSubtaskName] = useState("");
  const [newSubtaskAssigneeIds, setNewSubtaskAssigneeIds] = useState<string[]>(
    [],
  );
  const [saving, setSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const parentAssignees = teamMembers.filter((member) =>
    form.assigneeIds.includes(member.id),
  );

  useEffect(() => {
    const defaultType = taskTypes[0]?.name ?? "Back End";
    setForm({
      ...emptyForm,
      taskType: defaultType,
      taskTypes: [defaultType],
      priorityId: priorities[0]?.id ?? "",
      statusId: defaultStatusId ?? statuses[0]?.id ?? "",
    });
    setPendingSubtasks([]);
    setNewSubtaskName("");
    setNewSubtaskAssigneeIds([]);
    setExpanded(false);
  }, [defaultStatusId, priorities, statuses, taskTypes]);

  useEffect(() => {
    if (focusTrigger > 0) {
      nameInputRef.current?.focus();
      setExpanded(true);
    }
  }, [focusTrigger]);

  useEffect(() => {
    const allowed = new Set(form.assigneeIds);
    setPendingSubtasks((current) =>
      current.map((item) => ({
        ...item,
        assigneeIds: item.assigneeIds.filter((id) => allowed.has(id)),
      })),
    );
    setNewSubtaskAssigneeIds((current) =>
      current.filter((id) => allowed.has(id)),
    );
  }, [form.assigneeIds]);

  useEffect(() => {
    if (!expanded) return;
    bodyRef.current?.scrollTo({ top: 0 });
  }, [expanded]);

  function resetForm() {
    const defaultType = taskTypes[0]?.name ?? "Back End";
    setForm({
      ...emptyForm,
      taskType: defaultType,
      taskTypes: [defaultType],
      priorityId: priorities[0]?.id ?? "",
      statusId: defaultStatusId ?? statuses[0]?.id ?? "",
    });
    setPendingSubtasks([]);
    setNewSubtaskName("");
    setNewSubtaskAssigneeIds([]);
    setExpanded(false);
  }

  function addPendingSubtask() {
    const name = newSubtaskName.trim();
    if (!name) return;
    setPendingSubtasks((current) => [
      ...current,
      { name, assigneeIds: newSubtaskAssigneeIds },
    ]);
    setNewSubtaskName("");
    setNewSubtaskAssigneeIds([]);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) return;

    setSaving(true);

    const draftName = newSubtaskName.trim();
    const subtasks = draftName
      ? [
          ...pendingSubtasks,
          { name: draftName, assigneeIds: newSubtaskAssigneeIds },
        ]
      : pendingSubtasks;

    const payload = {
      ...form,
      projectId,
      name: form.name.trim(),
      assigneeIds: form.assigneeIds,
      taskTypes: form.taskTypes,
      subtasks,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      uatDate: form.uatDate || null,
      prdDate: form.prdDate || null,
      ownerId: form.ownerId || null,
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
  const fieldLabelClass = "mb-1 block text-caption font-medium text-slate-500";

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "flex flex-col border-b border-primary/15 bg-primary/5",
        expanded && "max-h-[min(58vh,36rem)]",
      )}
    >
      <div className="flex shrink-0 min-w-0 items-center gap-2 px-4 py-2">
        <Plus className="h-4 w-4 shrink-0 text-primary" />
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
            "min-w-0 flex-1 border-transparent bg-transparent shadow-none focus-visible:border-slate-200 focus-visible:bg-white",
          )}
        />
        {expanded ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 text-slate-500"
            onClick={() => setExpanded(false)}
            aria-label="ย่อฟอร์ม"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
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
        <>
          <div
            ref={bodyRef}
            className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3"
          >
            <div className="grid gap-2 sm:grid-cols-3">
              <div>
                <label className={fieldLabelClass} htmlFor="inline-priority">
                  Priority
                </label>
                <Select
                  id="inline-priority"
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
              </div>
              <div>
                <label className={fieldLabelClass} htmlFor="inline-status">
                  Status
                </label>
                <Select
                  id="inline-status"
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
              </div>
              <div>
                <label className={fieldLabelClass} htmlFor="inline-owner">
                  ผู้ดูแล
                </label>
                <Select
                  id="inline-owner"
                  value={form.ownerId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      ownerId: event.target.value,
                    }))
                  }
                  className={cn(fieldSelectClass, "bg-white")}
                  aria-label="ผู้ดูแล"
                >
                  <option value="">ไม่ระบุ</option>
                  {teamMembers
                    .filter((member) => member.isActive)
                    .map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.nickname}
                      </option>
                    ))}
                </Select>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <span className={fieldLabelClass}>Type</span>
                <TaskTypeMultiSelect
                  options={taskTypes}
                  value={form.taskTypes}
                  onChange={(selected) =>
                    setForm((current) => ({
                      ...current,
                      taskTypes: selected,
                      taskType: selected[0] ?? taskTypes[0]?.name ?? "Back End",
                    }))
                  }
                  className="bg-white"
                />
              </div>
              <div>
                <span className={fieldLabelClass}>Assignee</span>
                <AssigneeMultiSelect
                  compact
                  members={teamMembers.filter((member) => member.isActive)}
                  value={form.assigneeIds}
                  onChange={(assigneeIds) =>
                    setForm((current) => ({ ...current, assigneeIds }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
              <DateInput
                compact
                id="inline-uat-date"
                label="Timeline UAT"
                value={form.uatDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    uatDate: event.target.value,
                  }))
                }
              />
              <DateInput
                compact
                id="inline-prd-date"
                label="Timeline PRD"
                value={form.prdDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    prdDate: event.target.value,
                  }))
                }
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className={fieldLabelClass} htmlFor="inline-description">
                  Description
                </label>
                <Textarea
                  id="inline-description"
                  placeholder="รายละเอียดงาน"
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  className="min-h-[72px] bg-white text-sm"
                />
              </div>
              <div>
                <label className={fieldLabelClass} htmlFor="inline-remarks">
                  Remarks
                </label>
                <Textarea
                  id="inline-remarks"
                  placeholder="หมายเหตุ"
                  value={form.remarks}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      remarks: event.target.value,
                    }))
                  }
                  className="min-h-[72px] bg-white text-sm"
                />
              </div>
            </div>

            <PendingSubtasksEditor
              compact
              items={pendingSubtasks}
              draft={newSubtaskName}
              onDraftChange={setNewSubtaskName}
              draftAssigneeIds={newSubtaskAssigneeIds}
              onDraftAssigneeIdsChange={setNewSubtaskAssigneeIds}
              availableMembers={parentAssignees}
              onAdd={addPendingSubtask}
              onRemove={(index) =>
                setPendingSubtasks((current) =>
                  current.filter((_, itemIndex) => itemIndex !== index),
                )
              }
              onChangeAssignees={(index, assigneeIds) =>
                setPendingSubtasks((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, assigneeIds } : item,
                  ),
                )
              }
            />
          </div>

          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-primary/10 bg-primary/[0.03] px-4 py-2">
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
            >
              <ChevronUp className="h-3 w-3" />
              ย่อฟอร์ม
            </button>
            <Button
              type="submit"
              size="sm"
              disabled={saving || !form.name.trim()}
            >
              <LoadingButtonContent
                loading={saving}
                loadingText="กำลังบันทึก..."
              >
                สร้าง task
              </LoadingButtonContent>
            </Button>
          </div>
        </>
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
