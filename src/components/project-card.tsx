import Link from "next/link";
import { ArrowRight, ClipboardList } from "lucide-react";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  project: Project;
  className?: string;
  showManageLink?: boolean;
}

export function ProjectCard({
  project,
  className,
  showManageLink = false,
}: ProjectCardProps) {
  const taskCount = project._count?.tasks ?? 0;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-primary/30 hover:shadow-md",
        className,
      )}
    >
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: project.color }}
      />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: project.color }}
              />
              <h3 className="truncate text-base font-semibold text-slate-900">
                {project.name}
              </h3>
            </div>
            {project.description ? (
              <p className="mt-1.5 line-clamp-2 text-sm text-slate-500">
                {project.description}
              </p>
            ) : (
              <p className="mt-1.5 text-sm text-slate-400">ไม่มีคำอธิบาย</p>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            <ClipboardList className="h-3.5 w-3.5" />
            {taskCount} task{taskCount !== 1 ? "s" : ""}
          </div>

          <div className="flex items-center gap-2">
            {showManageLink ? (
              <Link
                href="/projects/manage"
                className="text-xs font-medium text-slate-500 hover:text-slate-700"
              >
                จัดการ
              </Link>
            ) : null}
            <Link
              href={`/tasks?project=${project.id}`}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition hover:bg-primary-dark"
            >
              เปิด
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
