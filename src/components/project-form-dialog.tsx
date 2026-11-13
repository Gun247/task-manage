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
import { ProjectThemeField } from "@/components/theme-picker";
import { Input, Label } from "@/components/ui/input";
import { LoadingButtonContent } from "@/components/ui/loading";
import { DEFAULT_THEME_ID, themeAccentColor } from "@/lib/themes";
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
  const [theme, setTheme] = useState(DEFAULT_THEME_ID);
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(project);

  useEffect(() => {
    if (!open) return;

    if (project) {
      setName(project.name);
      setDescription(project.description);
      setTheme(project.theme || DEFAULT_THEME_ID);
      return;
    }

    setName("");
    setDescription("");
    setTheme(DEFAULT_THEME_ID);
  }, [open, project]);

  function resetForm() {
    setName("");
    setDescription("");
    setTheme(DEFAULT_THEME_ID);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;

    setSaving(true);

    const payload = {
      name: name.trim(),
      description: description.trim(),
      theme,
      color: themeAccentColor(theme),
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
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("fwf-projects-changed"));
      }
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "แก้ไขโปรเจกต์" : "สร้างโปรเจกต์ใหม่"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "อัปเดตรายละเอียดและธีมสีของโปรเจกต์"
              : "เพิ่มโปรเจกต์เพื่อจัดการ task แยกตามงาน — ธีมสีใช้เฉพาะในโปรเจกต์นี้"}
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
            <Label>ธีมสีของโปรเจกต์</Label>
            <p className="mt-0.5 mb-2 text-xs text-slate-500">
              สีจุด/ป้ายโปรเจกต์และธีมหน้า Task มาจากธีมนี้ · หน้ารวมยังเป็นขาวสะอาด
            </p>
            <ProjectThemeField value={theme} onChange={setTheme} />
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
