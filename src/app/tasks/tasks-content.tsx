"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Settings, Plus, Search, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ProjectSwitcher } from "@/components/project-switcher";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { TaskListView } from "@/components/task-list-view";
import { TaskKanbanView } from "@/components/task-kanban-view";
import { TaskCalendarView } from "@/components/task-calendar-view";
import { TaskDashboardBar } from "@/components/task-dashboard-bar";
import { TaskFormDialog } from "@/components/task-form-dialog";
import { ProjectFormDialog } from "@/components/project-form-dialog";
import { SettingsDialog } from "@/components/settings-dialog";
import { LoadingCard, LoadingOverlay } from "@/components/ui/loading";
import { fetchJsonArray } from "@/lib/fetch-json";
import {
  sortTasks,
  TASK_SORT_OPTIONS,
  type TaskSortMode,
} from "@/lib/task-sort";
import type {
  Priority,
  Project,
  Status,
  Task,
  TaskFilters,
  TaskTypeOption,
  TeamMember,
  ViewMode,
} from "@/lib/types";
import { cn } from "@/lib/utils";

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
    priorityId: "",
    assigneeId: "",
    taskType: "",
  });
  const [sortMode, setSortMode] = useState<TaskSortMode>("default");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [focusCreateTrigger, setFocusCreateTrigger] = useState(0);
  const [creatingInStatusId, setCreatingInStatusId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (selectedProjectId) {
      loadTasks(selectedProjectId);
      router.replace(`/tasks?project=${selectedProjectId}`, { scroll: false });
    }
  }, [selectedProjectId, loadTasks, router]);

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
      return true;
    });

    return sortTasks(filtered, sortMode, statuses);
  }, [tasks, filters, sortMode, statuses]);

  async function handleStatusChange(taskId: string, statusId: string) {
    const changedAt = new Date().toISOString();
    setTasks((current) =>
      current.map((task) => {
        if (task.id !== taskId) return task;
        const status = statuses.find((item) => item.id === statusId);
        if (!status || task.statusId === statusId) return task;
        return {
          ...task,
          statusId,
          status,
          statusHistory: [
            ...(task.statusHistory ?? []),
            {
              id: `temp-${changedAt}`,
              taskId,
              fromStatusId: task.statusId,
              fromStatusName: task.status.name,
              toStatusId: statusId,
              toStatusName: status.name,
              changedAt,
            },
          ],
        };
      }),
    );

    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statusId }),
    });

    if (response.ok) {
      const updated = (await response.json()) as Task;
      setTasks((current) =>
        current.map((task) => (task.id === taskId ? updated : task)),
      );
      setEditingTask((current) =>
        current?.id === taskId ? updated : current,
      );
    } else {
      await loadData();
    }
  }

  function openEditTask(task: Task) {
    setEditingTask(task);
    setTaskDialogOpen(true);
  }

  function focusCreateTask(statusId?: string) {
    if (view === "kanban") {
      setCreatingInStatusId(statusId ?? statuses[0]?.id ?? null);
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
      current ? (nextTasks.find((task) => task.id === current.id) ?? current) : current,
    );
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
      <div className="border-b border-slate-200 bg-white">
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
                  onCreateNew={() => setProjectDialogOpen(true)}
                />
                {selectedProject?.description ? (
                  <p className="hidden text-sm text-slate-500 lg:block">
                    {selectedProject.description}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex h-9 items-center rounded-lg bg-slate-100 p-0.5">
                {views.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setView(item.id)}
                    className={cn(
                      "inline-flex h-full items-center rounded-md px-3 text-sm font-medium transition sm:px-4",
                      view === item.id
                        ? "bg-white text-primary shadow-sm"
                        : "text-slate-500 hover:text-slate-700",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-lg px-3 text-sm"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </Button>
              <Button
                type="button"
                className="h-9 rounded-lg px-3 text-sm"
                onClick={() => focusCreateTask()}
                disabled={!selectedProjectId}
              >
                <Plus className="h-4 w-4" />
                New Task
              </Button>
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
          </div>
        </div>
      </div>

      <main className="relative w-full px-4 py-6 lg:px-6">
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
          <div className="relative min-h-[280px] space-y-4">
            <TaskDashboardBar tasks={tasks} statuses={statuses} />
            {tasksLoading ? (
              <LoadingOverlay label="กำลังโหลด task..." />
            ) : null}
            {view === "list" ? (
              <TaskListView
                tasks={filteredTasks}
                statuses={statuses}
                priorities={priorities}
                teamMembers={teamMembers}
                taskTypes={taskTypes}
                projectId={selectedProjectId}
                onEditTask={openEditTask}
                onTaskUpdated={handleTaskUpdated}
                onSaved={handleSaved}
                focusCreateTrigger={focusCreateTrigger}
              />
            ) : view === "kanban" ? (
              <TaskKanbanView
                tasks={filteredTasks}
                statuses={statuses}
                priorities={priorities}
                teamMembers={teamMembers}
                taskTypes={taskTypes}
                projectId={selectedProjectId}
                onStatusChange={handleStatusChange}
                onEditTask={openEditTask}
                onSaved={handleSaved}
                creatingInStatusId={creatingInStatusId}
                onStartCreate={focusCreateTask}
                onCancelCreate={() => setCreatingInStatusId(null)}
              />
            ) : (
              <TaskCalendarView
                tasks={filteredTasks}
                taskTypes={taskTypes}
                onEditTask={openEditTask}
              />
            )}
          </div>
        )}
      </main>

      <ProjectFormDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        onSaved={handleProjectCreated}
      />

      <TaskFormDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={editingTask}
        statuses={statuses}
        priorities={priorities}
        teamMembers={teamMembers}
        taskTypes={taskTypes}
        projectId={selectedProjectId}
        onSaved={handleSaved}
      />

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        statuses={statuses}
        teamMembers={teamMembers}
        priorities={priorities}
        taskTypes={taskTypes}
        onChanged={async () => {
          await loadData();
          await handleSaved();
        }}
      />
    </AppShell>
  );
}
