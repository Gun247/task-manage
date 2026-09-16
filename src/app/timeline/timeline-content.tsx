"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarRange, FolderKanban, ListFilter, Zap } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { TimelineSummaryView } from "@/components/timeline-summary-view";
import { TaskFormDialog } from "@/components/task-form-dialog";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { LoadingCard, LoadingOverlay } from "@/components/ui/loading";
import { fetchJson, fetchJsonArray } from "@/lib/fetch-json";
import {
  buildTimelineDayGroups,
  filterTimelineGroups,
  type TimelineKindFilter,
  type TimelineRangeFilter,
} from "@/lib/timeline-summary";
import type {
  Priority,
  Project,
  Status,
  Task,
  TaskTypeOption,
  TeamMember,
} from "@/lib/types";
import { useAfterPaint } from "@/lib/use-after-paint";
import { cn } from "@/lib/utils";

const RANGE_OPTIONS: { value: TimelineRangeFilter; label: string }[] = [
  { value: "upcoming", label: "กำลังจะถึง" },
  { value: "all", label: "ทุกวัน" },
  { value: "past", label: "ที่ผ่านมา" },
];

const KIND_OPTIONS: { value: TimelineKindFilter; label: string }[] = [
  { value: "all", label: "UAT + PRD" },
  { value: "uat", label: "เฉพาะ UAT" },
  { value: "prd", label: "เฉพาะ PRD" },
];

function StatValue({
  loading,
  value,
}: {
  loading: boolean;
  value: number;
}) {
  if (loading) {
    return <p className="mt-1 text-lg font-semibold text-slate-300">—</p>;
  }
  return <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>;
}

