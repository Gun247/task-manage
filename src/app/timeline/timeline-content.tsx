"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { TimelineSummaryView } from "@/components/timeline-summary-view";
import { TaskFormDialog } from "@/components/task-form-dialog";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { LoadingCard } from "@/components/ui/loading";
import { fetchJsonArray } from "@/lib/fetch-json";
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
  TagOption,
  Task,
  TaskTypeOption,
  TeamMember,
} from "@/lib/types";
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

export default function TimelinePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectFromUrl = searchParams.get("project") ?? "";

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskTypeOption[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState(projectFromUrl);
  const [range, setRange] = useState<TimelineRangeFilter>("upcoming");
  const [kind, setKind] = useState<TimelineKindFilter>("all");
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [
        tasksData,
        projectsData,
        statusesData,
        prioritiesData,
        membersData,
        taskTypesData,
        tagsData,
      ] = await Promise.all([
        fetchJsonArray<Task>("/api/tasks"),
        fetchJsonArray<Project>("/api/projects"),
        fetchJsonArray<Status>("/api/statuses"),
        fetchJsonArray<Priority>("/api/priorities"),
        fetchJsonArray<TeamMember>("/api/team-members"),
        fetchJsonArray<TaskTypeOption>("/api/task-types"),
        fetchJsonArray<TagOption>("/api/tags"),
      ]);
      setTasks(tasksData);
      setProjects(projectsData);
      setStatuses(statusesData);
      setPriorities(prioritiesData);
      setTeamMembers(membersData);
      setTaskTypes(taskTypesData);
      setTags(tagsData);
    } catch (err) {
      setTasks([]);
      setProjects([]);
      setTags([]);
      setError(err instanceof Error ? err.message : "โหลดสรุป Timeline ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
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
    router.replace(query ? `/timeline?${query}` : "/timeline");
  }

  const scopedTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tasks.filter((task) => {
      if (projectFilter && task.projectId !== projectFilter) return false;
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
  }, [tasks, projectFilter, search]);

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

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Input
              className="h-9 w-full max-w-xs py-0 text-sm leading-9"
              placeholder="ค้นหา task, รายละเอียด, DEV..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
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
            {!loading && !error ? (
              <p className="text-xs text-slate-500">
                {dayCount} วัน · UAT {uatCount} · PRD {prdCount}
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
              <Button type="button" variant="outline" onClick={() => void loadData()}>
                ลองอีกครั้ง
              </Button>
            </div>
          </div>
        ) : loading ? (
          <LoadingCard />
        ) : (
          <TimelineSummaryView
            groups={groups}
            tags={tags}
            onTaskClick={(task) => setEditingTask(task)}
          />
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
        tags={tags}
        projectId={editingTask?.projectId}
        onSaved={() => {
          setEditingTask(null);
          void loadData();
        }}
      />
    </AppShell>
  );
}
