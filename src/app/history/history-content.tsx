"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, History, Pencil, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { GlassPanel, PageHeader, PageMain } from "@/components/page-layout";
import { TaskFormDialog } from "@/components/task-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { LoadingCard } from "@/components/ui/loading";
import { fetchJsonArray } from "@/lib/fetch-json";
import {
  isReworkGateStatus,
  postReleaseChangeTypeLabel,
  taskHasPostReleaseRework,
} from "@/lib/post-release-change";
import { themeAccentColor } from "@/lib/themes";
import type {
  Priority,
  Project,
  Status,
  Task,
  TaskTypeOption,
  TeamMember,
} from "@/lib/types";
import { useAfterPaint } from "@/lib/use-after-paint";
import { cn, formatDateTime } from "@/lib/utils";

type HistoryItem = {
  id: string;
  kind: "status" | "postRelease";
  taskId: string;
  taskName: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  priorityLabel: string;
  priorityColor: string;
  assignees: Array<{ nickname: string; color: string }>;
  fromStatusName: string;
  toStatusName: string;
  toStatusColor: string;
  changedAt: string;
  isInitial: boolean;
  hasPostReleaseChanges: boolean;
  isRework: boolean;
  postReleaseLabel?: string;
  postReleaseReason?: string;
  afterMilestone?: string;
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

function taskAssignees(task: Task) {
  return task.assignees?.length > 0
    ? task.assignees.map((member) => ({
        nickname: member.nickname,
        color: member.color,
      }))
    : task.assignee
      ? [
          {
            nickname: task.assignee.nickname,
            color: task.assignee.color,
          },
        ]
      : [];
}

function findMatchingStatusReason(
  task: Task,
  fromStatusName: string,
  toStatusName: string,
  changedAt: string,
) {
  const target = new Date(changedAt).getTime();
  return (task.postReleaseChanges ?? []).find((entry) => {
    if (entry.changeType !== "status") return false;
    if (entry.fromValue !== fromStatusName || entry.toValue !== toStatusName) {
      return false;
    }
    return Math.abs(new Date(entry.changedAt).getTime() - target) < 5000;
  });
}

function buildHistoryItems(tasks: Task[], statuses: Status[]): HistoryItem[] {
  const statusColor = new Map(
    statuses.map((status) => [status.name, status.color]),
  );

  return tasks
    .flatMap((task) => {
      const rework = taskHasPostReleaseRework(task);
      const base = {
        taskId: task.id,
        taskName: task.name,
        projectId: task.projectId,
        projectName: task.project.name,
        projectColor:
          themeAccentColor(task.project.theme) || task.project.color,
        priorityLabel: task.priority.label,
        priorityColor: task.priority.color,
        assignees: taskAssignees(task),
        hasPostReleaseChanges: Boolean(task.hasPostReleaseChanges),
        isRework: rework,
      };

      const matchedStatusReasonIds = new Set<string>();

      const statusItems: HistoryItem[] = (task.statusHistory ?? []).map(
        (entry) => {
          const matched = findMatchingStatusReason(
            task,
            entry.fromStatusName,
            entry.toStatusName,
            entry.changedAt,
          );
          if (matched) matchedStatusReasonIds.add(matched.id);
          return {
            ...base,
            id: entry.id,
            kind: "status" as const,
            fromStatusName: entry.fromStatusName,
            toStatusName: entry.toStatusName,
            toStatusColor:
              statusColor.get(entry.toStatusName) ??
              task.status.color ??
              "#6B7280",
            changedAt: entry.changedAt,
            isInitial: !entry.fromStatusName,
            postReleaseReason: matched?.reason,
            afterMilestone: matched?.afterMilestone,
            isRework:
              rework ||
              isReworkGateStatus(entry.toStatusName) ||
              Boolean(matched),
          };
        },
      );

      // Date-only adjustments (and unmatched status reasons) stay as separate rows.
      const postReleaseItems: HistoryItem[] = (task.postReleaseChanges ?? [])
        .filter(
          (entry) =>
            entry.changeType !== "status" ||
            !matchedStatusReasonIds.has(entry.id),
        )
        .map((entry) => ({
          ...base,
          id: `post-${entry.id}`,
          kind: "postRelease" as const,
          fromStatusName: entry.fromValue,
          toStatusName: entry.toValue,
          toStatusColor: "#D97706",
          changedAt: entry.changedAt,
          isInitial: false,
          postReleaseLabel: postReleaseChangeTypeLabel(entry.changeType),
          postReleaseReason: entry.reason,
          afterMilestone: entry.afterMilestone,
          isRework:
            rework ||
            (entry.changeType === "status" &&
              isReworkGateStatus(entry.toValue)),
        }));

      return [...statusItems, ...postReleaseItems];
    })
    .sort(
      (a, b) =>
        new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime(),
    );
}

export default function HistoryPageContent() {
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [historyScope, setHistoryScope] = useState<
    "all" | "postRelease" | "rework"
  >("all");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  const loadData = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        setError(null);
        const taskUrl = projectFromUrl
          ? `/api/tasks?projectId=${encodeURIComponent(projectFromUrl)}`
          : "/api/tasks";
        const [
          tasksData,
          projectsData,
          statusesData,
          prioritiesData,
          membersData,
          typesData,
        ] = await Promise.all([
          fetchJsonArray<Task>(taskUrl, { signal }),
          fetchJsonArray<Project>("/api/projects", { signal }),
          fetchJsonArray<Status>("/api/statuses", { signal }),
          fetchJsonArray<Priority>("/api/priorities", { signal }),
          fetchJsonArray<TeamMember>("/api/team-members", { signal }),
          fetchJsonArray<TaskTypeOption>("/api/task-types", { signal }),
        ]);
        setTasks(tasksData);
        setProjects(projectsData);
        setStatuses(statusesData);
        setPriorities(prioritiesData);
        setTeamMembers(membersData);
        setTaskTypes(typesData);
        setEditingTask((current) => {
          if (!current) return null;
          return tasksData.find((task) => task.id === current.id) ?? null;
        });
      } catch (err) {
        if (signal?.aborted) return;
        setTasks([]);
        setProjects([]);
        setStatuses([]);
        setPriorities([]);
        setTeamMembers([]);
        setTaskTypes([]);
        setError(err instanceof Error ? err.message : "โหลดประวัติไม่สำเร็จ");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [projectFromUrl],
  );

  useEffect(() => {
    if (!pageReady) return;

    const controller = new AbortController();
    void loadData(controller.signal);
    return () => controller.abort();
  }, [pageReady, loadData]);

  function handleProjectFilterChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("project", value);
    else params.delete("project");
    const query = params.toString();
    router.replace(query ? `/history?${query}` : "/history");
  }

  function openEditTask(taskId: string) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    setEditingTask(task);
    setTaskDialogOpen(true);
  }

  async function handleSaved() {
    await loadData();
  }

  const historyItems = useMemo(
    () => buildHistoryItems(tasks, statuses),
    [tasks, statuses],
  );

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return historyItems.filter((item) => {
      if (projectFromUrl && item.projectId !== projectFromUrl) return false;
      if (historyScope === "postRelease") {
        if (item.kind !== "postRelease" && !item.postReleaseReason) return false;
      }
      if (historyScope === "rework") {
        const isModifyHold = isReworkGateStatus(item.toStatusName);
        if (!isModifyHold && !item.postReleaseReason && item.kind !== "postRelease") {
          return false;
        }
      }
      if (
        statusFilter &&
        item.kind === "status" &&
        item.toStatusName !== statusFilter
      ) {
        return false;
      }
      if (statusFilter && item.kind === "postRelease") return false;
      if (!query) return true;
      return (
        item.taskName.toLowerCase().includes(query) ||
        item.projectName.toLowerCase().includes(query) ||
        item.toStatusName.toLowerCase().includes(query) ||
        item.fromStatusName.toLowerCase().includes(query) ||
        (item.postReleaseLabel ?? "").toLowerCase().includes(query) ||
        (item.postReleaseReason ?? "").toLowerCase().includes(query) ||
        item.assignees.some((member) =>
          member.nickname.toLowerCase().includes(query),
        )
      );
    });
  }, [historyItems, projectFromUrl, statusFilter, historyScope, search]);

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
      <PageHeader
        icon={<History className="h-5 w-5" />}
        title="ประวัติ Task"
        description="ไทม์ไลน์สถานะและการปรับ flow หลังขึ้น UAT/PRD — คลิกรายการเพื่อแก้ไข task ได้ทันที"
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:max-w-xs sm:flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              className="h-9 rounded-lg border-slate-200 bg-white py-0 pl-8 text-sm leading-9"
              placeholder="ค้นหาชื่อ task, โปรเจกต์, สถานะ, เหตุผล..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Select
            className="h-9 w-[calc(50%-0.25rem)] rounded-lg border-slate-200 bg-white py-0 text-sm leading-9 sm:w-44"
            value={projectFromUrl}
            onChange={(event) =>
              handleProjectFilterChange(event.target.value)
            }
          >
            <option value="">ทุกโปรเจกต์</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
          <Select
            className="h-9 w-[calc(50%-0.25rem)] rounded-lg border-slate-200 bg-white py-0 text-sm leading-9 sm:w-40"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            disabled={historyScope !== "all"}
          >
            <option value="">ทุกสถานะปลายทาง</option>
            {statuses.map((status) => (
              <option key={status.id} value={status.name}>
                {status.name}
              </option>
            ))}
          </Select>
          <Select
            className="h-9 w-full rounded-lg border-slate-200 bg-white py-0 text-sm leading-9 sm:w-52"
            value={historyScope}
            onChange={(event) => {
              const value = event.target.value as
                | "all"
                | "postRelease"
                | "rework";
              setHistoryScope(value);
              if (value !== "all") setStatusFilter("");
            }}
          >
            <option value="all">ทุกประเภทประวัติ</option>
            <option value="postRelease">เฉพาะแก้หลังขึ้น</option>
            <option value="rework">เคยเข้า Modify / HOLD</option>
          </Select>
        </div>
      </PageHeader>

      <PageMain width="5xl">
        {error ? (
          <div className="rounded-[1.35rem] border border-red-200 bg-red-50/90 p-6 text-center text-sm text-red-700">
            {error}
          </div>
        ) : loading ? (
          <LoadingCard />
        ) : filteredItems.length === 0 ? (
          <GlassPanel className="border-dashed px-6 py-16 text-center">
            <History className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-4 text-base font-semibold text-slate-800">
              ยังไม่มีประวัติ
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              เมื่อสร้าง task หรือเปลี่ยนสถานะ (เช่น Backlog → In Progress)
              ระบบจะประทับเวลาและแสดงที่นี่
            </p>
          </GlassPanel>
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
                        className="absolute top-4 -left-[1.4rem] h-2.5 w-2.5 rounded-full ring-4 ring-canvas"
                        style={{ backgroundColor: item.toStatusColor }}
                      />
                      <button
                        type="button"
                        onClick={() => openEditTask(item.taskId)}
                        className={cn(
                          "group block w-full rounded-[1.25rem] border bg-white/85 p-4 text-left shadow-[0_6px_20px_rgba(15,23,42,0.04)] backdrop-blur-sm transition",
                          item.kind === "postRelease"
                            ? "border-amber-200/90 hover:border-amber-300 hover:shadow-[0_10px_28px_rgba(15,23,42,0.08)]"
                            : "border-white/80 hover:border-primary/25 hover:shadow-[0_10px_28px_rgba(15,23,42,0.08)]",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
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
                              {item.kind === "postRelease" ||
                              item.postReleaseReason ||
                              item.hasPostReleaseChanges ? (
                                <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-micro font-semibold text-amber-800">
                                  แก้หลังขึ้น
                                  {item.afterMilestone
                                    ? ` · ${item.afterMilestone}`
                                    : ""}
                                </span>
                              ) : null}
                              {isReworkGateStatus(item.toStatusName) ? (
                                <span className="rounded-md bg-violet-50 px-1.5 py-0.5 text-micro font-semibold text-violet-800">
                                  Reopen · {item.toStatusName}
                                </span>
                              ) : null}
                            </div>
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {item.taskName}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm">
                              {item.kind === "postRelease" ? (
                                <>
                                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                    ปรับ {item.postReleaseLabel}
                                  </span>
                                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                                    {item.fromStatusName || "—"}
                                  </span>
                                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                                  <span className="rounded-md bg-amber-500 px-2 py-0.5 text-xs font-medium text-white">
                                    {item.toStatusName || "—"}
                                  </span>
                                </>
                              ) : item.isInitial ? (
                                <span className="text-slate-600">
                                  เริ่มที่{" "}
                                  <span className="font-medium text-slate-900">
                                    {item.toStatusName}
                                  </span>
                                </span>
                              ) : (
                                <>
                                  <span className="text-xs font-medium text-slate-500">
                                    สถานะ
                                  </span>
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
                            {item.postReleaseReason ? (
                              <p className="mt-2 text-xs text-slate-600">
                                เหตุผล: {item.postReleaseReason}
                              </p>
                            ) : null}
                            {item.assignees.length > 0 ? (
                              <p className="mt-2 flex flex-wrap gap-1.5 text-xs font-medium">
                                {item.assignees.map((member) => (
                                  <span
                                    key={member.nickname}
                                    style={{ color: member.color }}
                                  >
                                    {member.nickname}
                                  </span>
                                ))}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <time className="text-xs text-slate-500">
                              {formatDateTime(item.changedAt)}
                            </time>
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-caption font-medium text-slate-500 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100">
                              <Pencil className="h-3 w-3" />
                              แก้ไข
                            </span>
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        )}
      </PageMain>

      <TaskFormDialog
        open={taskDialogOpen}
        onOpenChange={(open) => {
          setTaskDialogOpen(open);
          if (!open) setEditingTask(null);
        }}
        task={editingTask}
        statuses={statuses}
        priorities={priorities}
        teamMembers={teamMembers}
        taskTypes={taskTypes}
        projectId={editingTask?.projectId}
        onSaved={() => void handleSaved()}
      />
    </AppShell>
  );
}
