"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, FolderKanban, Plus, Search, Settings2 } from "lucide-react";
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
        icon={<FolderKanban className="h-4 w-4" />}
        title="เลือกโปรเจกต์"
        description="ล็อกอินแล้วเลือกโปรเจกต์ก่อนใช้งาน — ธีมและการตั้งค่าจะตามโปรเจกต์ที่เลือก"
        actions={
          <Button
            type="button"
            className="h-9 rounded-xl px-3.5 shadow-sm"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            สร้างโปรเจกต์ใหม่
          </Button>
        }
      />

      <PageMain className="space-y-3">
        <div className="rounded-2xl border border-slate-200/70 bg-slate-50/90 p-2.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1 sm:min-w-[16rem]">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                className="h-9 rounded-full border-0 bg-white py-0 pl-9 text-sm leading-9 shadow-sm ring-1 ring-slate-200/80"
                placeholder="ค้นหาโปรเจกต์..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <span className="inline-flex h-9 items-center rounded-full bg-white px-3 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200/80">
              {filteredProjects.length} โปรเจกต์
            </span>
            <Link
              href="/projects/manage"
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200/80 transition hover:text-slate-900"
            >
              <Settings2 className="h-3.5 w-3.5" />
              จัดการ
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50/90 p-6 text-center text-sm text-red-700">
            {error}
          </div>
        ) : loading ? (
          <LoadingCard />
        ) : filteredProjects.length === 0 ? (
          <GlassPanel className="p-10 text-center">
            <FolderKanban className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <h3 className="text-base font-semibold text-slate-800">
              {search ? "ไม่พบโปรเจกต์" : "ยังไม่มีโปรเจกต์"}
            </h3>
            <p className="mt-1.5 text-sm text-slate-500">
              {search
                ? "ลองค้นหาด้วยคำอื่น"
                : "สร้างโปรเจกต์แรกเพื่อเริ่มจัดการ task"}
            </p>
            {!search ? (
              <Button
                type="button"
                className="mt-4 rounded-xl"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                สร้างโปรเจกต์ใหม่
              </Button>
            ) : null}
          </GlassPanel>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </PageMain>

      <ProjectFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={() => loadProjects()}
      />
    </AppShell>
  );
}
