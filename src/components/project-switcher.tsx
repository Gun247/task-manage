"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, LayoutGrid, Plus } from "lucide-react";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ProjectSwitcherProps {
  projects: Project[];
  selectedProjectId: string;
  onSelect: (projectId: string) => void;
  onCreateNew: () => void;
}

export function ProjectSwitcher({
  projects,
  selectedProjectId,
  onSelect,
  onCreateNew,
}: ProjectSwitcherProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedProject = projects.find(
    (project) => project.id === selectedProjectId,
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        disabled={projects.length === 0}
        className={cn(
          "flex h-9 min-w-[200px] max-w-[280px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left text-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50",
          open && "border-primary/40 ring-2 ring-primary/10",
        )}
      >
        {selectedProject ? (
          <>
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: selectedProject.color }}
            />
            <span className="min-w-0 flex-1 truncate font-medium text-slate-800">
              {selectedProject.name}
            </span>
          </>
        ) : (
          <span className="flex-1 text-slate-400">เลือกโปรเจกต์</span>
        )}
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-400 transition",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div className="absolute top-full left-0 z-50 mt-1.5 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 px-3 py-2">
            <p className="text-xs font-medium text-slate-500">สลับโปรเจกต์</p>
          </div>

          <div className="max-h-60 overflow-y-auto p-1">
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => {
                  onSelect(project.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-slate-50",
                  project.id === selectedProjectId && "bg-primary/10",
                )}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-800">
                    {project.name}
                  </p>
                  {project.description ? (
                    <p className="truncate text-xs text-slate-500">
                      {project.description}
                    </p>
                  ) : null}
                </div>
                {project.id === selectedProjectId ? (
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                ) : null}
              </button>
            ))}
          </div>

          <div className="border-t border-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                onCreateNew();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-primary transition hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              สร้างโปรเจกต์ใหม่
            </button>
            <Link
              href="/projects"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
            >
              <LayoutGrid className="h-4 w-4" />
              ดูโปรเจกต์ทั้งหมด
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
