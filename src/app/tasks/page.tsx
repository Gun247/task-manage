"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Settings, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { TaskListView } from "@/components/task-list-view";
import { TaskKanbanView } from "@/components/task-kanban-view";
import { TaskCalendarView } from "@/components/task-calendar-view";
import { TaskFormDialog } from "@/components/task-form-dialog";
import { SettingsDialog } from "@/components/settings-dialog";
import type {
  Priority,
  Status,
  Task,
  TaskFilters,
  TeamMember,
  ViewMode,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const views: { id: ViewMode; label: string }[] = [
  { id: "list", label: "รายการ" },
  { id: "kanban", label: "Kanban" },
  { id: "calendar", label: "ปฏิทิน" },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [view, setView] = useState<ViewMode>("list");
  const [filters, setFilters] = useState<TaskFilters>({
    search: "",
    priorityId: "",
    assigneeId: "",
    taskType: "",
  });
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultStatusId, setDefaultStatusId] = useState<string>();
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [tasksRes, statusesRes, prioritiesRes, membersRes] = await Promise.all([
      fetch("/api/tasks"),
      fetch("/api/statuses"),
      fetch("/api/priorities"),
      fetch("/api/team-members"),
    ]);

    const [tasksData, statusesData, prioritiesData, membersData] =
      await Promise.all([
        tasksRes.json(),
        statusesRes.json(),
        prioritiesRes.json(),
        membersRes.json(),
      ]);

    setTasks(tasksData);
    setStatuses(statusesData);
    setPriorities(prioritiesData);
    setTeamMembers(membersData);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (
        filters.search &&
        !task.name.toLowerCase().includes(filters.search.toLowerCase())
      ) {
        return false;
      }
      if (filters.priorityId && task.priorityId !== filters.priorityId) {
        return false;
      }
      if (filters.assigneeId && task.assigneeId !== filters.assigneeId) {
        return false;
      }
      if (filters.taskType && task.taskType !== filters.taskType) {
        return false;
      }
      return true;
    });
  }, [tasks, filters]);

  async function handleStatusChange(taskId: string, statusId: string) {
    setTasks((current) =>
      current.map((task) => {
        if (task.id !== taskId) return task;
        const status = statuses.find((item) => item.id === statusId);
        if (!status) return task;
        return { ...task, statusId, status };
      }),
    );

    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statusId }),
    });
  }

  function openCreateTask(statusId?: string) {
    setEditingTask(null);
    setDefaultStatusId(statusId);
    setTaskDialogOpen(true);
  }

  function openEditTask(task: Task) {
    setEditingTask(task);
    setDefaultStatusId(undefined);
    setTaskDialogOpen(true);
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <h1 className="text-xl font-bold text-[#1E3A5F]">
              FWF Task Manager
            </h1>
            <p className="text-sm text-slate-500">Foreigner Worker Fund</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-lg bg-slate-100 p-1">
              {views.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setView(item.id)}
                  className={cn(
                    "rounded-md px-4 py-2 text-sm font-medium transition",
                    view === item.id
                      ? "bg-white text-[#1E3A5F] shadow-sm"
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
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>
            <Button type="button" onClick={() => openCreateTask()}>
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          </div>
        </div>

        <div className="mx-auto flex max-w-7xl flex-wrap gap-3 px-4 pb-4 lg:px-8">
          <Input
            className="min-w-[200px] flex-1"
            placeholder="ค้นหา task..."
            value={filters.search}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                search: event.target.value,
              }))
            }
          />
          <Select
            value={filters.priorityId}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                priorityId: event.target.value,
              }))
            }
          >
            <option value="">Priority: ทั้งหมด</option>
            {priorities.map((priority) => (
              <option key={priority.id} value={priority.id}>
                {priority.label}
              </option>
            ))}
          </Select>
          <Select
            value={filters.assigneeId}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                assigneeId: event.target.value,
              }))
            }
          >
            <option value="">Assignee: ทั้งหมด</option>
            {teamMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.nickname}
              </option>
            ))}
          </Select>
          <Select
            value={filters.taskType}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                taskType: event.target.value,
              }))
            }
          >
            <option value="">Type: ทั้งหมด</option>
            <option value="Back End">Back End</option>
            <option value="Front End">Front End</option>
          </Select>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
            กำลังโหลด...
          </div>
        ) : view === "list" ? (
          <TaskListView
            tasks={filteredTasks}
            onEditTask={openEditTask}
            onCreateTask={() => openCreateTask()}
          />
        ) : view === "kanban" ? (
          <TaskKanbanView
            tasks={filteredTasks}
            statuses={statuses}
            onStatusChange={handleStatusChange}
            onEditTask={openEditTask}
            onCreateTask={openCreateTask}
          />
        ) : (
          <TaskCalendarView tasks={filteredTasks} onEditTask={openEditTask} />
        )}
      </main>

      <TaskFormDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={editingTask}
        statuses={statuses}
        priorities={priorities}
        teamMembers={teamMembers}
        defaultStatusId={defaultStatusId}
        onSaved={loadData}
      />

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        statuses={statuses}
        teamMembers={teamMembers}
        priorities={priorities}
        onChanged={loadData}
      />
    </div>
  );
}
