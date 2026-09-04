"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AssigneeMultiSelect } from "@/components/assignee-multi-select";
import {
  PendingSubtasksEditor,
  type PendingSubtask,
} from "@/components/pending-subtasks-editor";
import { SubtaskAssigneePicker } from "@/components/subtask-assignee-picker";
import { TaskTypeMultiSelect } from "@/components/task-type-multi-select";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { LoadingButtonContent } from "@/components/ui/loading";
import type {
  Priority,
  Status,
  Subtask,
  Task,
  TaskType,
  TaskTypeOption,
  TeamMember,
} from "@/lib/types";
import { parseTaskTypes } from "@/lib/task-types";
import { cn, formatDateTime } from "@/lib/utils";
import { CheckSquare, History, Plus, Trash2 } from "lucide-react";

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  statuses: Status[];
  priorities: Priority[];
  teamMembers: TeamMember[];
  taskTypes: TaskTypeOption[];
  projectId?: string;
  defaultStatusId?: string;
  onSaved: () => void;
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
};

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  statuses,
  priorities,
  teamMembers,
  taskTypes,
  projectId,
  defaultStatusId,
  onSaved,
}: TaskFormDialogProps) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [pendingSubtasks, setPendingSubtasks] = useState<PendingSubtask[]>([]);
  const [newSubtaskName, setNewSubtaskName] = useState("");
  const [newSubtaskAssigneeIds, setNewSubtaskAssigneeIds] = useState<string[]>(
    [],
  );
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [updatingSubtaskId, setUpdatingSubtaskId] = useState<string | null>(null);

  const parentAssignees = teamMembers.filter((member) =>
    form.assigneeIds.includes(member.id),
  );

  useEffect(() => {
    if (!open) return;

    if (task) {
      setForm({
        name: task.name,
        description: task.description,
        remarks: task.remarks,
        taskType: (task.taskTypes?.[0] ?? task.taskType) as TaskType,
        taskTypes:
          task.taskTypes?.length > 0
            ? task.taskTypes
            : parseTaskTypes(task.taskType),
        startDate: task.startDate ? task.startDate.slice(0, 10) : "",
        endDate: task.endDate ? task.endDate.slice(0, 10) : "",
        uatDate: task.uatDate ? task.uatDate.slice(0, 10) : "",
        prdDate: task.prdDate ? task.prdDate.slice(0, 10) : "",
        priorityId: task.priorityId,
        statusId: task.statusId,
        assigneeIds:
          task.assignees?.length > 0
            ? task.assignees.map((member) => member.id)
            : task.assigneeId
              ? [task.assigneeId]
              : [],
      });
      setSubtasks(
        (task.subtasks ?? []).map((item) => ({
          ...item,
          assignees: item.assignees ?? [],
        })),
      );
      setPendingSubtasks([]);
      setNewSubtaskName("");
      setNewSubtaskAssigneeIds([]);
      return;
    }

    setForm({
      ...emptyForm,
      taskType: taskTypes[0]?.name ?? "Back End",
      taskTypes: [taskTypes[0]?.name ?? "Back End"],
      priorityId: priorities[0]?.id ?? "",
      statusId: defaultStatusId ?? statuses[0]?.id ?? "",
    });
    setSubtasks([]);
    setPendingSubtasks([]);
    setNewSubtaskName("");
    setNewSubtaskAssigneeIds([]);
  }, [open, task, priorities, statuses, taskTypes, defaultStatusId]);

  // Keep pending/draft subtask assignees within current parent assignees
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
    setSubtasks((current) =>
      current.map((item) => ({
        ...item,
        assignees: (item.assignees ?? []).filter((member) =>
          allowed.has(member.id),
        ),
      })),
    );
  }, [form.assigneeIds]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);

    const draftName = newSubtaskName.trim();
    const createSubtasks = !task
      ? draftName
        ? [
            ...pendingSubtasks,
            { name: draftName, assigneeIds: newSubtaskAssigneeIds },
          ]
        : pendingSubtasks
      : undefined;

    const payload = {
      ...form,
      projectId: task?.projectId ?? projectId,
      assigneeIds: form.assigneeIds,
      taskTypes: form.taskTypes,
      ...(createSubtasks ? { subtasks: createSubtasks } : {}),
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      uatDate: form.uatDate || null,
      prdDate: form.prdDate || null,
    };

    const response = await fetch(task ? `/api/tasks/${task.id}` : "/api/tasks", {
      method: task ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (response.ok) {
      onSaved();
      onOpenChange(false);
    }
  }

  async function addSubtask() {
    if (!task || !newSubtaskName.trim()) return;
    setAddingSubtask(true);
    const response = await fetch(`/api/tasks/${task.id}/subtasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newSubtaskName.trim(),
        assigneeIds: newSubtaskAssigneeIds,
      }),
    });
    setAddingSubtask(false);

    if (!response.ok) return;
    const created = (await response.json()) as Subtask;
    setSubtasks((current) => [...current, created]);
    setNewSubtaskName("");
    setNewSubtaskAssigneeIds([]);
    onSaved();
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

  async function toggleSubtask(subtask: Subtask) {
    setUpdatingSubtaskId(subtask.id);
    const response = await fetch(`/api/subtasks/${subtask.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDone: !subtask.isDone }),
    });
    setUpdatingSubtaskId(null);

    if (!response.ok) return;
    const updated = (await response.json()) as Subtask;
    setSubtasks((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
    onSaved();
  }

  async function updateSubtaskAssignees(subtask: Subtask, assigneeIds: string[]) {
    setUpdatingSubtaskId(subtask.id);
    const response = await fetch(`/api/subtasks/${subtask.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigneeIds }),
    });
    setUpdatingSubtaskId(null);

    if (!response.ok) return;
    const updated = (await response.json()) as Subtask;
    setSubtasks((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
    onSaved();
  }

  async function removeSubtask(subtaskId: string) {
    setUpdatingSubtaskId(subtaskId);
    const response = await fetch(`/api/subtasks/${subtaskId}`, {
      method: "DELETE",
    });
    setUpdatingSubtaskId(null);

    if (!response.ok) return;
    setSubtasks((current) => current.filter((item) => item.id !== subtaskId));
    onSaved();
  }

  const doneCount = subtasks.filter((item) => item.isDone).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "แก้ไข Task" : "สร้าง Task ใหม่"}</DialogTitle>
          <DialogDescription>
            กรอกรายละเอียดงานตามโครงสร้าง FWF Task Tracker
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="name">Task Name</Label>
            <Input
              id="name"
              required
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                id="priority"
                value={form.priorityId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    priorityId: event.target.value,
                  }))
                }
              >
                {priorities.map((priority) => (
                  <option key={priority.id} value={priority.id}>
                    {priority.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                id="status"
                value={form.statusId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    statusId: event.target.value,
                  }))
                }
              >
                {statuses.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Assigned to</Label>
              <AssigneeMultiSelect
                members={teamMembers.filter((member) => member.isActive)}
                value={form.assigneeIds}
                onChange={(assigneeIds) =>
                  setForm((current) => ({ ...current, assigneeIds }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <Label>Task Type</Label>
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
              />
            </div>
            <DateInput
              id="startDate"
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
              id="endDate"
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
              id="uatDate"
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
              id="prdDate"
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

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
          </div>

          <div>
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={form.remarks}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  remarks: event.target.value,
                }))
              }
            />
          </div>

          {task ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <CheckSquare className="h-4 w-4 text-slate-500" />
                  Subtasks
                </div>
                <span className="text-xs text-slate-500">
                  {doneCount}/{subtasks.length} เสร็จ
                </span>
              </div>

              <div className="mb-3 space-y-2">
                {subtasks.length === 0 ? (
                  <p className="text-xs text-slate-500">ยังไม่มี subtask</p>
                ) : (
                  subtasks.map((subtask) => (
                    <div
                      key={subtask.id}
                      className="space-y-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={subtask.isDone}
                          disabled={updatingSubtaskId === subtask.id}
                          onChange={() => toggleSubtask(subtask)}
                          className="h-4 w-4 rounded border-slate-300 text-[#1E3A5F] focus:ring-[#1E3A5F]/30"
                        />
                        <span
                          className={cn(
                            "min-w-0 flex-1 text-sm",
                            subtask.isDone
                              ? "text-slate-400 line-through"
                              : "text-slate-800",
                          )}
                        >
                          {subtask.name}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          disabled={updatingSubtaskId === subtask.id}
                          onClick={() => removeSubtask(subtask.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                      <SubtaskAssigneePicker
                        members={parentAssignees}
                        value={(subtask.assignees ?? []).map(
                          (member) => member.id,
                        )}
                        disabled={updatingSubtaskId === subtask.id}
                        onChange={(assigneeIds) =>
                          updateSubtaskAssignees(subtask, assigneeIds)
                        }
                      />
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <Input
                    placeholder="เพิ่ม subtask..."
                    value={newSubtaskName}
                    onChange={(event) => setNewSubtaskName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addSubtask();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={addingSubtask || !newSubtaskName.trim()}
                    onClick={addSubtask}
                  >
                    <LoadingButtonContent loading={addingSubtask} loadingText="...">
                      <Plus className="h-4 w-4" />
                    </LoadingButtonContent>
                  </Button>
                </div>
                <SubtaskAssigneePicker
                  members={parentAssignees}
                  value={newSubtaskAssigneeIds}
                  onChange={setNewSubtaskAssigneeIds}
                  disabled={addingSubtask}
                />
              </div>
            </div>
          ) : (
            <PendingSubtasksEditor
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
          )}

          {task ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                <History className="h-4 w-4 text-slate-500" />
                ประวัติสถานะ
              </div>
              {(task.statusHistory ?? []).length === 0 ? (
                <p className="text-xs text-slate-500">
                  ยังไม่มีประวัติการเปลี่ยนสถานะ
                </p>
              ) : (
                <ol className="space-y-2">
                  {[...(task.statusHistory ?? [])]
                    .slice()
                    .reverse()
                    .map((entry) => (
                      <li
                        key={entry.id}
                        className="flex items-start justify-between gap-3 text-sm"
                      >
                        <div className="min-w-0">
                          {entry.fromStatusName ? (
                            <p className="text-slate-700">
                              <span className="text-slate-500">
                                {entry.fromStatusName}
                              </span>
                              {" → "}
                              <span className="font-medium">
                                {entry.toStatusName}
                              </span>
                            </p>
                          ) : (
                            <p className="text-slate-700">
                              เริ่มที่{" "}
                              <span className="font-medium">
                                {entry.toStatusName}
                              </span>
                            </p>
                          )}
                        </div>
                        <time className="shrink-0 text-xs text-slate-500">
                          {formatDateTime(entry.changedAt)}
                        </time>
                      </li>
                    ))}
                </ol>
              )}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={saving}>
              <LoadingButtonContent loading={saving} loadingText="กำลังบันทึก...">
                บันทึก
              </LoadingButtonContent>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
