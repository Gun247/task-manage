const STORAGE_KEY = "fwf-current-member-id";

export function readCurrentMemberId() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(STORAGE_KEY) ?? "";
}

export function writeCurrentMemberId(id: string) {
  if (typeof window === "undefined") return;
  if (!id) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, id);
  window.dispatchEvent(new Event("fwf-current-member-changed"));
}

export function parseWipLimits(raw: string | null | undefined): Record<string, number> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result: Record<string, number> = {};
    for (const [key, value] of Object.entries(parsed)) {
      const n = Number(value);
      if (Number.isFinite(n) && n > 0) result[key] = Math.floor(n);
    }
    return result;
  } catch {
    return {};
  }
}

export function serializeWipLimits(limits: Record<string, number>) {
  const cleaned: Record<string, number> = {};
  for (const [key, value] of Object.entries(limits)) {
    if (Number.isFinite(value) && value > 0) cleaned[key] = Math.floor(value);
  }
  return JSON.stringify(cleaned);
}
