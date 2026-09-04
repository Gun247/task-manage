"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, History, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { LoadingCard } from "@/components/ui/loading";
import { fetchJsonArray } from "@/lib/fetch-json";
import type { Project, Status, Task } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";

type HistoryItem = {
  id: string;
  taskId: string;
  taskName: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  priorityLabel: string;
  priorityColor: string;
  assigneeName: string | null;
  assigneeColor: string | null;
  fromStatusName: string;
  toStatusName: string;
  toStatusColor: string;
  changedAt: string;
  isInitial: boolean;
};

function dayKey(iso: string) {
  const date = new Date(iso);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (dayKey(iso) === dayKey(today.toISOString())) return "วันนี้";
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return "เมื่อวาน";

  return date.toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function buildHistoryItems(tasks: Task[], statuses: Status[]): HistoryItem[] {
  const statusColor = new Map(
    statuses.map((status) => [status.name, status.color]),
  );

  return tasks
    .flatMap((task) =>
      (task.statusHistory ?? []).map((entry) => ({
        id: entry.id,
        taskId: task.id,
        taskName: task.name,
        projectId: task.projectId,
        projectName: task.project.name,
        projectColor: task.project.color,
        priorityLabel: task.priority.label,
        priorityColor: task.priority.color,
        assigneeName: task.assignee?.nickname ?? null,
        assigneeColor: task.assignee?.color ?? null,
        fromStatusName: entry.fromStatusName,
        toStatusName: entry.toStatusName,
        toStatusColor:
          statusColor.get(entry.toStatusName) ?? task.status.color ?? "#6B7280",
        changedAt: entry.changedAt,
        isInitial: !entry.fromStatusName,
      })),
    )
    .sort(
      (a, b) =>
        new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime(),
    );
}

export default function HistoryPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectFromUrl = searchParams.get("project") ?? "";

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState(projectFromUrl);
  const [statusFilter, setStatusFilter] = useState("");

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
      setError(err instanceof Error ? err.message : "โหลดประวัติไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setProjectFilter(projectFromUrl);
  }, [projectFromUrl]);

  function handleProjectFilterChange(value: string) {
    setProjectFilter(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("project", value);
    else params.delete("project");
    const query = params.toString();
    router.replace(query ? `/history?${query}` : "/history");
  }

  const historyItems = useMemo(
    () => buildHistoryItems(tasks, statuses),
    [tasks, statuses],
  );

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return historyItems.filter((item) => {
      if (projectFilter && item.projectId !== projectFilter) return false;
      if (statusFilter && item.toStatusName !== statusFilter) return false;
      if (!query) return true;
      return (
        item.taskName.toLowerCase().includes(query) ||
        item.projectName.toLowerCase().includes(query) ||
        item.toStatusName.toLowerCase().includes(query) ||
        item.fromStatusName.toLowerCase().includes(query) ||
        (item.assigneeName?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [historyItems, projectFilter, statusFilter, search]);

  const grouped = useMemo(() => {
    const groups: { key: string; label: string; items: HistoryItem[] }[] = [];
    for (const item of filteredItems) {
      const key = dayKey(item.changedAt);
      const current = groups[groups.length - 1];
      if (current?.key === key) {
        current.items.push(item);
      } else {
        groups.push({ key, label: dayLabel(item.changedAt), items: [item] });
      }
    }
    return groups;
  }, [filteredItems]);

  return (
    <AppShell>
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-6 lg:px-8">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-[#1E3A5F]/10 text-[#1E3A5F]">
              <History className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-[#1E3A5F]">ประวัติ Task</h1>
              <p className="mt-1 text-sm text-slate-500">
                ไทม์ไลน์การเปลี่ยนสถานะของทุก task —
                ดูว่างานถึงขั้นไหนแล้วเมื่อไหร่
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:max-w-xs sm:flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                className="h-9 py-0 pl-8 text-sm leading-9"
                placeholder="ค้นหาชื่อ task, โปรเจกต์, สถานะ..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Select
              className="h-9 w-full py-0 text-sm leading-9 sm:w-44"
              value={projectFilter}
              onChange={(event) => handleProjectFilterChange(event.target.value)}
            >
              <option value="">ทุกโปรเจกต์</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
            <Select
              className="h-9 w-full py-0 text-sm leading-9 sm:w-40"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">ทุกสถานะปลายทาง</option>
              {statuses.map((status) => (
                <option key={status.id} value={status.name}>
                  {status.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-6 lg:px-8">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
            {error}
          </div>
        ) : loading ? (
          <LoadingCard />
        ) : filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <History className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-4 text-base font-semibold text-slate-800">
              ยังไม่มีประวัติ
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              เมื่อสร้าง task หรือเปลี่ยนสถานะ (เช่น Backlog → In Progress)
              ระบบจะประทับเวลาและแสดงที่นี่
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            <p className="text-sm text-slate-500">
              {filteredItems.length} รายการ
            </p>

            {grouped.map((group) => (
              <section key={group.key}>
                <h2 className="mb-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  {group.label}
                </h2>
                <ol className="relative space-y-3 border-l border-slate-200 pl-5">
                  {group.items.map((item) => (
                    <li key={item.id} className="relative">
                      <span
                        className="absolute top-4 -left-[1.4rem] h-2.5 w-2.5 rounded-full ring-4 ring-[#F8FAFC]"
                        style={{ backgroundColor: item.toStatusColor }}
                      />
                      <Link
                        href={`/tasks?project=${item.projectId}`}
                        className={cn(
                          "block rounded-2xl border border-slate-200 bg-white p-4 transition",
                          "hover:border-[#1E3A5F]/25 hover:shadow-sm",
                        )}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <Badge color={item.priorityColor}>
                                {item.priorityLabel}
                              </Badge>
                              <span
                                className="inline-flex items-center gap-1.5 text-xs font-medium"
                                style={{ color: item.projectColor }}
                              >
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{
                                    backgroundColor: item.projectColor,
                                  }}
                                />
                                {item.projectName}
                              </span>
                            </div>
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {item.taskName}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm">
                              {item.isInitial ? (
                                <span className="text-slate-600">
                                  เริ่มที่{" "}
                                  <span className="font-medium text-slate-900">
                                    {item.toStatusName}
                                  </span>
                                </span>
                              ) : (
                                <>
                                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                                    {item.fromStatusName}
                                  </span>
                                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                                  <span
                                    className="rounded-md px-2 py-0.5 text-xs font-medium text-white"
                                    style={{
                                      backgroundColor: item.toStatusColor,
                                    }}
                                  >
                                    {item.toStatusName}
                                  </span>
                                </>
                              )}
                            </div>
                            {item.assigneeName ? (
                              <p
                                className="mt-2 text-xs font-medium"
                                style={{
                                  color: item.assigneeColor ?? "#64748B",
                                }}
                              >
                                {item.assigneeName}
                              </p>
                            ) : null}
                          </div>
                          <time className="shrink-0 text-xs text-slate-500">
                            {formatDateTime(item.changedAt)}
                          </time>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        )}
      </main>
    </AppShell>
  );
}
