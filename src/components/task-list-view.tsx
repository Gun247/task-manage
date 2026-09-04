"use client";

import { InlineAssigneePicker } from "@/components/assignee-multi-select";
import { TaskTypesDisplay } from "@/components/task-type-multi-select";
import { Badge } from "@/components/ui/badge";
import { TaskInlineCreate } from "@/components/task-inline-create";
import type { Priority, Status, Task, TaskTypeOption, TeamMember } from "@/lib/types";
import { cn, formatDate, formatDateTime, isTaskOverdue } from "@/lib/utils";
import { ClipboardList } from "lucide-react";

interface TaskListViewProps {
  tasks: Task[];
  statuses: Status[];
  priorities: Priority[];
  teamMembers: TeamMember[];
  taskTypes: TaskTypeOption[];
  projectId: string;
  onEditTask: (task: Task) => void;
  onTaskUpdated: (task: Task) => void;
  onSaved: () => void;
  focusCreateTrigger?: number;
}

export function TaskListView({
  tasks,
  statuses,
  priorities,
  teamMembers,
  taskTypes,
  projectId,
  onEditTask,
  onTaskUpdated,
  onSaved,
  focusCreateTrigger = 0,
}: TaskListViewProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <TaskInlineCreate
        statuses={statuses}
        priorities={priorities}
        teamMembers={teamMembers}
        taskTypes={taskTypes}
        projectId={projectId}
        onSaved={onSaved}
        focusTrigger={focusCreateTrigger}
      />

      {tasks.length === 0 ? (
        <div className="flex min-h-[280px] flex-col items-center justify-center p-10 text-center">
          <ClipboardList className="mb-4 h-10 w-10 text-slate-300" />
          <h3 className="text-base font-semibold text-slate-800">
            ยังไม่มี task
          </h3>
          <p className="mt-2 max-w-md text-sm text-slate-500">
            พิมพ์ชื่อ task ด้านบนแล้วกด Enter หรือปุ่มสร้างเพื่อเพิ่มงานใหม่
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Task Name</th>
                <th className="px-4 py-3 font-medium">Subtasks</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">เปลี่ยนสถานะล่าสุด</th>
                <th className="px-4 py-3 font-medium">Assignee</th>
                <th className="px-4 py-3 font-medium">Start</th>
                <th className="px-4 py-3 font-medium">End</th>
                <th className="px-4 py-3 font-medium">Timeline UAT</th>
                <th className="px-4 py-3 font-medium">Timeline PRD</th>
                <th className="px-4 py-3 font-medium">Type</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task, index) => {
                const overdue = isTaskOverdue(task);
                return (
                  <tr
                    key={task.id}
                    className={cn(
                      "cursor-pointer border-t transition",
                      overdue
                        ? "border-red-100 bg-red-50/80 hover:bg-red-50"
                        : cn(
                            "border-slate-100 hover:bg-slate-50",
                            index % 2 === 0 ? "bg-white" : "bg-slate-50/40",
                          ),
                    )}
                    onClick={() => onEditTask(task)}
                  >
                    <td className="px-4 py-3">
                      <Badge color={task.priority.color}>
                        {task.priority.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className={cn(
                            "font-medium",
                            overdue ? "text-red-800" : "text-slate-900",
                          )}
                        >
                          {task.name}
                        </p>
                        {overdue ? (
                          <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                            เกินกำหนด
                          </span>
                        ) : null}
                      </div>
                      {task.description?.trim() ? (
                        <p
                          className={cn(
                            "mt-0.5 line-clamp-2 max-w-xs text-xs leading-relaxed",
                            overdue ? "text-red-700/70" : "text-slate-500",
                          )}
                        >
                          {task.description.trim()}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {(task.subtasks ?? []).length > 0
                        ? `${(task.subtasks ?? []).filter((item) => item.isDone).length}/${(task.subtasks ?? []).length}`
                        : "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Badge className="whitespace-nowrap" color={task.status.color}>
                        {task.status.name}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatDateTime(
                        task.statusHistory?.[task.statusHistory.length - 1]
                          ?.changedAt,
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <InlineAssigneePicker
                        taskId={task.id}
                        members={teamMembers}
                        assignees={
                          task.assignees?.length
                            ? task.assignees
                            : task.assignee
                              ? [task.assignee]
                              : []
                        }
                        onUpdated={onTaskUpdated}
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(task.startDate)}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3",
                        overdue
                          ? "font-semibold text-red-600"
                          : "text-slate-600",
                      )}
                    >
                      {formatDate(task.endDate)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(task.uatDate)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(task.prdDate)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <TaskTypesDisplay
                        options={taskTypes}
                        types={
                          task.taskTypes?.length
                            ? task.taskTypes
                            : task.taskType
                              ? [task.taskType]
                              : []
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
