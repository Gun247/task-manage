"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { th } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import type { Task } from "@/lib/types";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TaskCalendarViewProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
}

export function TaskCalendarView({ tasks, onEditTask }: TaskCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentMonth]);

  const tasksForDay = useMemo(() => {
    return tasks.filter((task) => {
      if (!task.startDate && !task.endDate) return false;
      const start = task.startDate ? new Date(task.startDate) : new Date(task.endDate!);
      const end = task.endDate ? new Date(task.endDate) : start;
      return isWithinInterval(selectedDate, { start, end });
    });
  }, [tasks, selectedDate]);

  function getTasksOnDay(day: Date) {
    return tasks.filter((task) => {
      if (!task.startDate && !task.endDate) return false;
      const start = task.startDate ? new Date(task.startDate) : new Date(task.endDate!);
      const end = task.endDate ? new Date(task.endDate) : start;
      return isWithinInterval(day, { start, end });
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#1E3A5F]">
            {format(currentMonth, "MMMM yyyy", { locale: th })}
          </h2>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() =>
                setCurrentMonth((value) =>
                  addDays(startOfMonth(value), -1),
                )
              }
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                setCurrentMonth(today);
                setSelectedDate(today);
              }}
            >
              วันนี้
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() =>
                setCurrentMonth((value) =>
                  addDays(endOfMonth(value), 1),
                )
              }
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-500">
          {["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day) => {
            const dayTasks = getTasksOnDay(day);
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => setSelectedDate(day)}
                className={`min-h-[92px] rounded-xl border p-2 text-left transition ${
                  isSelected
                    ? "border-[#1E3A5F] bg-blue-50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                } ${!isSameMonth(day, currentMonth) ? "opacity-40" : ""}`}
              >
                <div
                  className={`mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                    isToday
                      ? "bg-[#1E3A5F] font-bold text-white"
                      : "text-slate-700"
                  }`}
                >
                  {format(day, "d")}
                </div>
                <div className="space-y-1">
                  {dayTasks.slice(0, 2).map((task) => (
                    <div
                      key={task.id}
                      className="truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                      style={{
                        backgroundColor: `${task.status.color}22`,
                        color: task.status.color,
                      }}
                    >
                      {task.name}
                    </div>
                  ))}
                  {dayTasks.length > 2 && (
                    <div className="text-[10px] text-slate-400">
                      +{dayTasks.length - 2} อื่นๆ
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-[#1E3A5F]">
          {format(selectedDate, "d MMMM yyyy", { locale: th })}
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Task วันนี้ ({tasksForDay.length})
        </p>

        <div className="mt-4 space-y-3">
          {tasksForDay.length === 0 && (
            <p className="rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-500">
              ไม่มี task ในวันนี้
            </p>
          )}
          {tasksForDay.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => onEditTask(task)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-left hover:bg-white"
            >
              <div className="mb-2 flex items-center gap-2">
                <Badge color={task.priority.color}>{task.priority.label}</Badge>
                <Badge color={task.status.color}>{task.status.name}</Badge>
              </div>
              <p className="text-sm font-semibold text-slate-900">{task.name}</p>
              <p className="mt-1 text-xs text-slate-500">{task.taskType}</p>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
