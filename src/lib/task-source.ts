/** Known task origins (empty = created manually in the app). */
export const TASK_SOURCE_PLAN_UAT = "plan-uat";

export type TaskSource = typeof TASK_SOURCE_PLAN_UAT | "";

export function normalizeTaskSource(value: string | null | undefined): string {
  return (value ?? "").trim();
}

export function taskSourceLabel(source: string | null | undefined): string | null {
  const value = normalizeTaskSource(source);
  if (value === TASK_SOURCE_PLAN_UAT) return "Plan UAT";
  if (!value) return null;
  return value;
}
