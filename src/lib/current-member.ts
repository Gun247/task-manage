import { parseMemberRole, type MemberRole } from "@/lib/roles";

const STORAGE_KEY = "fwf-current-member-id";
const SESSION_KEY = "fwf-session";

export type MemberSession = {
  id: string;
  nickname: string;
  employeeId: string;
  role: MemberRole;
  color: string;
};

export function readCurrentMemberId() {
  if (typeof window === "undefined") return "";
  const session = readMemberSession();
  if (session?.id) return session.id;
  return window.localStorage.getItem(STORAGE_KEY) ?? "";
}

export function readMemberSession(): MemberSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) {
      const legacyId = window.localStorage.getItem(STORAGE_KEY);
      if (!legacyId) return null;
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<MemberSession>;
    if (!parsed.id || !parsed.nickname) return null;
    return {
      id: parsed.id,
      nickname: parsed.nickname,
      employeeId: parsed.employeeId ?? "",
      role: parseMemberRole(parsed.role),
      color: parsed.color ?? "#6BB82A",
    };
  } catch {
    return null;
  }
}

export function writeMemberSession(session: MemberSession | null) {
  if (typeof window === "undefined") return;
  if (!session) {
    window.localStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(STORAGE_KEY);
  } else {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    window.localStorage.setItem(STORAGE_KEY, session.id);
  }
  window.dispatchEvent(new Event("fwf-current-member-changed"));
}

/** @deprecated prefer writeMemberSession */
export function writeCurrentMemberId(id: string) {
  if (typeof window === "undefined") return;
  if (!id) {
    writeMemberSession(null);
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
