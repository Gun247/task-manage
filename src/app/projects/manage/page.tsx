"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { AppNav } from "@/components/app-nav";
import { ProjectFormDialog } from "@/components/project-form-dialog";
import { Button } from "@/components/ui/button";
import { LoadingButtonContent, LoadingCard } from "@/components/ui/loading";
import { fetchJsonArray } from "@/lib/fetch-json";
import type { Project } from "@/lib/types";

export default function ManageProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      setError(null);
      setProjects(await fetchJsonArray<Project>("/api/projects"));
    } catch (err) {
      setProjects([]);
      setError(err instanceof Error ? err.message : "โหลดโปรเจกต์ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  function openCreate() {
    setEditingProject(null);
    setDialogOpen(true);
  }

  function openEdit(project: Project) {
    setEditingProject(project);
    setDialogOpen(true);
  }

  async function handleDelete(project: Project) {
    const taskCount = project._count?.tasks ?? 0;
    if (taskCount > 0) {
      alert(
        `ไม่สามารถลบโปรเจกต์ "${project.name}" ได้ เพราะมี ${taskCount} task อยู่`,
      );
      return;
    }

    if (!confirm(`ลบโปรเจกต์ "${project.name}" ใช่หรือไม่?`)) return;

    setDeletingId(project.id);
    const response = await fetch(`/api/projects/${project.id}`, {
      method: "DELETE",
    });
    setDeletingId(null);

    if (response.ok) {
      loadProjects();
      return;
    }

    const data = await response.json();
    alert(data.error ?? "ไม่สามารถลบโปรเจกต์ได้");
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <AppNav />

      <main className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับไปโปรเจกต์ทั้งหมด
        </Link>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1E3A5F]">จัดการโปรเจกต์</h1>
            <p className="mt-1 text-sm text-slate-500">
              แก้ไข ลบ หรือสร้างโปรเจกต์ใหม่
            </p>
          </div>
          <Button type="button" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            สร้างโปรเจกต์ใหม่
          </Button>
        </div>

        {error ? (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
            {error}
          </div>
        ) : loading ? (
          <LoadingCard className="mt-8" />
        ) : projects.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <h3 className="text-base font-semibold text-slate-800">
              ยังไม่มีโปรเจกต์
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              สร้างโปรเจกต์แรกเพื่อเริ่มใช้งาน
            </p>
            <Button type="button" className="mt-4" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              สร้างโปรเจกต์ใหม่
            </Button>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {projects.map((project) => {
              const taskCount = project._count?.tasks ?? 0;

              return (
                <div
                  key={project.id}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className="mt-1 h-4 w-4 shrink-0 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-slate-900">
                        {project.name}
                      </h3>
                      <p className="mt-0.5 text-sm text-slate-500">
                        {project.description || "ไม่มีคำอธิบาย"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {taskCount} task
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <Link href={`/tasks?project=${project.id}`}>เปิด Task</Link>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(project)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      แก้ไข
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={deletingId === project.id}
                      onClick={() => handleDelete(project)}
                      className="text-red-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <LoadingButtonContent
                        loading={deletingId === project.id}
                        loadingText="กำลังลบ..."
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </LoadingButtonContent>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <ProjectFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        project={editingProject}
        onSaved={() => loadProjects()}
      />
    </div>
  );
}
