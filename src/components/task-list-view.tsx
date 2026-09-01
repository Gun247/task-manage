"use client";

import { Badge } from "@/components/ui/badge";
import type { Task } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { ClipboardList } from "lucide-react";

interface TaskListViewProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onCreateTask: () => void;
}

export function TaskListView({
  tasks,
  onEditTask,
  onCreateTask,
}: TaskListViewProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <ClipboardList className="mb-4 h-12 w-12 text-slate-300" />
        <h3 className="text-lg font-semibold text-slate-800">
          ยังไม่มี task
        </h3>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          กด + New Task เพื่อเริ่มต้น หรือเปิด Settings เพื่อเพิ่มสมาชิกทีมก่อน
        </p>
        <button
          type="button"
          onClick={onCreateTask}
          className="mt-6 rounded-lg bg-[#1E3A5F] px-4 py-2 text-sm font-medium text-white hover:bg-[#16304f]"
        >
          + New Task
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Priority</th>
              <th className="px-4 py-3 font-medium">Task Name</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Assignee</th>
              <th className="px-4 py-3 font-medium">Start</th>
              <th className="px-4 py-3 font-medium">End (UAT)</th>
              <th className="px-4 py-3 font-medium">Type</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, index) => (
              <tr
                key={task.id}
                className={`cursor-pointer border-t border-slate-100 hover:bg-slate-50 ${
                  index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                }`}
                onClick={() => onEditTask(task)}
              >
                <td className="px-4 py-3">
                  <Badge color={task.priority.color}>{task.priority.label}</Badge>
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">
                  {task.name}
                </td>
                <td className="px-4 py-3">
                  <Badge color={task.status.color}>{task.status.name}</Badge>
                </td>
                <td className="px-4 py-3">
                  <span
                    className="font-medium"
                    style={{ color: task.assignee?.color ?? "#94A3B8" }}
                  >
                    {task.assignee?.nickname ?? "-"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {formatDate(task.startDate)}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {formatDate(task.endDate)}
                </td>
                <td className="px-4 py-3 text-slate-600">{task.taskType}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
