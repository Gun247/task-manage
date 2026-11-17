import Link from "next/link";
import { ArrowRight, ClipboardList } from "lucide-react";
import { ThemeSwatches } from "@/components/theme-picker";
import { displayProjectDescription } from "@/lib/project-display";
import { themeLabel, themeSwatches } from "@/lib/themes";
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
  const swatches = themeSwatches(project.theme);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-primary/25 hover:shadow-[0_14px_40px_rgba(15,23,42,0.1)]",
        className,
      )}
    >
      <div
        className="flex h-2 w-full overflow-hidden"
        aria-hidden
      >
        {swatches.map((color, index) => (
          <span
            key={`${color}-${index}`}
            className="h-full flex-1"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <ThemeSwatches colors={swatches} />
              <h3 className="truncate text-base font-semibold text-slate-900">
                {project.name}
              </h3>
            </div>
            {displayProjectDescription(project.description) ? (
              <p className="mt-1.5 line-clamp-2 text-sm text-slate-500">
                {displayProjectDescription(project.description)}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-slate-400">
              {themeLabel(project.theme)}
            </p>
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
