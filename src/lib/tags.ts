import type { Task } from "@/lib/types";

export const DEFAULT_TAGS = [
  {
    name: "บัค",
    color: "#EF4444",
    sortOrder: 0,
    description: "พบข้อผิดพลาดที่ต้องแก้",
  },
  {
    name: "ปรับเพิ่ม",
    color: "#F97316",
    sortOrder: 1,
    description: "ต้องปรับหรือเพิ่มจากที่ทำไว้",
  },
  {
    name: "วิธีการเพิ่มเติม",
    color: "#8B5CF6",
    sortOrder: 2,
    description: "มีวิธีหรือขั้นตอนเพิ่มเติมที่ต้องทำ",
  },
] as const;

export function getTagDescription(name: string) {
  return DEFAULT_TAGS.find((tag) => tag.name === name)?.description ?? null;
}

export function parseTags(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];
  return [
    ...new Set(
      value
        .split(/[,|]/)
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  ];
}

export function serializeTags(tags: Array<string | null | undefined>): string {
  return [
    ...new Set(
      tags
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ].join(", ");
}

export function normalizeTags(input?: {
  tags?: string[] | null;
}): string[] | null {
  if (!input || input.tags === undefined) return null;
  return parseTags((input.tags ?? []).join(", "));
}

export function rewriteTagList(
  value: string,
  fromName: string,
  toName: string | null,
): string {
  const tags = parseTags(value);
  const next =
    toName === null
      ? tags.filter((tag) => tag !== fromName)
      : tags.map((tag) => (tag === fromName ? toName : tag));
  return serializeTags(next);
}

export function taskTags(task: Pick<Task, "tags">): string[] {
  return Array.isArray(task.tags) ? task.tags : parseTags(task.tags);
}

export function isFollowUpTaggedTask(task: Pick<Task, "tags" | "status">) {
  if (task.status?.name?.toLowerCase() === "done") return false;
  return taskTags(task).length > 0;
}
