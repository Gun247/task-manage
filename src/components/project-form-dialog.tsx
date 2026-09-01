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
import { Input, Label } from "@/components/ui/input";
import { LoadingButtonContent } from "@/components/ui/loading";
import { PROJECT_COLOR_OPTIONS } from "@/lib/project-colors";
import type { Project } from "@/lib/types";

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  onSaved: (projectId: string) => void;
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  onSaved,
}: ProjectFormDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<string>(PROJECT_COLOR_OPTIONS[0]);
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(project);

  useEffect(() => {
    if (!open) return;

    if (project) {
      setName(project.name);
      setDescription(project.description);
      setColor(project.color);
      return;
    }

    setName("");
    setDescription("");
    setColor(PROJECT_COLOR_OPTIONS[0]);
  }, [open, project]);

  function resetForm() {
    setName("");
    setDescription("");
    setColor(PROJECT_COLOR_OPTIONS[0]);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;

    setSaving(true);

    const payload = {
      name: name.trim(),
      description: description.trim(),
      color,
    };

    const response = await fetch(
      project ? `/api/projects/${project.id}` : "/api/projects",
      {
        method: project ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    setSaving(false);

    if (response.ok) {
      const savedProject = await response.json();
      resetForm();
      onSaved(savedProject.id);
      onOpenChange(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) resetForm();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "แก้ไขโปรเจกต์" : "สร้างโปรเจกต์ใหม่"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "อัปเดตรายละเอียดโปรเจกต์"
              : "เพิ่มโปรเจกต์เพื่อจัดการ task แยกตามงาน"}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="project-name">ชื่อโปรเจกต์</Label>
            <Input
              id="project-name"
              required
              placeholder="เช่น FWF Task Manager"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="project-description">คำอธิบาย (ไม่บังคับ)</Label>
            <Input
              id="project-description"
              placeholder="เช่น Foreigner Worker Fund"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div>
            <Label>สีโปรเจกต์</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {PROJECT_COLOR_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`h-8 w-8 rounded-full border-2 ${
                    color === option ? "border-slate-900" : "border-transparent"
                  }`}
                  style={{ backgroundColor: option }}
                  onClick={() => setColor(option)}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              <LoadingButtonContent loading={saving} loadingText="กำลังบันทึก...">
                {isEditing ? "บันทึก" : "สร้างโปรเจกต์"}
              </LoadingButtonContent>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