export default function TimelinePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectFromUrl = searchParams.get("project") ?? "";
  const pageReady = useAfterPaint();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskTypeOption[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState(projectFromUrl);
  const [range, setRange] = useState<TimelineRangeFilter>("upcoming");
  const [kind, setKind] = useState<TimelineKindFilter>("all");
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    setProjectFilter(projectFromUrl);
  }, [projectFromUrl]);

  useEffect(() => {
    if (!pageReady) return;

    const controller = new AbortController();

    async function loadProjects() {
      setProjectsLoading(true);
      try {
        setError(null);
        const projectsData = await fetchJsonArray<Project>("/api/projects", {
          signal: controller.signal,
        });
        setProjects(projectsData);
      } catch (err) {
        if (controller.signal.aborted) return;
        setProjects([]);
        setError(
          err instanceof Error ? err.message : "โหลดสรุป Timeline ไม่สำเร็จ",
        );
      } finally {
        if (!controller.signal.aborted) setProjectsLoading(false);
      }
    }

    void loadProjects();
    return () => controller.abort();
  }, [pageReady]);

  useEffect(() => {
    if (!pageReady) return;

    const controller = new AbortController();

    async function loadTasks() {
      setTasksLoading(true);
      try {
        setError(null);
        const params = new URLSearchParams();
        if (projectFilter) params.set("projectId", projectFilter);
        const query = params.toString();
        const tasksData = await fetchJsonArray<Task>(
          query ? `/api/timeline/tasks?${query}` : "/api/timeline/tasks",
          { signal: controller.signal },
        );
        setTasks(tasksData);
      } catch (err) {
        if (controller.signal.aborted) return;
        setTasks([]);
        setError(
          err instanceof Error ? err.message : "โหลดสรุป Timeline ไม่สำเร็จ",
        );
      } finally {
        if (!controller.signal.aborted) setTasksLoading(false);
      }
    }

    void loadTasks();
    return () => controller.abort();
  }, [pageReady, projectFilter]);

  const reloadTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      setError(null);
      const params = new URLSearchParams();
      if (projectFilter) params.set("projectId", projectFilter);
      const query = params.toString();
      const tasksData = await fetchJsonArray<Task>(
        query ? `/api/timeline/tasks?${query}` : "/api/timeline/tasks",
      );
      setTasks(tasksData);
    } catch (err) {
      setTasks([]);
      setError(err instanceof Error ? err.message : "โหลดสรุป Timeline ไม่สำเร็จ");
    } finally {
      setTasksLoading(false);
    }
  }, [projectFilter]);

  const ensureEditorData = useCallback(async () => {
    if (editorReady) return;
    const [statusesData, prioritiesData, membersData, taskTypesData] =
      await Promise.all([
        fetchJsonArray<Status>("/api/statuses"),
        fetchJsonArray<Priority>("/api/priorities"),
        fetchJsonArray<TeamMember>("/api/team-members"),
        fetchJsonArray<TaskTypeOption>("/api/task-types"),
      ]);
    setStatuses(statusesData);
    setPriorities(prioritiesData);
    setTeamMembers(membersData);
    setTaskTypes(taskTypesData);
    setEditorReady(true);
  }, [editorReady]);

  function handleProjectFilterChange(value: string) {
    setProjectFilter(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("project", value);
    else params.delete("project");
    const query = params.toString();
    router.replace(query ? `/timeline?${query}` : "/timeline");
  }

  const scopedTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tasks.filter((task) => {
      if (!query) return true;
      const assigneeNames = (task.assignees?.length
        ? task.assignees
        : task.assignee
          ? [task.assignee]
          : []
      )
        .map((member) => member.nickname)
        .join(" ");
      return (
        task.name.toLowerCase().includes(query) ||
        (task.description ?? "").toLowerCase().includes(query) ||
        assigneeNames.toLowerCase().includes(query)
      );
    });
  }, [tasks, search]);

  const groups = useMemo(
    () =>
      filterTimelineGroups(buildTimelineDayGroups(scopedTasks), {
        kind,
        range,
      }),
    [scopedTasks, kind, range],
  );

  const dayCount = groups.length;
  const uatCount = groups.reduce((sum, group) => sum + group.uatTasks.length, 0);
  const prdCount = groups.reduce((sum, group) => sum + group.prdTasks.length, 0);
  const statsLoading = !pageReady || (tasksLoading && tasks.length === 0);

  async function openTask(task: Task) {
    setEditorLoading(true);
    setError(null);
    try {
      await ensureEditorData();
      const fullTask = await fetchJson<Task>(`/api/tasks/${task.id}`);
      setEditingTask(fullTask);
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลด task ไม่สำเร็จ");
    } finally {
      setEditorLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarRange className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-primary">สรุป Timeline</h1>
              <p className="mt-1 text-sm text-slate-500">
                แสดงเฉพาะวันที่ตั้ง Timeline UAT หรือ PRD ไว้ — จัดกลุ่มรายวันให้อ่านและคัดลอกง่าย
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                className="h-9 w-full max-w-xs py-0 text-sm leading-9"
                placeholder="ค้นหา task, รายละเอียด, DEV..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <Select
                className="h-9 w-full py-0 text-sm leading-9 sm:w-52"
                value={projectFilter}
                onChange={(event) => handleProjectFilterChange(event.target.value)}
                disabled={projectsLoading && projects.length === 0}
              >
                <option value="">ทุกโปรเจกต์</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                  <CalendarRange className="h-3.5 w-3.5" />
                  วันใน timeline
                </p>
                <StatValue loading={statsLoading} value={dayCount} />
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="flex items-center gap-1 text-[11px] font-medium text-amber-700">
                  <ListFilter className="h-3.5 w-3.5" />
                  UAT
                </p>
                <StatValue loading={statsLoading} value={uatCount} />
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                <p className="flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                  <Zap className="h-3.5 w-3.5" />
                  PRD
                </p>
                <StatValue loading={statsLoading} value={prdCount} />
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRange(option.value)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition",
                    range === option.value
                      ? "bg-white text-primary shadow-sm"
                      : "text-slate-500 hover:text-slate-700",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
              {KIND_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setKind(option.value)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition",
                    kind === option.value
                      ? "bg-white text-primary shadow-sm"
                      : "text-slate-500 hover:text-slate-700",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {!statsLoading && !error ? (
              <p className="text-xs text-slate-500">
                <FolderKanban className="mr-1 inline h-3.5 w-3.5" />
                {tasks.length} task ที่มี timeline
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
            {error}
            <div className="mt-3">
              <Button type="button" variant="outline" onClick={() => void reloadTasks()}>
                ลองอีกครั้ง
              </Button>
            </div>
          </div>
        ) : statsLoading ? (
          <LoadingCard label="กำลังโหลด timeline..." />
        ) : (
          <div className="relative">
            {tasksLoading || editorLoading ? (
              <LoadingOverlay
                label={
                  editorLoading
                    ? "กำลังโหลดรายละเอียด task..."
                    : "กำลังอัปเดต timeline..."
                }
              />
            ) : null}
            <TimelineSummaryView
              groups={groups}
              onTaskClick={(task) => void openTask(task)}
            />
          </div>
        )}
      </main>

      <TaskFormDialog
        open={Boolean(editingTask)}
        onOpenChange={(open) => {
          if (!open) setEditingTask(null);
        }}
        task={editingTask}
        statuses={statuses}
        priorities={priorities}
        teamMembers={teamMembers}
        taskTypes={taskTypes}
        projectId={editingTask?.projectId}
        onSaved={() => {
          setEditingTask(null);
          void reloadTasks();
        }}
      />
    </AppShell>
  );
}
