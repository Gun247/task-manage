"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Settings,
  Plus,
  Search,
  ChevronRight,
  Download,
  Bookmark,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ProjectSwitcher } from "@/components/project-switcher";
import { SessionControls } from "@/components/session-controls";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Input, Select } from "@/components/ui/input";
import { TaskListView } from "@/components/task-list-view";
import { TaskKanbanView } from "@/components/task-kanban-view";
import { TaskCalendarView } from "@/components/task-calendar-view";
import { TaskDashboardBar } from "@/components/task-dashboard-bar";
import { PlanUatImportDialog } from "@/components/plan-uat-import-dialog";
import { TaskFormDialog } from "@/components/task-form-dialog";
import { ProjectFormDialog } from "@/components/project-form-dialog";
import { PostReleaseReasonDialog } from "@/components/post-release-reason-dialog";
import { SettingsDialog } from "@/components/settings-dialog";
import { LoadingCard, LoadingOverlay } from "@/components/ui/loading";
import { fetchJsonArray } from "@/lib/fetch-json";
import { readMemberSession } from "@/lib/current-member";
import {
  HOLD_STATUS_NAME,
  MODIFY_STATUS_NAME,
} from "@/lib/default-statuses";
import {
  getPostReleaseReworkGateError,
  isPostReleaseFlowChange,
} from "@/lib/post-release-change";
import {
  canCreateOrEditTasks,
  canManageSettings,
  canTransitionTasks,
  type MemberRole,
} from "@/lib/roles";
import {
  sortTasks,
  TASK_SORT_OPTIONS,
  type TaskSortMode,
} from "@/lib/task-sort";
import type {
  Priority,
  Project,
  SavedFilter,
  Status,
  Task,
  TaskDateFilterField,
  TaskFilters,
  TaskOverdueFilter,
  TaskTypeOption,
  TeamMember,
  ViewMode,
} from "@/lib/types";
import { cn, isTaskOverdue, taskMatchesDateFilter } from "@/lib/utils";

type FilterScope = "" | "postRelease" | "rework";

const views: { id: ViewMode; label: string }[] = [
  { id: "list", label: "รายการ" },
  { id: "kanban", label: "Kanban" },
  { id: "calendar", label: "ปฏิทิน" },
];

