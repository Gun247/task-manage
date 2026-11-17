/** Hide legacy org copy that should not appear as UI chrome. */
const HIDDEN_DESCRIPTIONS = new Set([
  "foreigner worker fund",
  "fwf",
]);

export function displayProjectDescription(
  description: string | null | undefined,
): string {
  const trimmed = description?.trim() ?? "";
  if (!trimmed) return "";
  if (HIDDEN_DESCRIPTIONS.has(trimmed.toLowerCase())) return "";
  return trimmed;
}
