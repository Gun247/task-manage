import type { Status, Task } from "@/lib/types";

export type TaskSortMode =
  | "default"
  | "priority"
  | "prd"
  | "uat"
  | "importance";

export const TASK_SORT_OPTIONS: { value: TaskSortMode; label: string }[] = [
  { value: "default", label: "เรียง: ปกติ" },
  { value: "importance", label: "เรียง: ความสำคัญ" },
  { value: "priority", label: "เรียง: Priority" },
  { value: "prd", label: "เรียง: Timeline PRD" },
  { value: "uat", label: "เรียง: Timeline UAT" },
];

/** Empty / invalid dates sort after real dates. */
function dateSortKey(value: string | null | undefined): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const time = Date.parse(value);
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

function comparePriority(a: Task, b: Task): number {
  return (
    (a.priority?.sortOrder ?? Number.POSITIVE_INFINITY) -
    (b.priority?.sortOrder ?? Number.POSITIVE_INFINITY)
  );
}

function comparePrd(a: Task, b: Task): number {
  return dateSortKey(a.prdDate) - dateSortKey(b.prdDate);
}

function compareUat(a: Task, b: Task): number {
  return dateSortKey(a.uatDate) - dateSortKey(b.uatDate);
}

/** First status in Settings order comes first. */
function compareStatus(
  a: Task,
  b: Task,
  statusOrder: Map<string, number>,
): number {
  const aOrder =
    statusOrder.get(a.statusId) ??
    a.status?.sortOrder ??
    Number.POSITIVE_INFINITY;
  const bOrder =
    statusOrder.get(b.statusId) ??
    b.status?.sortOrder ??
    Number.POSITIVE_INFINITY;
  return aOrder - bOrder;
}

function compareDefault(a: Task, b: Task): number {
  return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
}

function buildStatusOrder(statuses: Status[]): Map<string, number> {
  return new Map(
    [...statuses]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((status, index) => [status.id, index]),
  );
}

/**
 * Sort tasks by the selected mode.
 * Importance: Priority → PRD → UAT → Status (first in Settings first).
 */
export function sortTasks(
  tasks: Task[],
  mode: TaskSortMode,
  statuses: Status[] = [],
): Task[] {
  if (mode === "default") return tasks;

  const statusOrder = buildStatusOrder(statuses);

  return [...tasks].sort((a, b) => {
    if (mode === "priority") {
      return comparePriority(a, b) || compareDefault(a, b);
    }
    if (mode === "prd") {
      return comparePrd(a, b) || comparePriority(a, b) || compareDefault(a, b);
    }
    if (mode === "uat") {
      return compareUat(a, b) || comparePriority(a, b) || compareDefault(a, b);
    }

    // ความสำคัญ: Priority → PRD → UAT → Status (สถานะตัวแรกขึ้นก่อน)
    return (
      comparePriority(a, b) ||
      comparePrd(a, b) ||
      compareUat(a, b) ||
      compareStatus(a, b, statusOrder) ||
      compareDefault(a, b)
    );
  });
}
