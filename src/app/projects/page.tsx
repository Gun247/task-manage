"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FolderKanban, Plus, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
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
      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1E3A5F]">โปรเจกต์ทั้งหมด</h1>
            <p className="mt-1 text-sm text-slate-500">
              เลือกโปรเจกต์เพื่อดูและจัดการ task
            </p>
          </div>
          <Button type="button" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            สร้างโปรเจกต์ใหม่
          </Button>
        </div>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="h-10 pl-9"
              placeholder="ค้นหาโปรเจกต์..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <p className="text-sm text-slate-500">
            {filteredProjects.length} โปรเจกต์
          </p>
        </div>

        {error ? (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
            {error}
          </div>
        ) : loading ? (
          <LoadingCard className="mt-8" />
        ) : filteredProjects.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-12 text-center">
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
                className="mt-4"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                สร้างโปรเจกต์ใหม่
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link
            href="/projects/manage"
            className="text-sm font-medium text-[#1E3A5F] hover:underline"
          >
            จัดการโปรเจกต์ →
          </Link>
        </div>
      </main>

      <ProjectFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={() => loadProjects()}
      />
    </AppShell>
  );
}
