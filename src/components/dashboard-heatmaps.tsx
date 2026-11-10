"use client";

import { useMemo, useState } from "react";
import {
  eachDayOfInterval,
  endOfDay,
  endOfWeek,
  format,
  isSameDay,
  isWithinInterval,
  max as maxDate,
  min as minDate,
  parseISO,
  startOfDay,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { th } from "date-fns/locale";
import { DateInput } from "@/components/ui/date-input";
import { Select } from "@/components/ui/input";
import type { Project, Status, Task, TeamMember } from "@/lib/types";
import { cn } from "@/lib/utils";

type FrequencyMode = "activity" | "uat" | "prd";
type RangePreset = "4w" | "8w" | "12w" | "custom";

const WEEK_STARTS_ON = 1 as const;

function toDayKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return format(startOfDay(date), "yyyy-MM-dd");
}

function rangeFromWeeks(weeks: number) {
  const today = startOfDay(new Date());
  const rangeEnd = endOfWeek(today, { weekStartsOn: WEEK_STARTS_ON });
  const rangeStart = startOfWeek(subWeeks(rangeEnd, weeks - 1), {
    weekStartsOn: WEEK_STARTS_ON,
  });
  return {
    start: format(rangeStart, "yyyy-MM-dd"),
    end: format(rangeEnd, "yyyy-MM-dd"),
  };
}

function taskDatesForMode(task: Task, mode: FrequencyMode): string[] {
  if (mode === "uat") {
    return task.uatDate ? [task.uatDate] : [];
  }
  if (mode === "prd") {
    return task.prdDate ? [task.prdDate] : [];
  }
  return [task.createdAt, task.uatDate, task.prdDate].filter(
    (value): value is string => Boolean(value),
  );
}

function taskTouchesRange(task: Task, start: Date, end: Date) {
  const dates = [task.createdAt, task.uatDate, task.prdDate].filter(
    (value): value is string => Boolean(value),
  );
  return dates.some((raw) => {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return false;
    return isWithinInterval(date, { start, end });
  });
}

function intensityClass(count: number, max: number) {
  if (count <= 0 || max <= 0) {
    return "bg-slate-100";
  }
  const ratio = count / max;
  if (ratio <= 0.25) return "bg-[color-mix(in_srgb,var(--primary)_18%,white)]";
  if (ratio <= 0.5) return "bg-[color-mix(in_srgb,var(--primary)_35%,white)]";
  if (ratio <= 0.75) return "bg-[color-mix(in_srgb,var(--primary)_55%,white)]";
  return "bg-[color-mix(in_srgb,var(--primary)_78%,white)]";
}

function cellTone(count: number, max: number) {
  if (count <= 0 || max <= 0) {
    return "bg-slate-100 text-slate-400";
  }
  const ratio = count / max;
  if (ratio <= 0.25) {
    return "bg-[color-mix(in_srgb,var(--primary)_14%,white)] text-slate-700";
  }
  if (ratio <= 0.5) {
    return "bg-[color-mix(in_srgb,var(--primary)_28%,white)] text-slate-800";
  }
  if (ratio <= 0.75) {
    return "bg-[color-mix(in_srgb,var(--primary)_48%,white)] text-white";
  }
  return "bg-[color-mix(in_srgb,var(--primary)_72%,white)] text-white";
}

