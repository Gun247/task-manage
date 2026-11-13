"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DateInput } from "@/components/ui/date-input";
import { Select } from "@/components/ui/input";
import { themeAccentColor } from "@/lib/themes";
import type { Project, Status, Task, TeamMember } from "@/lib/types";
import { cn } from "@/lib/utils";

type FrequencyMode = "activity" | "uat" | "prd";
type RangePreset = "4w" | "8w" | "12w" | "custom";

const WEEK_STARTS_ON = 1 as const;
const FALLBACK_ACCENT = "#334155";

function projectAccent(project: Project | undefined | null) {
  if (!project) return FALLBACK_ACCENT;
  return themeAccentColor(project.theme) || project.color || FALLBACK_ACCENT;
}

function mixAccent(accent: string, percent: number) {
  return `color-mix(in srgb, ${accent} ${percent}%, white)`;
}

function intensityStyle(
  count: number,
  max: number,
  accent: string,
): { className: string; style?: { backgroundColor: string } } {
  if (count <= 0 || max <= 0) {
    return { className: "bg-slate-100" };
  }
  const ratio = count / max;
  const percent =
    ratio <= 0.25 ? 18 : ratio <= 0.5 ? 35 : ratio <= 0.75 ? 55 : 78;
  return {
    className: "",
    style: { backgroundColor: mixAccent(accent, percent) },
  };
}

function cellToneStyle(
  count: number,
  max: number,
  accent: string,
): { className: string; style?: { backgroundColor: string; color?: string } } {
  if (count <= 0 || max <= 0) {
    return { className: "bg-slate-100 text-slate-400" };
  }
  const ratio = count / max;
  if (ratio <= 0.25) {
    return {
      className: "text-slate-700",
      style: { backgroundColor: mixAccent(accent, 14) },
    };
  }
  if (ratio <= 0.5) {
    return {
      className: "text-slate-800",
      style: { backgroundColor: mixAccent(accent, 28) },
    };
  }
  if (ratio <= 0.75) {
    return {
      className: "text-white",
      style: { backgroundColor: mixAccent(accent, 48) },
    };
  }
  return {
    className: "text-white",
    style: { backgroundColor: mixAccent(accent, 72) },
  };
}

function toDayKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return format(startOfDay(date), "yyyy-MM-dd");
}

