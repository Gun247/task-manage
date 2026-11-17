"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FolderKanban, Plus, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { GlassPanel, PageHeader, PageMain } from "@/components/page-layout";
import { ProjectCard } from "@/components/project-card";
import { ProjectFormDialog } from "@/components/project-form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingCard } from "@/components/ui/loading";
import { fetchJsonArray } from "@/lib/fetch-json";
import type { Project } from "@/lib/types";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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

  const filteredProjects = projects.filter((project) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      project.name.toLowerCase().includes(query) ||
      project.description.toLowerCase().includes(query)
    );
  });

  return (
    <AppShell>
      <PageHeader
        icon={<FolderKanban className="h-5 w-5" />}
        title="โปรเจกต์ทั้งหมด"
        description="เลือกโปรเจกต์เพื่อดูและจัดการ task"
        actions={
          <Button
            type="button"
            className="h-10 rounded-lg px-4 shadow-[0_8px_20px_rgba(59,130,246,0.25)]"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            สร้างโปรเจกต์ใหม่
          </Button>
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="h-10 rounded-lg border-white/80 bg-white/80 pl-9 shadow-sm"
              placeholder="ค้นหาโปรเจกต์..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <p className="text-sm text-slate-500">
            {filteredProjects.length} โปรเจกต์
          </p>
        </div>
      </PageHeader>

      <PageMain>
        {error ? (
          <div className="rounded-[1.35rem] border border-red-200 bg-red-50/90 p-6 text-center text-sm text-red-700">
            {error}
          </div>
        ) : loading ? (
          <LoadingCard />
        ) : filteredProjects.length === 0 ? (
          <GlassPanel className="p-12 text-center">
            <FolderKanban className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <h3 className="text-base font-semibold text-slate-800">
              {search ? "ไม่พบโปรเจกต์" : "ยังไม่มีโปรเจกต์"}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {search
                ? "ลองค้นหาด้วยคำอื่น"
                : "สร้างโปรเจกต์แรกเพื่อเริ่มจัดการ task"}
            </p>
            {!search ? (
              <Button
                type="button"
                className="mt-4 rounded-lg"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                สร้างโปรเจกต์ใหม่
              </Button>
            ) : null}
          </GlassPanel>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link
            href="/projects/manage"
            className="inline-flex h-10 items-center rounded-lg border border-white/80 bg-white/70 px-4 text-sm font-medium text-primary shadow-sm backdrop-blur-sm transition hover:bg-white"
          >
            จัดการโปรเจกต์ →
          </Link>
        </div>
      </PageMain>

      <ProjectFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={() => loadProjects()}
      />
    </AppShell>
  );
}
