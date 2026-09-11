import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  DONE_STATUS_NAME,
  PRD_STATUS_NAME,
  UAT_STATUS_NAME,
} from "@/lib/default-statuses";
import type { Task } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isSameCalendarDate(
  value: Date | string | null | undefined,
  dateKey: string,
) {
  if (!value || !dateKey) return false;
  const parsed = new Date(
    typeof value === "string" ? value : value.getTime(),
  );
  if (Number.isNaN(parsed.getTime())) return false;

  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return false;

  const target = new Date(year, month - 1, day);
  parsed.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return parsed.getTime() === target.getTime();
}

export function calendarDateKey(value: Date | string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(
    typeof value === "string" ? value : value.getTime(),
  );
  if (Number.isNaN(parsed.getTime())) return null;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const TASK_DATE_FIELDS = [
  "startDate",
  "endDate",
  "uatDate",
  "prdDate",
] as const;

export function taskMatchesDateFilter(
  task: Task,
  dateKey: string,
  field?: "" | (typeof TASK_DATE_FIELDS)[number],
) {
  if (!dateKey) return true;
  const fields = field ? [field] : TASK_DATE_FIELDS;
  return fields.some((key) => isSameCalendarDate(task[key], dateKey));
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "-";
  const value = typeof date === "string" ? new Date(date) : date;
  return value.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) return "-";
  const value = typeof date === "string" ? new Date(date) : date;
  return value.toLocaleString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function statusName(task: Task) {
  return (task.status?.name ?? "").trim().toLowerCase();
}

function isPastDue(value: string | null | undefined) {
  if (!value) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  parsed.setHours(0, 0, 0, 0);
  // Due today counts as overdue until the matching status is reached.
  return parsed <= startOfToday();
}

export type TaskOverdueField = "endDate" | "uatDate" | "prdDate";

/**
 * Overdue rules (due today or earlier, until the matching status is reached):
 * - No Timeline UAT and no Timeline PRD → use End date; Done is complete
 * - Has Timeline UAT only → use UAT date; UAT / PRD / Done are complete
 * - Has both UAT and PRD → PRD takes priority; PRD / Done are complete
 *   (UAT is not enough). If still before UAT, a due/passed UAT date is also overdue.
 * - Has Timeline PRD only → use PRD date; PRD / Done are complete
 */
export function getTaskOverdueState(task: Task): {
  overdue: boolean;
  field: TaskOverdueField | null;
} {
  const status = statusName(task);
  const done = status === DONE_STATUS_NAME.toLowerCase();
  const uat = status === UAT_STATUS_NAME.toLowerCase();
  const prd = status === PRD_STATUS_NAME.toLowerCase();
  const hasUat = Boolean(task.uatDate);
  const hasPrd = Boolean(task.prdDate);

  if (done) return { overdue: false, field: null };

  if (hasUat && hasPrd) {
    if (prd) return { overdue: false, field: null };
    if (!uat && isPastDue(task.uatDate)) {
      return { overdue: true, field: "uatDate" };
    }
    if (isPastDue(task.prdDate)) {
      return { overdue: true, field: "prdDate" };
    }
    return { overdue: false, field: null };
  }

  if (hasUat) {
    if (uat || prd) return { overdue: false, field: null };
    if (isPastDue(task.uatDate)) {
      return { overdue: true, field: "uatDate" };
    }
    return { overdue: false, field: null };
  }

  if (hasPrd) {
    if (prd) return { overdue: false, field: null };
    if (isPastDue(task.prdDate)) {
      return { overdue: true, field: "prdDate" };
    }
    return { overdue: false, field: null };
  }

  if (isPastDue(task.endDate)) {
    return { overdue: true, field: "endDate" };
  }
  return { overdue: false, field: null };
}

export function isTaskOverdue(task: Task) {
  return getTaskOverdueState(task).overdue;
}
