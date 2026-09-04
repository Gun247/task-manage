"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FolderKanban,
  History,
  LayoutDashboard,
  ListTodo,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { LoadingCard } from "@/components/ui/loading";
import { fetchJsonArray } from "@/lib/fetch-json";
import type { Project, Status, Task } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function isTerminalStatus(name: string) {
  return name.toLowerCase() === "done";
}

function isOverdue(task: Task) {
  if (!task.endDate || isTerminalStatus(task.status.name)) return false;
  return new Date(task.endDate) < startOfToday();
}

export default function DashboardPageContent() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [tasksData, projectsData, statusesData] = await Promise.all([
        fetchJsonArray<Task>("/api/tasks"),
        fetchJsonArray<Project>("/api/projects"),
        fetchJsonArray<Status>("/api/statuses"),
      ]);
      setTasks(tasksData);
      setProjects(projectsData);
      setStatuses(statusesData);
    } catch (err) {
      setTasks([]);
      setProjects([]);
      setStatuses([]);
      setError(err instanceof Error ? err.message : "โหลด dashboard ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const overdueTasks = useMemo(() => tasks.filter(isOverdue), [tasks]);
  const doneCount = useMemo(
    () => tasks.filter((task) => isTerminalStatus(task.status.name)).length,
    [tasks],
  );

  const statusCounts = useMemo(
    () =>
      statuses.map((status) => ({
        status,
        count: tasks.filter((task) => task.statusId === status.id).length,
      })),
    [statuses, tasks],
  );

  const projectStats = useMemo(
    () =>
      projects.map((project) => {
        const projectTasks = tasks.filter((task) => task.projectId === project.id);
        return {
          project,
          total: projectTasks.length,
          overdue: projectTasks.filter(isOverdue).length,
          done: projectTasks.filter((task) =>
            isTerminalStatus(task.status.name),
          ).length,
        };
      }),
    [projects, tasks],
  );

  const recentHistory = useMemo(() => {
    return tasks
      .flatMap((task) =>
        (task.statusHistory ?? []).map((entry) => ({
          id: entry.id,
          taskName: task.name,
          projectId: task.projectId,
          projectName: task.project.name,
          fromStatusName: entry.fromStatusName,
          toStatusName: entry.toStatusName,
          changedAt: entry.changedAt,
          isInitial: !entry.fromStatusName,
        })),
      )
      .sort(
        (a, b) =>
          new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime(),
      )
      .slice(0, 8);
  }, [tasks]);

  return (
    <AppShell>
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <LayoutDashboard className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-primary">Dashboard</h1>
              <p className="mt-1 text-sm text-slate-500">
                ภาพรวมงานทุกโปรเจกต์ สถานะ และรายการที่ต้องตาม
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
            {error}
          </div>
        ) : loading ? (
          <LoadingCard />
        ) : (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                icon={<FolderKanban className="h-4 w-4" />}
                label="โปรเจกต์"
                value={projects.length}
                tone="primary"
              />
              <SummaryCard
                icon={<ListTodo className="h-4 w-4" />}
                label="Task ทั้งหมด"
                value={tasks.length}
                tone="slate"
              />
              <SummaryCard
                icon={<CheckCircle2 className="h-4 w-4" />}
                label="เสร็จแล้ว"
                value={doneCount}
                tone="emerald"
              />
              <SummaryCard
                icon={<AlertTriangle className="h-4 w-4" />}
                label="เกินกำหนด"
                value={overdueTasks.length}
                tone={overdueTasks.length > 0 ? "red" : "slate"}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-5">
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-3">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-slate-800">
                    สถานะงาน
                  </h2>
                  <span className="text-xs text-slate-400">
                    {tasks.length} task
                  </span>
                </div>
                <div className="space-y-3">
                  {statusCounts.map(({ status, count }) => {
                    const percent =
                      tasks.length === 0
                        ? 0
                        : Math.round((count / tasks.length) * 100);
                    return (
                      <div key={status.id}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="inline-flex items-center gap-2 text-slate-700">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: status.color }}
                            />
                            {status.name}
                          </span>
                          <span className="font-medium text-slate-900">
                            {count}
                            <span className="ml-1 text-xs font-normal text-slate-400">
                              ({percent}%)
                            </span>
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${percent}%`,
                              backgroundColor: status.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-slate-800">
                    กิจกรรมล่าสุด
                  </h2>
                  <Link
                    href="/history"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    ดูทั้งหมด
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                {recentHistory.length === 0 ? (
                  <div className="rounded-xl bg-slate-50 px-3 py-8 text-center text-sm text-slate-500">
                    <History className="mx-auto mb-2 h-5 w-5 text-slate-300" />
                    ยังไม่มีประวัติการเปลี่ยนสถานะ
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {recentHistory.map((item) => (
                      <li key={item.id} className="text-sm">
                        <p className="truncate font-medium text-slate-800">
                          {item.taskName}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {item.isInitial
                            ? `เริ่มที่ ${item.toStatusName}`
                            : `${item.fromStatusName} → ${item.toStatusName}`}
                          <span className="mx-1 text-slate-300">·</span>
                          {formatDateTime(item.changedAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-800">
                  โปรเจกต์
                </h2>
                <Link
                  href="/projects"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  ดูทั้งหมด
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              {projectStats.length === 0 ? (
                <p className="rounded-xl bg-slate-50 px-3 py-8 text-center text-sm text-slate-500">
                  ยังไม่มีโปรเจกต์
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {projectStats.map(({ project, total, overdue, done }) => (
                    <Link
                      key={project.id}
                      href={`/tasks?project=${project.id}`}
                      className="rounded-xl border border-slate-200 p-4 transition hover:border-primary/30 hover:shadow-sm"
                    >
                      <div className="mb-3 flex items-start gap-2">
                        <span
                          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: project.color }}
                        />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">
                            {project.name}
                          </p>
                          {project.description ? (
                            <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                              {project.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge color="#6BB82A">{total} task</Badge>
                        <Badge color="#16A34A">{done} เสร็จ</Badge>
                        {overdue > 0 ? (
                          <Badge color="#EF4444">{overdue} เกินกำหนด</Badge>
                        ) : null}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {overdueTasks.length > 0 ? (
              <section className="rounded-2xl border border-red-200 bg-red-50/50 p-4">
                <h2 className="mb-3 text-sm font-semibold text-red-700">
                  Task เกินกำหนด
                </h2>
                <ul className="space-y-2">
                  {overdueTasks.slice(0, 6).map((task) => (
                    <li key={task.id}>
                      <Link
                        href={`/tasks?project=${task.projectId}`}
                        className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 text-sm transition hover:shadow-sm"
                      >
                        <span className="min-w-0 truncate font-medium text-slate-800">
                          {task.name}
                        </span>
                        <Badge color={task.status.color}>{task.status.name}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </main>
    </AppShell>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "primary" | "slate" | "emerald" | "red";
}) {
  const tones = {
    primary: {
      wrap: "bg-primary/5",
      icon: "bg-primary text-white",
      label: "text-slate-500",
      value: "text-primary",
    },
    slate: {
      wrap: "bg-slate-50",
      icon: "bg-slate-600 text-white",
      label: "text-slate-500",
      value: "text-slate-800",
    },
    emerald: {
      wrap: "bg-emerald-50",
      icon: "bg-emerald-600 text-white",
      label: "text-emerald-700/70",
      value: "text-emerald-700",
    },
    red: {
      wrap: "bg-red-50",
      icon: "bg-red-500 text-white",
      label: "text-red-700/70",
      value: "text-red-600",
    },
  }[tone];

  return (
    <div className={`rounded-2xl border border-slate-200 p-4 ${tones.wrap}`}>
      <div className="flex items-center gap-3">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${tones.icon}`}
        >
          {icon}
        </span>
        <div>
          <p
            className={`text-[11px] font-medium tracking-wide uppercase ${tones.label}`}
          >
            {label}
          </p>
          <p className={`text-2xl font-bold ${tones.value}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}