export function TasksPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectFromUrl = searchParams.get("project");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskTypeOption[]>([]);
  const [view, setView] = useState<ViewMode>("list");
  const [filters, setFilters] = useState<TaskFilters>({
    search: "",
    statusId: "",
    priorityId: "",
    assigneeId: "",
    taskType: "",
    date: "",
    dateField: "",
    overdue: "",
  });
  const [filterScope, setFilterScope] = useState<FilterScope>("");
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [selectedSavedFilterId, setSelectedSavedFilterId] = useState("");
  const [sortMode, setSortMode] = useState<TaskSortMode>("default");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sessionRole, setSessionRole] = useState<MemberRole>("member");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [focusCreateTrigger, setFocusCreateTrigger] = useState(0);
  const [createDefaultStatusId, setCreateDefaultStatusId] = useState<
    string | undefined
  >();
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [planUatOpen, setPlanUatOpen] = useState(false);
  const [importMessage, setImportMessage] = useState<{
    text: string;
    tone: "success" | "error";
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [postReleaseStatusChange, setPostReleaseStatusChange] = useState<{
    taskId: string;
    statusId: string;
    taskName: string;
    fromStatusName: string;
    toStatusName: string;
  } | null>(null);
  const [postReleaseSaving, setPostReleaseSaving] = useState(false);

  const loadTasks = useCallback(async (projectId: string) => {
    if (!projectId) {
      setTasks([]);
      return;
    }

    setTasksLoading(true);

    try {
      const response = await fetch(`/api/tasks?projectId=${projectId}`);
      if (!response.ok) {
        setTasks([]);
        return;
      }
      const data = await response.json();
      setTasks(Array.isArray(data) ? data : []);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [
        projectsData,
        statusesData,
        prioritiesData,
        membersData,
        taskTypesData,
      ] = await Promise.all([
          fetchJsonArray<Project>("/api/projects"),
          fetchJsonArray<Status>("/api/statuses"),
          fetchJsonArray<Priority>("/api/priorities"),
          fetchJsonArray<TeamMember>("/api/team-members"),
          fetchJsonArray<TaskTypeOption>("/api/task-types"),
        ]);

      setProjects(projectsData);
      setStatuses(statusesData);
      setPriorities(prioritiesData);
      setTeamMembers(membersData);
      setTaskTypes(taskTypesData);
      return projectsData;
    } catch (err) {
      setProjects([]);
      setStatuses([]);
      setPriorities([]);
      setTeamMembers([]);
      setTaskTypes([]);
      setError(err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ");
      return [] as Project[];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const refreshRole = () => {
      setSessionRole(readMemberSession()?.role ?? "member");
    };
    refreshRole();
    window.addEventListener("fwf-current-member-changed", refreshRole);
    return () =>
      window.removeEventListener("fwf-current-member-changed", refreshRole);
  }, []);

  useEffect(() => {
    loadData().then((projectsData) => {
      if (projectsData.length === 0) return;

      const urlProjectExists = projectsData.some(
        (project) => project.id === projectFromUrl,
      );

      if (urlProjectExists && projectFromUrl) {
        setSelectedProjectId(projectFromUrl);
      } else {
        setSelectedProjectId(projectsData[0].id);
      }
    });
  }, [loadData, projectFromUrl]);

  const loadSavedFilters = useCallback(async (projectId: string) => {
    if (!projectId) {
      setSavedFilters([]);
      return;
    }
    try {
      const response = await fetch(
        `/api/saved-filters?projectId=${encodeURIComponent(projectId)}`,
      );
      if (!response.ok) {
        setSavedFilters([]);
        return;
      }
      setSavedFilters((await response.json()) as SavedFilter[]);
    } catch {
      setSavedFilters([]);
    }
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadTasks(selectedProjectId);
      void loadSavedFilters(selectedProjectId);
      router.replace(`/tasks?project=${selectedProjectId}`, { scroll: false });
    }
  }, [selectedProjectId, loadTasks, loadSavedFilters, router]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId),
    [projects, selectedProjectId],
  );

  const filteredTasks = useMemo(() => {
    const filtered = tasks.filter((task) => {
      if (
        filters.search &&
        !task.name.toLowerCase().includes(filters.search.toLowerCase())
      ) {
        return false;
      }
      if (filters.statusId && task.statusId !== filters.statusId) {
        return false;
      }
      if (filters.priorityId && task.priorityId !== filters.priorityId) {
        return false;
      }
      if (
        filters.assigneeId &&
        !(
          task.assignees?.some((member) => member.id === filters.assigneeId) ||
          task.assigneeId === filters.assigneeId
        )
      ) {
        return false;
      }
      if (
        filters.taskType &&
        !(
          task.taskTypes?.includes(filters.taskType) ||
          task.taskType === filters.taskType
        )
      ) {
        return false;
      }
      if (
        view === "list" &&
        !taskMatchesDateFilter(task, filters.date, filters.dateField)
      ) {
        return false;
      }
      if (filters.overdue === "overdue" && !isTaskOverdue(task)) {
        return false;
      }
      if (filterScope === "postRelease" && !task.hasPostReleaseChanges) {
        return false;
      }
      if (filterScope === "rework") {
        const name = task.status?.name ?? "";
        if (
          name !== MODIFY_STATUS_NAME &&
          name !== HOLD_STATUS_NAME
        ) {
          return false;
        }
      }
      return true;
    });

    return sortTasks(filtered, sortMode, statuses);
  }, [tasks, filters, filterScope, sortMode, statuses, view]);

  function applySavedFilter(saved: SavedFilter) {
    const next = saved.filters;
    setFilters({
      search: next.search ?? "",
      statusId: next.statusId ?? "",
      priorityId: next.priorityId ?? "",
      assigneeId: next.assigneeId ?? "",
      taskType: next.taskType ?? "",
      date: next.date ?? "",
      dateField: (next.dateField ?? "") as TaskDateFilterField,
      overdue: (next.overdue ?? "") as TaskOverdueFilter,
    });
    setFilterScope((next.scope as FilterScope) || "");
    setSelectedSavedFilterId(saved.id);
  }

  async function handleSaveCurrentFilter() {
    if (!selectedProjectId) return;
    const name = window.prompt("ชื่อฟิลเตอร์ที่บันทึก");
    if (!name?.trim()) return;
    const response = await fetch("/api/saved-filters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        projectId: selectedProjectId,
        filters: { ...filters, scope: filterScope },
      }),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      window.alert(data?.error ?? "บันทึกฟิลเตอร์ไม่สำเร็จ");
      return;
    }
    const saved = (await response.json()) as SavedFilter;
    setSavedFilters((current) => [saved, ...current]);
    setSelectedSavedFilterId(saved.id);
  }

  async function handleDeleteSavedFilter() {
    if (!selectedSavedFilterId) return;
    const response = await fetch(
      `/api/saved-filters/${selectedSavedFilterId}`,
      { method: "DELETE" },
    );
    if (!response.ok) {
      window.alert("ลบฟิลเตอร์ไม่สำเร็จ");
      return;
    }
    setSavedFilters((current) =>
      current.filter((item) => item.id !== selectedSavedFilterId),
    );
    setSelectedSavedFilterId("");
  }

  async function applyStatusChange(
    taskId: string,
    statusId: string,
    previous: Task,
    nextStatus: Status,
    postReleaseReason?: string,
  ) {
    const changedAt = new Date().toISOString();
    setImportMessage(null);
    setTasks((current) =>
      current.map((task) => {
        if (task.id !== taskId) return task;
        return {
          ...task,
          statusId,
          status: nextStatus,
          statusHistory: [
            ...(task.statusHistory ?? []),
            {
              id: `temp-${changedAt}`,
              taskId,
              fromStatusId: task.statusId,
              fromStatusName: task.status.name,
              toStatusId: statusId,
              toStatusName: nextStatus.name,
              changedAt,
            },
          ],
        };
      }),
    );

    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        statusId,
        ...(postReleaseReason ? { postReleaseReason } : {}),
      }),
    });

    if (response.ok) {
      const updated = (await response.json()) as Task;
      setTasks((current) =>
        current.map((task) => (task.id === taskId ? updated : task)),
      );
      setEditingTask((current) =>
        current?.id === taskId ? updated : current,
      );
      return true;
    }

    await loadData();
    setImportMessage({
      tone: "error",
      text: `บันทึกสถานะของ "${previous.name}" ไม่สำเร็จ — คืนค่าเดิมแล้ว`,
    });
    return false;
  }

  async function handleStatusChange(taskId: string, statusId: string) {
    if (!canTransitionTasks(sessionRole)) {
      setImportMessage({
        tone: "error",
        text: "Role Viewer ไม่สามารถเปลี่ยนสถานะได้",
      });
      return;
    }
    const previous = tasks.find((task) => task.id === taskId);
    const nextStatus = statuses.find((item) => item.id === statusId);
    if (!previous || !nextStatus || previous.statusId === statusId) return;

    const gateError = getPostReleaseReworkGateError({
      task: previous,
      nextStatusName: nextStatus.name,
      statusChanged: true,
    });
    if (gateError) {
      setImportMessage({ tone: "error", text: gateError });
      return;
    }

    if (
      isPostReleaseFlowChange({
        task: previous,
        nextStatusId: statusId,
        statusProvided: true,
      })
    ) {
      setPostReleaseStatusChange({
        taskId,
        statusId,
        taskName: previous.name,
        fromStatusName: previous.status.name,
        toStatusName: nextStatus.name,
      });
      return;
    }

    await applyStatusChange(taskId, statusId, previous, nextStatus);
  }

  function openEditTask(task: Task) {
    setEditingTask(task);
    setCreateDefaultStatusId(undefined);
    setTaskDialogOpen(true);
  }

  function openCreateTask(statusId?: string) {
    if (!canCreateOrEditTasks(sessionRole)) {
      setImportMessage({
        tone: "error",
        text: "Role Viewer ไม่สามารถสร้าง task ได้",
      });
      return;
    }
    setEditingTask(null);
    setCreateDefaultStatusId(statusId ?? statuses[0]?.id);
    setTaskDialogOpen(true);
  }

  function focusCreateTask(statusId?: string) {
    if (!canCreateOrEditTasks(sessionRole)) {
      setImportMessage({
        tone: "error",
        text: "Role Viewer ไม่สามารถสร้าง task ได้",
      });
      return;
    }
    if (view === "kanban") {
      openCreateTask(statusId);
      return;
    }
    if (view !== "list") {
      setView("list");
    }
    setFocusCreateTrigger((current) => current + 1);
  }

  async function handleProjectCreated(projectId: string) {
    await loadData();
    setSelectedProjectId(projectId);
  }

  async function handleSaved() {
    if (!selectedProjectId) return;
    const response = await fetch(`/api/tasks?projectId=${selectedProjectId}`);
    if (!response.ok) return;
    const data = await response.json();
    const nextTasks = Array.isArray(data) ? (data as Task[]) : [];
    setTasks(nextTasks);
    setEditingTask((current) =>
      current
        ? (nextTasks.find((task) => task.id === current.id) ?? null)
        : current,
    );
  }

  function handlePlanUatImported(message: string) {
    setImportMessage({ tone: "success", text: message });
    void handleSaved();
  }

  function handleTaskUpdated(updated: Task) {
    setTasks((current) =>
      current.map((task) => (task.id === updated.id ? updated : task)),
    );
    setEditingTask((current) =>
      current?.id === updated.id ? updated : current,
    );
  }

  return (
    <AppShell>
      <div
        className={cn(
          (view === "kanban" || view === "list" || view === "calendar") &&
            "flex h-full min-h-0 flex-col overflow-hidden",
        )}
      >
      <div className="shrink-0 border-b border-slate-200 bg-white">
        <div className="w-full px-4 py-3 lg:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <nav className="mb-1 flex items-center gap-1 text-xs text-slate-500">
                <Link href="/projects" className="hover:text-primary">
                  โปรเจกต์
                </Link>
                <ChevronRight className="h-3 w-3" />
                <span className="truncate font-medium text-slate-700">
                  {selectedProject?.name ?? "Task"}
                </span>
              </nav>

              <div className="flex flex-wrap items-center gap-3">
                <ProjectSwitcher
                  projects={projects}
                  selectedProjectId={selectedProjectId}
                  onSelect={setSelectedProjectId}
                  onCreateNew={
                    canManageSettings(sessionRole)
                      ? () => setProjectDialogOpen(true)
                      : undefined
                  }
                />
                {selectedProject?.description ? (
                  <p className="hidden text-sm text-slate-500 lg:block">
                    {selectedProject.description}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="inline-flex h-9 items-center rounded-lg bg-slate-100 p-0.5">
                {views.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setView(item.id)}
                    className={cn(
                      "inline-flex h-full items-center rounded-md px-3 text-sm font-medium transition sm:px-3.5",
                      view === item.id
                        ? "bg-white text-primary shadow-sm"
                        : "text-slate-500 hover:text-slate-700",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="hidden h-5 w-px shrink-0 bg-slate-200 sm:block" aria-hidden />

              <div className="flex items-center gap-0.5">
                {canCreateOrEditTasks(sessionRole) ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 rounded-lg px-2.5 text-sm text-slate-600"
                    onClick={() => {
                      setImportMessage(null);
                      setPlanUatOpen(true);
                    }}
                    disabled={!selectedProjectId}
                    title="ดึงจาก Plan UAT"
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden lg:inline">Plan UAT</span>
                  </Button>
                ) : null}
                {canManageSettings(sessionRole) ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 rounded-lg px-2.5 text-sm text-slate-600"
                    onClick={() => setSettingsOpen(true)}
                    title="Settings · WIP"
                  >
                    <Settings className="h-4 w-4" />
                    <span className="hidden lg:inline">Settings</span>
                  </Button>
                ) : null}
              </div>

              <div className="hidden h-5 w-px shrink-0 bg-slate-200 sm:block" aria-hidden />

              <SessionControls />

              {canCreateOrEditTasks(sessionRole) ? (
                <Button
                  type="button"
                  className="h-9 rounded-lg px-3 text-sm shadow-sm"
                  onClick={() => focusCreateTask()}
                  disabled={!selectedProjectId}
                >
                  <Plus className="h-4 w-4" />
                  New Task
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-52 lg:flex-1 lg:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                className="h-9 py-0 pl-8 text-sm leading-9"
                placeholder="ค้นหา task..."
                value={filters.search}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    search: event.target.value,
                  }))
                }
              />
            </div>
            <Select
              className="h-9 w-full py-0 text-sm leading-9 sm:w-36"
              value={filters.statusId}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  statusId: event.target.value,
                }))
              }
            >
              <option value="">สถานะ</option>
              {statuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </Select>
            <Select
              className="h-9 w-full py-0 text-sm leading-9 sm:w-32"
              value={filters.priorityId}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  priorityId: event.target.value,
                }))
              }
            >
              <option value="">Priority</option>
              {priorities.map((priority) => (
                <option key={priority.id} value={priority.id}>
                  {priority.label}
                </option>
              ))}
            </Select>
            <Select
              className="h-9 w-full py-0 text-sm leading-9 sm:w-32"
              value={filters.assigneeId}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  assigneeId: event.target.value,
                }))
              }
            >
              <option value="">Assignee</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.nickname}
                </option>
              ))}
            </Select>
            <Select
              className="h-9 w-full py-0 text-sm leading-9 sm:w-32"
              value={filters.taskType}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  taskType: event.target.value,
                }))
              }
            >
              <option value="">Type</option>
              {taskTypes.map((type) => (
                <option key={type.id} value={type.name}>
                  {type.name}
                </option>
              ))}
            </Select>
            {view === "list" ? (
              <>
                <Select
                  className="h-9 w-full py-0 text-sm leading-9 sm:w-40"
                  value={filters.dateField}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      dateField: event.target.value as TaskDateFilterField,
                    }))
                  }
                >
                  <option value="">ทุกวันที่</option>
                  <option value="startDate">Start</option>
                  <option value="endDate">End</option>
                  <option value="uatDate">Timeline UAT</option>
                  <option value="prdDate">Timeline PRD</option>
                </Select>
                <DateInput
                  compact
                  aria-label="กรองวันที่"
                  className="h-9 w-full sm:w-40"
                  value={filters.date}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      date: event.target.value,
                    }))
                  }
                />
              </>
            ) : null}
            <Select
              className="h-9 w-full py-0 text-sm leading-9 sm:w-36"
              value={filters.overdue}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  overdue: event.target.value as TaskOverdueFilter,
                }))
              }
            >
              <option value="">กำหนดส่ง</option>
              <option value="overdue">เกินกำหนด</option>
            </Select>
            <Select
              className="h-9 w-full py-0 text-sm leading-9 sm:w-40"
              value={filterScope}
              onChange={(event) =>
                setFilterScope(event.target.value as FilterScope)
              }
            >
              <option value="">ขอบเขต</option>
              <option value="postRelease">เคยปรับหลังขึ้น</option>
              <option value="rework">Modify / HOLD</option>
            </Select>
            <Select
              className="h-9 w-full py-0 text-sm leading-9 sm:w-auto sm:min-w-[11rem]"
              value={sortMode}
              onChange={(event) =>
                setSortMode(event.target.value as TaskSortMode)
              }
            >
              {TASK_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select
              className="h-9 w-full py-0 text-sm leading-9 sm:w-44"
              value={selectedSavedFilterId}
              onChange={(event) => {
                const id = event.target.value;
                setSelectedSavedFilterId(id);
                const saved = savedFilters.find((item) => item.id === id);
                if (saved) applySavedFilter(saved);
              }}
            >
              <option value="">Saved filter</option>
              {savedFilters.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => void handleSaveCurrentFilter()}
              disabled={!selectedProjectId}
              title="บันทึกฟิลเตอร์ปัจจุบัน"
            >
              <Bookmark className="h-3.5 w-3.5" />
              บันทึก
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 px-2 text-slate-500"
              onClick={() => void handleDeleteSavedFilter()}
              disabled={!selectedSavedFilterId}
              title="ลบ saved filter ที่เลือก"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <main
        className={cn(
          "relative w-full px-4 py-6 lg:px-6",
          (view === "kanban" || view === "list" || view === "calendar") &&
            "flex min-h-0 flex-1 flex-col overflow-hidden py-4",
        )}
      >
        {importMessage ? (
          <div
            className={cn(
              "mb-4 flex shrink-0 items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm",
              importMessage.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-900",
            )}
          >
            <p>{importMessage.text}</p>
            <button
              type="button"
              className="shrink-0 text-xs font-medium underline-offset-2 hover:underline"
              onClick={() => setImportMessage(null)}
            >
              ปิด
            </button>
          </div>
        ) : null}
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
            {error}
          </div>
        ) : loading ? (
          <LoadingCard />
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <h3 className="text-base font-semibold text-slate-800">
              ยังไม่มีโปรเจกต์
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              สร้างโปรเจกต์แรกเพื่อเริ่มจัดการ task
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button type="button" onClick={() => setProjectDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                สร้างโปรเจกต์ใหม่
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/projects">ดูโปรเจกต์ทั้งหมด</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "relative min-h-[280px] space-y-4",
              (view === "kanban" || view === "list" || view === "calendar") &&
                "flex min-h-0 flex-1 flex-col",
            )}
          >
            <TaskDashboardBar
              tasks={tasks}
              statuses={statuses}
              overdueActive={filters.overdue === "overdue"}
              onOverdueClick={() =>
                setFilters((current) => ({
                  ...current,
                  overdue:
                    current.overdue === "overdue" ? "" : "overdue",
                }))
              }
              activeStatusId={filters.statusId}
              onStatusClick={(statusId) =>
                setFilters((current) => ({
                  ...current,
                  statusId:
                    current.statusId === statusId ? "" : statusId,
                }))
              }
              className={
                view === "kanban" || view === "list" || view === "calendar"
                  ? "shrink-0"
                  : undefined
              }
            />
            {tasksLoading ? (
              <LoadingOverlay label="กำลังโหลด task..." />
            ) : null}
            {view === "list" ? (
              <div className="min-h-0 flex-1 overflow-hidden">
                <TaskListView
                  tasks={filteredTasks}
                  statuses={statuses}
                  priorities={priorities}
                  teamMembers={teamMembers}
                  taskTypes={taskTypes}
                  projectId={selectedProjectId}
                  onEditTask={openEditTask}
                  onStatusChange={handleStatusChange}
                  onTaskUpdated={handleTaskUpdated}
                  onSaved={handleSaved}
                  focusCreateTrigger={focusCreateTrigger}
                />
              </div>
            ) : view === "kanban" ? (
              <div className="min-h-0 flex-1 overflow-hidden">
                <TaskKanbanView
                  tasks={filteredTasks}
                  statuses={statuses}
                  wipLimits={selectedProject?.wipLimits ?? {}}
                  onStatusChange={handleStatusChange}
                  onEditTask={openEditTask}
                  onStartCreate={openCreateTask}
                />
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-hidden">
                <TaskCalendarView
                  tasks={filteredTasks}
                  taskTypes={taskTypes}
                  onEditTask={openEditTask}
                />
              </div>
            )}
          </div>
        )}
      </main>
      </div>

      <PlanUatImportDialog
        open={planUatOpen}
        onOpenChange={setPlanUatOpen}
        projectId={selectedProjectId}
        statuses={statuses}
        onImported={handlePlanUatImported}
      />

      <ProjectFormDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        onSaved={handleProjectCreated}
      />

      <TaskFormDialog
        open={taskDialogOpen}
        onOpenChange={(open) => {
          setTaskDialogOpen(open);
          if (!open) {
            setEditingTask(null);
            setCreateDefaultStatusId(undefined);
          }
        }}
        task={editingTask}
        statuses={statuses}
        priorities={priorities}
        teamMembers={teamMembers}
        taskTypes={taskTypes}
        projectTasks={tasks}
        projectId={selectedProjectId}
        defaultStatusId={createDefaultStatusId}
        onSaved={handleSaved}
      />

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        statuses={statuses}
        teamMembers={teamMembers}
        priorities={priorities}
        taskTypes={taskTypes}
        project={selectedProject}
        onChanged={async () => {
          await loadData();
          await handleSaved();
        }}
      />

      <PostReleaseReasonDialog
        open={Boolean(postReleaseStatusChange)}
        onOpenChange={(open) => {
          if (postReleaseSaving) return;
          if (!open) setPostReleaseStatusChange(null);
        }}
        loading={postReleaseSaving}
        summary={
          postReleaseStatusChange
            ? `${postReleaseStatusChange.taskName}: ${postReleaseStatusChange.fromStatusName} → ${postReleaseStatusChange.toStatusName}`
            : undefined
        }
        onConfirm={async (reason) => {
          if (!postReleaseStatusChange) return;
          const previous = tasks.find(
            (task) => task.id === postReleaseStatusChange.taskId,
          );
          const nextStatus = statuses.find(
            (item) => item.id === postReleaseStatusChange.statusId,
          );
          if (!previous || !nextStatus) {
            setPostReleaseStatusChange(null);
            return;
          }
          setPostReleaseSaving(true);
          try {
            const ok = await applyStatusChange(
              postReleaseStatusChange.taskId,
              postReleaseStatusChange.statusId,
              previous,
              nextStatus,
              reason,
            );
            if (ok) setPostReleaseStatusChange(null);
          } finally {
            setPostReleaseSaving(false);
          }
        }}
      />
    </AppShell>
  );
}
