"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, LayoutGrid, Plus } from "lucide-react";
import { displayProjectDescription } from "@/lib/project-display";
import { themeAccentColor } from "@/lib/themes";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ProjectSwitcherProps {
  projects: Project[];
  selectedProjectId: string;
  onSelect: (projectId: string) => void;
  onCreateNew?: () => void;
  variant?: "default" | "sidebar";
  className?: string;
}

export function ProjectSwitcher({
  projects,
  selectedProjectId,
  onSelect,
  onCreateNew,
  variant = "default",
  className,
}: ProjectSwitcherProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedProject = projects.find(
    (project) => project.id === selectedProjectId,
  );
  const isSidebar = variant === "sidebar";

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
    <div ref={containerRef} className={cn("relative min-w-0", className)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        disabled={projects.length === 0}
        className={cn(
          "flex min-w-0 items-center text-left transition disabled:cursor-not-allowed disabled:opacity-50",
          isSidebar
            ? "w-full gap-2 rounded-xl px-1.5 py-0.5 hover:bg-white/70"
            : "h-9 w-full max-w-full gap-2 rounded-xl border border-slate-200 bg-white py-0 pr-2 pl-3 text-sm hover:border-slate-300 hover:bg-slate-50 sm:w-auto sm:min-w-[200px] sm:max-w-[280px]",
          !isSidebar && open && "border-primary/40 ring-2 ring-primary/10",
        )}
        title={selectedProject?.name ?? "เลือกโปรเจกต์"}
      >
        {selectedProject ? (
          <>
            <span
              className={cn(
                "shrink-0 rounded-full",
                isSidebar ? "h-2.5 w-2.5" : "h-2.5 w-2.5",
              )}
              style={{
                backgroundColor:
                  themeAccentColor(selectedProject.theme) ||
                  selectedProject.color,
              }}
            />
            <span
              className={cn(
                "min-w-0 flex-1 truncate font-medium text-slate-800",
                isSidebar && "text-sm font-bold tracking-tight text-slate-900",
              )}
            >
              {selectedProject.name}
            </span>
          </>
        ) : (
          <span className="min-w-0 flex-1 text-slate-400">เลือกโปรเจกต์</span>
        )}
        <span
          className={cn(
            "flex shrink-0 items-center justify-center text-slate-400",
            isSidebar ? "h-6 w-6" : "h-7 w-7 rounded-md",
          )}
        >
          <ChevronDown
            className={cn("h-4 w-4 transition", open && "rotate-180")}
          />
        </span>
      </button>

      {isSidebar && selectedProject ? (
        <p className="mt-0.5 truncate px-1.5 text-[11px] text-slate-500">
          {displayProjectDescription(selectedProject.description) || "โปรเจกต์"}
        </p>
      ) : null}

      {open ? (
        <div
          className={cn(
            "absolute overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg",
            isSidebar
              ? "top-full left-0 z-[80] mt-1.5 w-[min(16rem,calc(100vw-2rem))]"
              : "top-full left-0 z-50 mt-1.5 w-[min(18rem,calc(100vw-1.5rem))] sm:w-72",
          )}
        >
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
                  style={{
                    backgroundColor:
                      themeAccentColor(project.theme) || project.color,
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-800">
                    {project.name}
                  </p>
                  {displayProjectDescription(project.description) ? (
                    <p className="truncate text-xs text-slate-500">
                      {displayProjectDescription(project.description)}
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
            {onCreateNew ? (
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
            ) : null}
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
