import type { TaskType } from "@/lib/types";

export const DEFAULT_TASK_TYPES = [
  { name: "Back End", color: "#3B82F6", sortOrder: 0 },
  { name: "Front End", color: "#EC4899", sortOrder: 1 },
] as const;

export function parseTaskTypes(value: string | null | undefined): TaskType[] {
  if (!value?.trim()) return ["Back End"];
  const parts = value
    .split(/[,|]/)
    .map((part) => part.trim())
    .filter(Boolean);
  const unique = [...new Set(parts)];
  return unique.length > 0 ? unique : ["Back End"];
}

export function serializeTaskTypes(
  types: Array<string | null | undefined>,
  fallback = "Back End",
): string {
  const valid = [
    ...new Set(
      types
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  return (valid.length > 0 ? valid : [fallback]).join(", ");
}

export function normalizeTaskTypes(input?: {
  taskTypes?: string[] | null;
  taskType?: string | null;
}): TaskType[] | null {
  if (!input) return null;
  if (input.taskTypes !== undefined) {
    return parseTaskTypes((input.taskTypes ?? []).join(", "));
  }
  if (input.taskType !== undefined) {
    return parseTaskTypes(input.taskType ?? "");
  }
  return null;
}

export function rewriteTaskTypeList(
  value: string,
  fromName: string,
  toName: string | null,
  fallback = "Back End",
): string {
  const types = parseTaskTypes(value);
  const next =
    toName === null
      ? types.filter((type) => type !== fromName)
      : types.map((type) => (type === fromName ? toName : type));
  return serializeTaskTypes(next, fallback);
}