function TaskFrequencyHeatmap({
  tasks,
  rangeStart,
  rangeEnd,
  mode,
  onModeChange,
}: {
  tasks: Task[];
  rangeStart: string;
  rangeEnd: string;
  mode: FrequencyMode;
  onModeChange: (mode: FrequencyMode) => void;
}) {
  const { counts, maxCount, weeks, monthLabels, totalEvents } =
    useMemo(() => {
      const rawStart = startOfDay(parseISO(rangeStart));
      const rawEnd = endOfDay(parseISO(rangeEnd));
      const safeStart = minDate([rawStart, rawEnd]);
      const safeEnd = maxDate([rawStart, rawEnd]);
      const gridStart = startOfWeek(safeStart, {
        weekStartsOn: WEEK_STARTS_ON,
      });
      const gridEnd = endOfWeek(safeEnd, { weekStartsOn: WEEK_STARTS_ON });
      const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

      const counts = new Map<string, number>();
      for (const task of tasks) {
        const seen = new Set<string>();
        for (const raw of taskDatesForMode(task, mode)) {
          const key = toDayKey(raw);
          if (!key || seen.has(key)) continue;
          const day = parseISO(key);
          if (day < startOfDay(safeStart) || day > startOfDay(safeEnd)) {
            continue;
          }
          seen.add(key);
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }

      let maxCount = 0;
      let totalEvents = 0;
      for (const day of days) {
        const key = toDayKey(day);
        if (!key) continue;
        const count = counts.get(key) ?? 0;
        if (
          day >= startOfDay(safeStart) &&
          day <= startOfDay(safeEnd)
        ) {
          maxCount = Math.max(maxCount, count);
          totalEvents += count;
        }
      }

      const weeks: Date[][] = [];
      for (let index = 0; index < days.length; index += 7) {
        weeks.push(days.slice(index, index + 7));
      }

      const monthLabels: { label: string; weekIndex: number }[] = [];
      let lastMonth = "";
      weeks.forEach((week, weekIndex) => {
        const label = format(week[0] ?? gridStart, "MMM", { locale: th });
        if (label !== lastMonth) {
          monthLabels.push({ label, weekIndex });
          lastMonth = label;
        }
      });

      return { counts, maxCount, weeks, monthLabels, totalEvents };
    }, [tasks, mode, rangeStart, rangeEnd]);

  const modes: { id: FrequencyMode; label: string }[] = [
    { id: "activity", label: "Activity" },
    { id: "uat", label: "UAT" },
    { id: "prd", label: "PRD" },
  ];

  const inSelectedRange = (day: Date) => {
    const start = startOfDay(parseISO(rangeStart));
    const end = startOfDay(parseISO(rangeEnd));
    const safeStart = minDate([start, end]);
    const safeEnd = maxDate([start, end]);
    return day >= safeStart && day <= safeEnd;
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            ความถี่ Task ตามวัน
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {format(parseISO(rangeStart), "d MMM yyyy", { locale: th })} –{" "}
            {format(parseISO(rangeEnd), "d MMM yyyy", { locale: th })} ·{" "}
            {totalEvents} รายการ
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          {modes.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onModeChange(item.id)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition",
                mode === item.id
                  ? "bg-white text-primary shadow-sm"
                  : "text-slate-500 hover:text-slate-700",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div
            className="mb-1 grid gap-1"
            style={{
              gridTemplateColumns: `1.5rem repeat(${weeks.length}, minmax(0, 1fr))`,
            }}
          >
            <span />
            {weeks.map((_, weekIndex) => {
              const month = monthLabels.find(
                (item) => item.weekIndex === weekIndex,
              );
              return (
                <span
                  key={`month-${weekIndex}`}
                  className="text-center text-micro text-slate-400"
                >
                  {month?.label ?? ""}
                </span>
              );
            })}
          </div>

          <div className="grid gap-1">
            {["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map((weekday, rowIndex) => (
              <div
                key={weekday}
                className="grid items-center gap-1"
                style={{
                  gridTemplateColumns: `1.5rem repeat(${weeks.length}, minmax(0, 1fr))`,
                }}
              >
                <span className="text-right text-micro text-slate-400">
                  {rowIndex % 2 === 0 ? weekday : ""}
                </span>
                {weeks.map((week, weekIndex) => {
                  const day = week[rowIndex];
                  if (!day) {
                    return <span key={`empty-${weekIndex}-${rowIndex}`} />;
                  }
                  const key = toDayKey(day) ?? "";
                  const count = counts.get(key) ?? 0;
                  const selected = inSelectedRange(day);
                  const isToday = isSameDay(day, new Date());
                  return (
                    <span
                      key={key}
                      title={
                        selected
                          ? `${format(day, "d MMM yyyy", { locale: th })} · ${count} task`
                          : `${format(day, "d MMM yyyy", { locale: th })} · นอกช่วงที่เลือก`
                      }
                      className={cn(
                        "aspect-square w-full min-w-[10px] rounded-[3px]",
                        selected
                          ? intensityClass(count, maxCount)
                          : "bg-slate-50 opacity-40",
                        isToday && selected && "ring-1 ring-primary/50 ring-offset-1",
                      )}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-1.5 text-micro text-slate-400">
        <span>น้อย</span>
        <span className="h-2.5 w-2.5 rounded-[2px] bg-slate-100" />
        <span className="h-2.5 w-2.5 rounded-[2px] bg-[color-mix(in_srgb,var(--primary)_18%,white)]" />
        <span className="h-2.5 w-2.5 rounded-[2px] bg-[color-mix(in_srgb,var(--primary)_35%,white)]" />
        <span className="h-2.5 w-2.5 rounded-[2px] bg-[color-mix(in_srgb,var(--primary)_55%,white)]" />
        <span className="h-2.5 w-2.5 rounded-[2px] bg-[color-mix(in_srgb,var(--primary)_78%,white)]" />
        <span>มาก</span>
      </div>
    </section>
  );
}

function PeopleWorkloadMatrix({
  tasks,
  statuses,
  rangeStart,
  rangeEnd,
}: {
  tasks: Task[];
  statuses: Status[];
  rangeStart: string;
  rangeEnd: string;
}) {
  const { members, matrix, maxCount, rowTotals, colTotals } = useMemo(() => {
    const start = startOfDay(parseISO(rangeStart));
    const end = endOfDay(parseISO(rangeEnd));
    const safeStart = minDate([start, end]);
    const safeEnd = maxDate([start, end]);
    const scopedTasks = tasks.filter((task) =>
      taskTouchesRange(task, safeStart, safeEnd),
    );

    const memberMap = new Map<string, TeamMember>();
    for (const task of scopedTasks) {
      for (const member of task.assignees ?? []) {
        if (!memberMap.has(member.id)) memberMap.set(member.id, member);
      }
      if (task.assignee && !memberMap.has(task.assignee.id)) {
        memberMap.set(task.assignee.id, task.assignee);
      }
    }

    const members = Array.from(memberMap.values()).sort((a, b) =>
      a.nickname.localeCompare(b.nickname, "th"),
    );

    const matrix = new Map<string, number>();
    const rowTotals = new Map<string, number>();
    const colTotals = new Map<string, number>();

    for (const task of scopedTasks) {
      const people =
        task.assignees?.length > 0
          ? task.assignees
          : task.assignee
            ? [task.assignee]
            : [];
      if (people.length === 0) continue;

      for (const member of people) {
        const key = `${member.id}:${task.statusId}`;
        matrix.set(key, (matrix.get(key) ?? 0) + 1);
        rowTotals.set(member.id, (rowTotals.get(member.id) ?? 0) + 1);
        colTotals.set(
          task.statusId,
          (colTotals.get(task.statusId) ?? 0) + 1,
        );
      }
    }

    let maxCount = 0;
    for (const value of matrix.values()) {
      maxCount = Math.max(maxCount, value);
    }

    return { members, matrix, maxCount, rowTotals, colTotals };
  }, [tasks, rangeStart, rangeEnd]);

  if (members.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">โหลดงานต่อคน</h2>
        <p className="mt-6 rounded-xl bg-slate-50 px-3 py-8 text-center text-sm text-slate-500">
          ไม่มี assignee ในช่วงวันที่เลือก
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-800">โหลดงานต่อคน</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Task ที่มี Activity/UAT/PRD ในช่วงที่เลือก · สถานะปัจจุบัน
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] border-separate border-spacing-1 text-sm">
          <thead>
            <tr>
              <th className="px-2 py-1.5 text-left text-caption font-medium text-slate-500">
                คน
              </th>
              {statuses.map((status) => (
                <th
                  key={status.id}
                  className="px-1 py-1.5 text-center text-caption font-medium text-slate-500"
                  title={status.name}
                >
                  <span className="inline-flex items-center justify-center gap-1">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: status.color }}
                    />
                    <span className="max-w-[4.5rem] truncate">{status.name}</span>
                  </span>
                </th>
              ))}
              <th className="px-2 py-1.5 text-center text-caption font-medium text-slate-500">
                รวม
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
                <td className="whitespace-nowrap px-2 py-1">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full text-micro font-semibold text-white"
                      style={{ backgroundColor: member.color }}
                    >
                      {member.nickname.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="font-medium text-slate-800">
                      {member.nickname}
                    </span>
                  </span>
                </td>
                {statuses.map((status) => {
                  const count = matrix.get(`${member.id}:${status.id}`) ?? 0;
                  return (
                    <td key={status.id} className="p-0.5 text-center">
                      <span
                        title={`${member.nickname} · ${status.name}: ${count}`}
                        className={cn(
                          "inline-flex h-8 min-w-[2.25rem] items-center justify-center rounded-md px-1.5 text-xs font-semibold tabular-nums",
                          cellTone(count, maxCount),
                        )}
                      >
                        {count > 0 ? count : "·"}
                      </span>
                    </td>
                  );
                })}
                <td className="px-2 py-1 text-center text-xs font-semibold tabular-nums text-slate-700">
                  {rowTotals.get(member.id) ?? 0}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="px-2 pt-2 text-caption font-medium text-slate-500">
                รวม
              </td>
              {statuses.map((status) => (
                <td
                  key={status.id}
                  className="pt-2 text-center text-xs font-semibold tabular-nums text-slate-600"
                >
                  {colTotals.get(status.id) ?? 0}
                </td>
              ))}
              <td className="px-2 pt-2 text-center text-xs font-semibold tabular-nums text-slate-700">
                {[...rowTotals.values()].reduce((sum, value) => sum + value, 0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

export function DashboardHeatmaps({
  tasks,
  statuses,
  projects,
}: {
  tasks: Task[];
  statuses: Status[];
  projects: Project[];
}) {
  const initial = rangeFromWeeks(12);
  const [preset, setPreset] = useState<RangePreset>("12w");
  const [rangeStart, setRangeStart] = useState(initial.start);
  const [rangeEnd, setRangeEnd] = useState(initial.end);
  const [projectId, setProjectId] = useState("");
  const [mode, setMode] = useState<FrequencyMode>("activity");

  const presets: { id: RangePreset; label: string; weeks?: number }[] = [
    { id: "4w", label: "4 สัปดาห์", weeks: 4 },
    { id: "8w", label: "8 สัปดาห์", weeks: 8 },
    { id: "12w", label: "12 สัปดาห์", weeks: 12 },
    { id: "custom", label: "กำหนดเอง" },
  ];

  const filteredTasks = useMemo(
    () =>
      projectId
        ? tasks.filter((task) => task.projectId === projectId)
        : tasks,
    [tasks, projectId],
  );

  const selectedProject = projects.find((project) => project.id === projectId);

  function applyPreset(next: RangePreset) {
    setPreset(next);
    if (next === "custom") return;
    const weeks = next === "4w" ? 4 : next === "8w" ? 8 : 12;
    const range = rangeFromWeeks(weeks);
    setRangeStart(range.start);
    setRangeEnd(range.end);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mr-auto min-w-[10rem]">
          <p className="text-sm font-semibold text-slate-800">ตัวกรอง Heatmap</p>
          <p className="text-xs text-slate-500">
            กรองตามโปรเจกต์และช่วงวัน · {filteredTasks.length} task
            {selectedProject ? ` · ${selectedProject.name}` : ""}
          </p>
        </div>

        <div className="min-w-[11rem]">
          <label
            htmlFor="heatmap-project"
            className="mb-1 block text-caption font-medium tracking-wide text-slate-500 uppercase"
          >
            โปรเจกต์
          </label>
          <Select
            id="heatmap-project"
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            className="h-9 bg-white py-0 leading-9"
          >
            <option value="">ทุกโปรเจกต์</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="inline-flex flex-wrap rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          {presets.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => applyPreset(item.id)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition",
                preset === item.id
                  ? "bg-white text-primary shadow-sm"
                  : "text-slate-500 hover:text-slate-700",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <DateInput
          compact
          id="heatmap-from"
          label="จาก"
          value={rangeStart}
          max={rangeEnd || undefined}
          onChange={(event) => {
            setPreset("custom");
            setRangeStart(event.target.value);
          }}
          className="w-[9.5rem]"
        />
        <DateInput
          compact
          id="heatmap-to"
          label="ถึง"
          value={rangeEnd}
          min={rangeStart || undefined}
          onChange={(event) => {
            setPreset("custom");
            setRangeEnd(event.target.value);
          }}
          className="w-[9.5rem]"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <TaskFrequencyHeatmap
          tasks={filteredTasks}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          mode={mode}
          onModeChange={setMode}
        />
        <PeopleWorkloadMatrix
          tasks={filteredTasks}
          statuses={statuses}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
        />
      </div>
    </div>
  );
}