/** Empty Clear on `<input type="date">` yields ""; parseISO then crashes format(). */
function parseDayKey(value: string): Date | null {
  if (!value.trim()) return null;
  const date = parseISO(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function resolveDayRange(rangeStart: string, rangeEnd: string) {
  const parsedStart = parseDayKey(rangeStart);
  const parsedEnd = parseDayKey(rangeEnd);
  if (!parsedStart || !parsedEnd) return null;
  return {
    start: startOfDay(minDate([parsedStart, parsedEnd])),
    end: endOfDay(maxDate([parsedStart, parsedEnd])),
  };
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

function TaskFrequencyHeatmap({
  tasks,
  projects,
  accentColor,
  rangeStart,
  rangeEnd,
  mode,
  onModeChange,
}: {
  tasks: Task[];
  projects: Project[];
  accentColor: string;
  rangeStart: string;
  rangeEnd: string;
  mode: FrequencyMode;
  onModeChange: (mode: FrequencyMode) => void;
}) {
  const projectById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects],
  );

  const {
    counts,
    dayAccent,
    maxCount,
    weeks,
    monthLabels,
    totalEvents,
    hasRange,
  } = useMemo(() => {
      const range = resolveDayRange(rangeStart, rangeEnd);
      if (!range) {
        return {
          counts: new Map<string, number>(),
          dayAccent: new Map<string, string>(),
          maxCount: 0,
          weeks: [] as Date[][],
          monthLabels: [] as { label: string; weekIndex: number }[],
          totalEvents: 0,
          hasRange: false,
        };
      }

      const { start: safeStart, end: safeEnd } = range;
      const gridStart = startOfWeek(safeStart, {
        weekStartsOn: WEEK_STARTS_ON,
      });
      const gridEnd = endOfWeek(safeEnd, { weekStartsOn: WEEK_STARTS_ON });
      const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

      const counts = new Map<string, number>();
      const dayProjectCounts = new Map<string, Map<string, number>>();

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

          let byProject = dayProjectCounts.get(key);
          if (!byProject) {
            byProject = new Map();
            dayProjectCounts.set(key, byProject);
          }
          byProject.set(
            task.projectId,
            (byProject.get(task.projectId) ?? 0) + 1,
          );
        }
      }

      const dayAccent = new Map<string, string>();
      for (const [key, byProject] of dayProjectCounts) {
        let bestId = "";
        let bestCount = -1;
        for (const [projectId, count] of byProject) {
          if (count > bestCount) {
            bestCount = count;
            bestId = projectId;
          }
        }
        dayAccent.set(
          key,
          projectAccent(projectById.get(bestId)) || accentColor,
        );
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

      return {
        counts,
        dayAccent,
        maxCount,
        weeks,
        monthLabels,
        totalEvents,
        hasRange: true,
      };
    }, [tasks, mode, rangeStart, rangeEnd, projectById, accentColor]);

  const modes: { id: FrequencyMode; label: string }[] = [
    { id: "activity", label: "Activity" },
    { id: "uat", label: "UAT" },
    { id: "prd", label: "PRD" },
  ];

  const inSelectedRange = (day: Date) => {
    const range = resolveDayRange(rangeStart, rangeEnd);
    if (!range) return false;
    const safeStart = startOfDay(range.start);
    const safeEnd = startOfDay(range.end);
    return day >= safeStart && day <= safeEnd;
  };

  const CELL_MIN_PX = 14;
  const LABEL_W_PX = 24;
  const GAP_PX = 4;
  const weekCols = `1.5rem repeat(${weeks.length}, minmax(${CELL_MIN_PX}px, 1fr))`;
  const weekdays = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [windowLabel, setWindowLabel] = useState("");
  const needsCarousel = weeks.length > 14;

  const updateCarouselState = () => {
    const node = scrollRef.current;
    if (!node) return;
    const maxScroll = Math.max(0, node.scrollWidth - node.clientWidth);
    const left = node.scrollLeft;
    setCanScrollLeft(left > 2);
    setCanScrollRight(left < maxScroll - 2);

    if (!needsCarousel || weeks.length === 0) {
      setWindowLabel("");
      return;
    }

    const contentWidth = Math.max(
      node.clientWidth,
      LABEL_W_PX + weeks.length * (CELL_MIN_PX + GAP_PX),
    );
    const weekTrack = Math.max(1, contentWidth - LABEL_W_PX);
    const weekWidth = weekTrack / weeks.length;
    const startIndex = Math.max(
      0,
      Math.min(
        weeks.length - 1,
        Math.floor(Math.max(0, left) / weekWidth),
      ),
    );
    const visibleCount = Math.max(
      1,
      Math.floor((node.clientWidth - LABEL_W_PX) / weekWidth),
    );
    const endIndex = Math.min(weeks.length - 1, startIndex + visibleCount - 1);
    const startDay = weeks[startIndex]?.[0];
    const endDay = weeks[endIndex]?.[6] ?? weeks[endIndex]?.[0];
    if (!startDay || !endDay) {
      setWindowLabel("");
      return;
    }
    setWindowLabel(
      `${format(startDay, "d MMM yyyy", { locale: th })} – ${format(endDay, "d MMM yyyy", { locale: th })}`,
    );
  };

  const scrollByPage = (direction: -1 | 1) => {
    const node = scrollRef.current;
    if (!node) return;
    const amount = Math.max(node.clientWidth * 0.72, CELL_MIN_PX * 8);
    node.scrollBy({ left: direction * amount, behavior: "smooth" });
  };

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollLeft = node.scrollWidth;
    const frame = requestAnimationFrame(updateCarouselState);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-anchor when range/weeks change
  }, [rangeStart, rangeEnd, weeks.length, needsCarousel]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    updateCarouselState();
    const onScroll = () => updateCarouselState();
    node.addEventListener("scroll", onScroll, { passive: true });
    const observer = new ResizeObserver(() => updateCarouselState());
    observer.observe(node);
    return () => {
      node.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeks.length, needsCarousel]);

  return (
    <section className="flex h-full min-h-[22rem] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            ความถี่ Task ตามวัน
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {hasRange ? (
              <>
                {format(parseISO(rangeStart), "d MMM yyyy", { locale: th })} –{" "}
                {format(parseISO(rangeEnd), "d MMM yyyy", { locale: th })} ·{" "}
                {totalEvents} รายการ
              </>
            ) : (
              "เลือกวันเริ่มและวันสิ้นสุด"
            )}
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

      <div className="relative min-h-0 flex-1">
        {!hasRange ? (
          <div className="flex h-full min-h-[12rem] items-center justify-center rounded-xl bg-slate-50 px-3 py-8 text-center text-sm text-slate-500">
            เลือกวันเริ่มและวันสิ้นสุดเพื่อแสดง heatmap
          </div>
        ) : (
          <>
            {needsCarousel ? (
              <>
                <button
                  type="button"
                  aria-label="เลื่อนย้อนหลัง"
                  disabled={!canScrollLeft}
                  onClick={() => scrollByPage(-1)}
                  className={cn(
                    "absolute left-0 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-600 shadow-sm transition",
                    canScrollLeft
                      ? "hover:border-primary/30 hover:text-primary"
                      : "pointer-events-none opacity-0",
                  )}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="เลื่อนไปข้างหน้า"
                  disabled={!canScrollRight}
                  onClick={() => scrollByPage(1)}
                  className={cn(
                    "absolute right-0 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-600 shadow-sm transition",
                    canScrollRight
                      ? "hover:border-primary/30 hover:text-primary"
                      : "pointer-events-none opacity-0",
                  )}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <div
                  className={cn(
                    "pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-white to-transparent transition-opacity",
                    canScrollLeft ? "opacity-100" : "opacity-0",
                  )}
                />
                <div
                  className={cn(
                    "pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-white to-transparent transition-opacity",
                    canScrollRight ? "opacity-100" : "opacity-0",
                  )}
                />
              </>
            ) : null}

            <div
              ref={scrollRef}
              className={cn(
                "h-full min-h-[12rem] overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                needsCarousel && "px-1",
              )}
            >
              <div
                className="flex h-full min-h-[12rem] flex-col gap-1"
                style={{
                  minWidth: `max(100%, calc(${LABEL_W_PX}px + ${weeks.length} * (${CELL_MIN_PX}px + ${GAP_PX}px)))`,
                }}
              >
                <div
                  className="grid shrink-0 gap-1"
                  style={{ gridTemplateColumns: weekCols }}
                >
                  <span className="sticky left-0 z-10 bg-white" />
                  {weeks.map((_, weekIndex) => {
                    const month = monthLabels.find(
                      (item) => item.weekIndex === weekIndex,
                    );
                    return (
                      <span
                        key={`month-${weekIndex}`}
                        className="truncate text-center text-micro text-slate-400"
                      >
                        {month?.label ?? ""}
                      </span>
                    );
                  })}
                </div>

                <div
                  className="grid min-h-0 flex-1 gap-1"
                  style={{
                    gridTemplateColumns: weekCols,
                    gridTemplateRows: `repeat(${weekdays.length}, minmax(0, 1fr))`,
                  }}
                >
                  {weekdays.flatMap((weekday, rowIndex) => {
                    const label = (
                      <span
                        key={`label-${weekday}`}
                        className="sticky left-0 z-10 flex items-center justify-end bg-white pr-1 text-micro text-slate-400"
                      >
                        {rowIndex % 2 === 0 ? weekday : ""}
                      </span>
                    );
                    const cells = weeks.map((week, weekIndex) => {
                      const day = week[rowIndex];
                      if (!day) {
                        return (
                          <span
                            key={`empty-${weekIndex}-${rowIndex}`}
                            className="min-h-[12px] rounded-[3px]"
                          />
                        );
                      }
                      const key = toDayKey(day) ?? "";
                      const count = counts.get(key) ?? 0;
                      const selected = inSelectedRange(day);
                      const isToday = isSameDay(day, new Date());
                      const cellAccent =
                        dayAccent.get(key) ?? accentColor;
                      const tone = intensityStyle(count, maxCount, cellAccent);
                      return (
                        <span
                          key={key}
                          title={
                            selected
                              ? `${format(day, "d MMM yyyy", { locale: th })} · ${count} task`
                              : `${format(day, "d MMM yyyy", { locale: th })} · นอกช่วงที่เลือก`
                          }
                          className={cn(
                            "min-h-[12px] rounded-[3px]",
                            selected
                              ? tone.className
                              : "bg-slate-50 opacity-40",
                            isToday &&
                              selected &&
                              "ring-1 ring-offset-1",
                          )}
                          style={
                            selected
                              ? {
                                  ...tone.style,
                                  ...(isToday
                                    ? {
                                        boxShadow: `0 0 0 1px ${cellAccent}80`,
                                      }
                                    : {}),
                                }
                              : undefined
                          }
                        />
                      );
                    });
                    return [label, ...cells];
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="mt-3 flex shrink-0 items-center justify-between gap-2 text-micro text-slate-400">
        {needsCarousel && windowLabel ? (
          <span className="truncate">{windowLabel}</span>
        ) : (
          <span />
        )}
        <span className="inline-flex shrink-0 items-center gap-1.5">
          <span>น้อย</span>
          <span className="h-2.5 w-2.5 rounded-[2px] bg-slate-100" />
          <span
            className="h-2.5 w-2.5 rounded-[2px]"
            style={{ backgroundColor: mixAccent(accentColor, 18) }}
          />
          <span
            className="h-2.5 w-2.5 rounded-[2px]"
            style={{ backgroundColor: mixAccent(accentColor, 35) }}
          />
          <span
            className="h-2.5 w-2.5 rounded-[2px]"
            style={{ backgroundColor: mixAccent(accentColor, 55) }}
          />
          <span
            className="h-2.5 w-2.5 rounded-[2px]"
            style={{ backgroundColor: mixAccent(accentColor, 78) }}
          />
          <span>มาก</span>
        </span>
      </div>
    </section>
  );
}

function PeopleWorkloadMatrix({
  tasks,
  statuses,
  accentColor,
  rangeStart,
  rangeEnd,
}: {
  tasks: Task[];
  statuses: Status[];
  accentColor: string;
  rangeStart: string;
  rangeEnd: string;
}) {
  const { members, matrix, maxCount, rowTotals, colTotals, hasRange } =
    useMemo(() => {
    const range = resolveDayRange(rangeStart, rangeEnd);
    if (!range) {
      return {
        members: [] as TeamMember[],
        matrix: new Map<string, number>(),
        maxCount: 0,
        rowTotals: new Map<string, number>(),
        colTotals: new Map<string, number>(),
        hasRange: false,
      };
    }
    const { start: safeStart, end: safeEnd } = range;
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

    return { members, matrix, maxCount, rowTotals, colTotals, hasRange: true };
  }, [tasks, rangeStart, rangeEnd]);

  if (!hasRange || members.length === 0) {
    return (
      <section className="flex h-full min-h-[22rem] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">โหลดงานต่อคน</h2>
        <p className="mt-6 flex flex-1 items-center justify-center rounded-xl bg-slate-50 px-3 py-8 text-center text-sm text-slate-500">
          {hasRange
            ? "ไม่มี assignee ในช่วงวันที่เลือก"
            : "เลือกวันเริ่มและวันสิ้นสุด"}
        </p>
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-[22rem] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 shrink-0">
        <h2 className="text-sm font-semibold text-slate-800">โหลดงานต่อคน</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Task ที่มี Activity/UAT/PRD ในช่วงที่เลือก · สถานะปัจจุบัน
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
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
                      {(() => {
                        const tone = cellToneStyle(
                          count,
                          maxCount,
                          accentColor,
                        );
                        return (
                          <span
                            title={`${member.nickname} · ${status.name}: ${count}`}
                            className={cn(
                              "inline-flex h-8 min-w-[2.25rem] items-center justify-center rounded-md px-1.5 text-xs font-semibold tabular-nums",
                              tone.className,
                            )}
                            style={tone.style}
                          >
                            {count > 0 ? count : "·"}
                          </span>
                        );
                      })()}
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
  const accentColor = projectAccent(selectedProject);

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
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-full ring-1 ring-slate-200"
              style={{ backgroundColor: accentColor }}
              title={
                selectedProject
                  ? `สีธีม: ${selectedProject.name}`
                  : "ทุกโปรเจกต์ — ช่องใช้สีตามโปรเจกต์ที่มีงานมากสุดวันนั้น"
              }
            />
            <Select
              id="heatmap-project"
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              className="h-9 flex-1 bg-white py-0 leading-9"
            >
              <option value="">ทุกโปรเจกต์</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </div>
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

      <div className="grid items-stretch gap-6 xl:grid-cols-2">
        <TaskFrequencyHeatmap
          tasks={filteredTasks}
          projects={projects}
          accentColor={accentColor}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          mode={mode}
          onModeChange={setMode}
        />
        <PeopleWorkloadMatrix
          tasks={filteredTasks}
          statuses={statuses}
          accentColor={accentColor}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
        />
      </div>
    </div>
  );
}
