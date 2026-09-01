"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import type { Priority, Status, Task, TaskType, TeamMember } from "@/lib/types";

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  statuses: Status[];
  priorities: Priority[];
  teamMembers: TeamMember[];
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
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={form.startDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    startDate: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label htmlFor="endDate">Planned End Date (UAT)</Label>
              <Input
                id="endDate"
                type="date"
                value={form.endDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    endDate: event.target.value,
                  }))
                }
              />
            </div>
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

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
