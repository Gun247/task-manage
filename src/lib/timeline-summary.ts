import type { Task, TeamMember } from "@/lib/types";
import { calendarDateKey } from "@/lib/utils";

export type TimelineKind = "uat" | "prd";
export type TimelineKindFilter = "all" | TimelineKind;
export type TimelineRangeFilter = "upcoming" | "past" | "all";

export interface TimelineDayGroup {
  dateKey: string;
  date: Date;
  uatTasks: Task[];
  prdTasks: Task[];
}

function startOfLocalDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function dateFromKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function taskAssignees(task: Task): TeamMember[] {
  if (task.assignees?.length) return task.assignees;
  if (task.assignee) return [task.assignee];
  return [];
}

export function buildTimelineDayGroups(tasks: Task[]): TimelineDayGroup[] {
  const map = new Map<string, TimelineDayGroup>();

  function ensure(dateKey: string) {
    let group = map.get(dateKey);
    if (!group) {
      group = {
        dateKey,
        date: dateFromKey(dateKey),
        uatTasks: [],
        prdTasks: [],
      };
      map.set(dateKey, group);
    }
    return group;
  }

  for (const task of tasks) {
    const uatKey = calendarDateKey(task.uatDate);
    if (uatKey) ensure(uatKey).uatTasks.push(task);

    const prdKey = calendarDateKey(task.prdDate);
    if (prdKey) ensure(prdKey).prdTasks.push(task);
  }

  return [...map.values()]
    .filter((group) => group.uatTasks.length > 0 || group.prdTasks.length > 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function filterTimelineGroups(
  groups: TimelineDayGroup[],
  options: {
    kind: TimelineKindFilter;
    range: TimelineRangeFilter;
    now?: Date;
  },
): TimelineDayGroup[] {
  const today = startOfLocalDay(options.now ?? new Date());

  return groups
    .filter((group) => {
      if (options.range === "upcoming" && group.date < today) return false;
      if (options.range === "past" && group.date >= today) return false;
      if (options.kind === "uat") return group.uatTasks.length > 0;
      if (options.kind === "prd") return group.prdTasks.length > 0;
      return true;
    })
    .map((group) => {
      if (options.kind === "uat") return { ...group, prdTasks: [] };
      if (options.kind === "prd") return { ...group, uatTasks: [] };
      return group;
    });
}

export function formatTimelineHeading(date: Date, kind: TimelineKind) {
  const label = date.toLocaleDateString("th-TH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
  return `${kind === "uat" ? "UAT" : "PRD"} ${label}`;
}

export function formatDayChip(date: Date) {
  return date.toLocaleDateString("th-TH", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function relativeDayLabel(date: Date, now = new Date()) {
  const today = startOfLocalDay(now);
  const target = startOfLocalDay(date);
  const diff = Math.round(
    (target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (diff === 0) return "วันนี้";
  if (diff === 1) return "พรุ่งนี้";
  if (diff === -1) return "เมื่อวาน";
  if (diff > 1) return `อีก ${diff} วัน`;
  return `ผ่านมา ${Math.abs(diff)} วัน`;
}

function taskCopyLines(task: Task, index: number) {
  const names =
    taskAssignees(task)
      .map((member) => member.nickname)
      .join(", ") || "-";
  const lines = [`${index + 1}. ${task.name}`];
  if (task.description?.trim()) {
    lines.push(`   ${task.description.trim()}`);
  }
  lines.push(`   DEV: ${names}`);
  lines.push(`   สถานะ: ${task.status?.name ?? "-"}`);
  if (task.tags?.length) {
    lines.push(`   Tag: ${task.tags.join(", ")}`);
  }
  return lines.join("\n");
}

export function buildTimelineSummaryText(groups: TimelineDayGroup[]) {
  const sections: string[] = [];

  for (const group of groups) {
    if (group.uatTasks.length > 0) {
      sections.push(formatTimelineHeading(group.date, "uat"));
      group.uatTasks.forEach((task, index) => {
        sections.push(taskCopyLines(task, index));
      });
      sections.push("");
    }
    if (group.prdTasks.length > 0) {
      sections.push(formatTimelineHeading(group.date, "prd"));
      group.prdTasks.forEach((task, index) => {
        sections.push(taskCopyLines(task, index));
      });
      sections.push("");
    }
  }

  return sections.join("\n").trim();
}
