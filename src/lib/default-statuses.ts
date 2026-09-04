/** Canonical workflow statuses — always present in the app. */
export const DEFAULT_STATUSES = [
  {
    name: "Backlog",
    color: "#6B7280",
    sortOrder: 0,
    description: "ว่าง",
  },
  {
    name: "In Progress",
    color: "#3B82F6",
    sortOrder: 1,
    description: "กำลังดำเนินการ",
  },
  {
    name: "UAT",
    color: "#F97316",
    sortOrder: 2,
    description: "deploy uat แล้ว",
  },
  {
    name: "PRD",
    color: "#22C55E",
    sortOrder: 3,
    description: "deploy production แล้ว",
  },
  {
    name: "Done",
    color: "#6BB82A",
    sortOrder: 4,
    description: "จบ task แล้ว — หลัง PRD 1 วัน จะเป็น Done อัตโนมัติ",
  },
] as const;

export type DefaultStatusName = (typeof DEFAULT_STATUSES)[number]["name"];

export const DEFAULT_STATUS_NAMES = DEFAULT_STATUSES.map(
  (status) => status.name,
) as DefaultStatusName[];

const DEFAULT_STATUS_NAME_SET = new Set<string>(DEFAULT_STATUS_NAMES);

export function isDefaultStatusName(name: string) {
  return DEFAULT_STATUS_NAME_SET.has(name);
}

export function getStatusDescription(name: string) {
  return (
    DEFAULT_STATUSES.find((status) => status.name === name)?.description ?? null
  );
}

export const PRD_STATUS_NAME = "PRD";
export const DONE_STATUS_NAME = "Done";
export const PRD_TO_DONE_AFTER_MS = 24 * 60 * 60 * 1000;

export function shouldAutoPromotePrdToDone(params: {
  enteredPrdAt?: string | Date | null;
  prdDate?: string | Date | null;
  updatedAt?: string | Date | null;
  now?: Date;
}) {
  const now = params.now ?? new Date();

  if (params.enteredPrdAt) {
    const entered = new Date(params.enteredPrdAt);
    if (!Number.isNaN(entered.getTime())) {
      return now.getTime() - entered.getTime() >= PRD_TO_DONE_AFTER_MS;
    }
  }

  if (params.prdDate) {
    const prd = new Date(params.prdDate);
    if (!Number.isNaN(prd.getTime())) {
      const threshold = new Date(prd);
      threshold.setHours(0, 0, 0, 0);
      threshold.setDate(threshold.getDate() + 1);
      return now.getTime() >= threshold.getTime();
    }
  }

  if (params.updatedAt) {
    const updated = new Date(params.updatedAt);
    if (!Number.isNaN(updated.getTime())) {
      return now.getTime() - updated.getTime() >= PRD_TO_DONE_AFTER_MS;
    }
  }

  return false;
}
