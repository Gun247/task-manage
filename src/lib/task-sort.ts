import type { Status, Task } from "@/lib/types";
import { DONE_STATUS_NAME } from "@/lib/default-statuses";

export type TaskSortMode =
  | "default"
  | "priority"
  | "prd"
  | "uat"
  | "status"
  | "importance";

export const TASK_SORT_OPTIONS: { value: TaskSortMode; label: string }[] = [
  { value: "default", label: "เรียง: ปกติ" },
  { value: "importance", label: "เรียง: ความสำคัญ" },
  { value: "priority", label: "เรียง: Priority" },
  { value: "status", label: "เรียง: สถานะ" },
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

function statusName(task: Task) {
  return (task.status?.name ?? "").trim().toLowerCase();
}

function isDoneTask(task: Task) {
  return statusName(task) === DONE_STATUS_NAME.toLowerCase();
}

/**
 * Next timeline that matters for this status:
 * - Backlog / In Progress → ต้องไป UAT (uatDate)
 * - UAT → ต้องไป PRD (prdDate)
 * - PRD → deploy แล้ว รอ Done (prdDate)
 * - Done → ไม่มีไทม์ไลน์ถัดไป
 */
function nextRelevantTimeline(task: Task): string | null {
  const status = statusName(task);

  if (status === "backlog" || status === "in progress") {
    return task.uatDate ?? task.prdDate ?? null;
  }
  if (status === "uat") {
    return task.prdDate ?? task.uatDate ?? null;
  }
  if (status === "prd") {
    return task.prdDate ?? null;
  }
  return null;
}

function secondaryTimeline(task: Task): string | null {
  const status = statusName(task);

  if (status === "backlog" || status === "in progress") {
    return task.prdDate ?? null;
  }
  if (status === "uat") {
    return task.uatDate ?? null;
  }
  return task.uatDate ?? task.prdDate ?? null;
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

function compareDoneLast(a: Task, b: Task): number {
  return Number(isDoneTask(a)) - Number(isDoneTask(b));
}

function compareNextTimeline(a: Task, b: Task): number {
  return (
    dateSortKey(nextRelevantTimeline(a)) - dateSortKey(nextRelevantTimeline(b))
  );
}

function compareSecondaryTimeline(a: Task, b: Task): number {
  return dateSortKey(secondaryTimeline(a)) - dateSortKey(secondaryTimeline(b));
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
 *
 * Importance (context-aware):
 * 1. งานที่ยังไม่ Done ขึ้นก่อน
 * 2. Priority (P0 → P1 → P2)
 * 3. ไทม์ไลน์ถัดไปตามสถานะ (Backlog/In Progress→UAT, UAT→PRD, PRD→PRD date)
 * 4. ไทม์ไลน์รอง
 * 5. ลำดับ Status ตามที่ตั้งค่า
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
    if (mode === "status") {
      return (
        compareStatus(a, b, statusOrder) ||
        comparePriority(a, b) ||
        compareDefault(a, b)
      );
    }
    if (mode === "prd") {
      return comparePrd(a, b) || comparePriority(a, b) || compareDefault(a, b);
    }
    if (mode === "uat") {
      return compareUat(a, b) || comparePriority(a, b) || compareDefault(a, b);
    }

    return (
      compareDoneLast(a, b) ||
      comparePriority(a, b) ||
      compareNextTimeline(a, b) ||
      compareSecondaryTimeline(a, b) ||
      compareStatus(a, b, statusOrder) ||
      compareDefault(a, b)
    );
  });
}
