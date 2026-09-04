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
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { LoadingButtonContent } from "@/components/ui/loading";
import type { Priority, Status, Task, TaskType, TeamMember } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { History } from "lucide-react";

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  statuses: Status[];
  priorities: Priority[];
  teamMembers: TeamMember[];
  projectId?: string;
  defaultStatusId?: string;
  onSaved: () => void;
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

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  statuses,
  priorities,
  teamMembers,
  projectId,
  defaultStatusId,
  onSaved,
}: TaskFormDialogProps) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (task) {
      setForm({
        name: task.name,
        description: task.description,
        remarks: task.remarks,
        taskType: task.taskType,
        startDate: task.startDate ? task.startDate.slice(0, 10) : "",
        endDate: task.endDate ? task.endDate.slice(0, 10) : "",
        priorityId: task.priorityId,
        statusId: task.statusId,
        assigneeId: task.assigneeId ?? "",
      });
      return;
    }

    setForm({
      ...emptyForm,
      priorityId: priorities[0]?.id ?? "",
      statusId: defaultStatusId ?? statuses[0]?.id ?? "",
    });
  }, [open, task, priorities, statuses, defaultStatusId]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);

    const payload = {
      ...form,
      projectId: task?.projectId ?? projectId,
      assigneeId: form.assigneeId || null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
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
            <div>
              <Label htmlFor="assignee">Assigned to</Label>
              <Select
                id="assignee"
                value={form.assigneeId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    assigneeId: event.target.value,
                  }))
                }
              >
                <option value="">ยังไม่ระบุ</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.nickname}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="taskType">Task Type</Label>
              <Select
                id="taskType"
                value={form.taskType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    taskType: event.target.value as TaskType,
                  }))
                }
              >
                <option value="Back End">Back End</option>
                <option value="Front End">Front End</option>
              </Select>
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
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                <History className="h-4 w-4 text-slate-500" />
                ประวัติสถานะ
              </div>
              {(task.statusHistory ?? []).length === 0 ? (
                <p className="text-xs text-slate-500">ยังไม่มีประวัติการเปลี่ยนสถานะ</p>
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
                              <span className="text-slate-500">{entry.fromStatusName}</span>
                              {" → "}
                              <span className="font-medium">{entry.toStatusName}</span>
                            </p>
                          ) : (
                            <p className="text-slate-700">
                              เริ่มที่{" "}
                              <span className="font-medium">{entry.toStatusName}</span>
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
