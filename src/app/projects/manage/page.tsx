"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Plus, Settings2, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { GlassPanel, PageHeader, PageMain } from "@/components/page-layout";
import { ProjectFormDialog } from "@/components/project-form-dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LoadingButtonContent, LoadingCard } from "@/components/ui/loading";
import { ThemeSwatches } from "@/components/theme-picker";
import { fetchJsonArray } from "@/lib/fetch-json";
import { readMemberSession } from "@/lib/current-member";
import { displayProjectDescription } from "@/lib/project-display";
import { canManageProjects } from "@/lib/roles";
import { themeLabel, themeSwatches } from "@/lib/themes";
import type { Project } from "@/lib/types";

export default function ManageProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);
  const [allowed, setAllowed] = useState(false);

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
    const session = readMemberSession();
    if (!session || !canManageProjects(session.role)) {
      router.replace("/projects");
      return;
    }
    setAllowed(true);
    loadProjects();
  }, [loadProjects, router]);

  function openCreate() {
    setEditingProject(null);
    setDialogOpen(true);
  }

  function openEdit(project: Project) {
    setEditingProject(project);
    setDialogOpen(true);
  }

  function requestDelete(project: Project) {
    const taskCount = project._count?.tasks ?? 0;
    if (taskCount > 0) {
      alert(
        `ไม่สามารถลบโปรเจกต์ "${project.name}" ได้ เพราะมี ${taskCount} task อยู่`,
      );
      return;
    }
    setPendingDelete(project);
  }

  async function handleDelete() {
    if (!pendingDelete) return;

    setDeletingId(pendingDelete.id);
    const response = await fetch(`/api/projects/${pendingDelete.id}`, {
      method: "DELETE",
    });
    setDeletingId(null);

    if (response.ok) {
      setPendingDelete(null);
      loadProjects();
      return;
    }

    const data = await response.json();
    alert(data.error ?? "ไม่สามารถลบโปรเจกต์ได้");
  }

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-sm text-slate-500">
        ตรวจสอบสิทธิ์...
      </div>
    );
  }

  return (
    <AppShell>
      <PageHeader
        icon={<Settings2 className="h-5 w-5" />}
        title="จัดการโปรเจกต์"
        description="แก้ไข ลบ หรือสร้างโปรเจกต์ใหม่"
        actions={
          <Button
            type="button"
            className="h-10 rounded-lg px-4 shadow-[0_8px_20px_rgba(59,130,246,0.25)]"
            onClick={openCreate}
          >
            <Plus className="h-4 w-4" />
            สร้างโปรเจกต์ใหม่
          </Button>
        }
      >
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับไปโปรเจกต์ทั้งหมด
        </Link>
      </PageHeader>

      <PageMain width="4xl">
        {error ? (
          <div className="rounded-[1.35rem] border border-red-200 bg-red-50/90 p-6 text-center text-sm text-red-700">
            {error}
          </div>
        ) : loading ? (
          <LoadingCard />
        ) : projects.length === 0 ? (
          <GlassPanel className="p-12 text-center">
            <h3 className="text-base font-semibold text-slate-800">
              ยังไม่มีโปรเจกต์
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              สร้างโปรเจกต์แรกเพื่อเริ่มใช้งาน
            </p>
            <Button
              type="button"
              className="mt-4 rounded-lg"
              onClick={openCreate}
            >
              <Plus className="h-4 w-4" />
              สร้างโปรเจกต์ใหม่
            </Button>
          </GlassPanel>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => {
              const taskCount = project._count?.tasks ?? 0;

              return (
                <GlassPanel
                  key={project.id}
                  className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <ThemeSwatches
                      colors={themeSwatches(project.theme)}
                      size="md"
                      className="mt-0.5"
                    />
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-slate-900">
                        {project.name}
                      </h3>
                      {displayProjectDescription(project.description) ? (
                        <p className="mt-0.5 text-sm text-slate-500">
                          {displayProjectDescription(project.description)}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-slate-400">
                        {themeLabel(project.theme)} · {taskCount} task
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
                      onClick={() => requestDelete(project)}
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
                </GlassPanel>
              );
            })}
          </div>
        )}
      </PageMain>

      <ProjectFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        project={editingProject}
        onSaved={() => loadProjects()}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={`ลบโปรเจกต์ "${pendingDelete?.name ?? ""}" ใช่หรือไม่?`}
        description="การลบนี้ย้อนกลับไม่ได้"
        confirmLabel="ลบ"
        loading={deletingId !== null}
        onConfirm={handleDelete}
      />
    </AppShell>
  );
}
