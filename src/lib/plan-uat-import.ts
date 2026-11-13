/** Import helpers for Google Sheet "Plan UAT and PRD". */

export const DEFAULT_PLAN_UAT_SPREADSHEET_ID =
  "1YlczaCfEFZCF-jhi98rb_z4Ax4HdE92CxoXFkJC3J7c";
export const DEFAULT_PLAN_UAT_SHEET_GID = "945152661";
export const DEFAULT_PLAN_UAT_SHEET_NAME = "Plan UAT and PRD";

const TH_MONTHS: Record<string, number> = {
  "ม.ค.": 1,
  "ก.พ.": 2,
  "มี.ค.": 3,
  "เม.ย.": 4,
  "พ.ค.": 5,
  "มิ.ย.": 6,
  "ก.ค.": 7,
  "ส.ค.": 8,
  "ก.ย.": 9,
  "ต.ค.": 10,
  "พ.ย.": 11,
  "ธ.ค.": 12,
};

const EN_MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

export interface PlanUatParsedTask {
  name: string;
  description: string;
  remarks: string;
  uatDate: string | null;
  prdDate: string | null;
  section: string;
  sheetRow: number;
  /** Nicknames from sheet column D (assignee). */
  assigneeNames: string[];
  uatStatus: string;
  prdStatus: string;
  testerStatus: string;
}

/** App status name derived from sheet UAT/PRD Status cells. */
export type PlanUatAppStatusName =
  | "Backlog"
  | "In Progress"
  | "UAT"
  | "PRD"
  | "Done";

export type PlanUatDateField = "uat" | "prd" | "either";

export function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/** Inclusive match on UAT date, PRD date, or either of them. */
export function taskMatchesPlanUatRange(
  task: Pick<PlanUatParsedTask, "uatDate" | "prdDate">,
  from: string | null,
  to: string | null,
  field: PlanUatDateField,
) {
  const dates =
    field === "uat"
      ? [task.uatDate]
      : field === "prd"
        ? [task.prdDate]
        : [task.uatDate, task.prdDate];

  return dates.some((date) => {
    if (!date) return false;
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  });
}

export function normalizeTaskName(value: string) {
  return value
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function parsePlanUatDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.replace(/\s+/g, " ").trim();
  if (!value) return null;

  const thai = value.match(
    /^(\d{1,2})\s+(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)\s+(\d{2,4})\b/,
  );
  if (thai) {
    const day = Number(thai[1]);
    const month = TH_MONTHS[thai[2]];
    let year = Number(thai[3]);
    if (year < 100) year += 2500;
    if (year >= 2400) year -= 543;
    return formatIsoDate(year, month, day);
  }

  const english = value.match(
    /^(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{2,4})\b/i,
  );
  if (english) {
    const day = Number(english[1]);
    const month = EN_MONTHS[english[2].toLowerCase()];
    let year = Number(english[3]);
    if (year < 100) year += 2000;
    return formatIsoDate(year, month, day);
  }

  return null;
}

function formatIsoDate(year: number, month: number, day: number) {
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function cell(row: string[], index: number) {
  return (row[index] ?? "").replace(/\r/g, "").trim();
}

function isUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function isHeaderRow(row: string[]) {
  return cell(row, 0).toLowerCase() === "no" && /task/i.test(cell(row, 1));
}

function isSectionRow(row: string[]) {
  const a = cell(row, 0);
  if (!a) return false;
  if (isHeaderRow(row)) return false;
  if (/^\d+$/.test(a)) return false;
  if (a.startsWith("*")) return false;
  if (/^ผลกระทบจาก\s*PRD/i.test(a)) return true;
  if (/^(PRD|UAT)\b/i.test(a)) return true;
  if (/\bPRD\b/i.test(a) && /\bUAT\b/i.test(a)) return true;
  if (/^Plan\s+UAT/i.test(a)) return true;
  if (/^รายการรอ\s*PRD/i.test(a)) return true;
  if (/^TASK\b/i.test(a)) return true;
  if (/^ประเมิน\b/i.test(a)) return true;
  return false;
}

function resolveTaskName(taskCol: string, subjectCol: string) {
  if (subjectCol && !isUrl(subjectCol)) return subjectCol;
  if (taskCol) return taskCol;
  if (subjectCol) return subjectCol;
  return "";
}

/** Split assignee cell like `Junior, Creem` / `P' JuAek` into nicknames. */
export function parseAssigneeNames(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const value = raw.replace(/\s+/g, " ").trim();
  if (!value) return [];
  if (/^https?:\/\//i.test(value)) return [];
  if (/^[*]+$/.test(value)) return [];

  return value
    .split(/[,/|&+;]+|\s+และ\s+/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((part) => !/^https?:\/\//i.test(part));
}

function normalizeStatusToken(raw: string | null | undefined) {
  if (!raw) return "";
  return raw
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\*+/, "")
    .replace(/\*+$/, "")
    .trim()
    .toUpperCase();
}

function isBlankSheetStatus(raw: string | null | undefined) {
  const value = (raw ?? "").replace(/\s+/g, " ").trim();
  return !value || /^[*]+$/.test(value);
}

function isPassStatus(raw: string | null | undefined) {
  const token = normalizeStatusToken(raw);
  if (!token) return false;
  if (/\bFAIL\b/.test(token)) return false;
  return /\bPASS\b/.test(token);
}

function isCancelStatus(raw: string | null | undefined) {
  return /\bCANCEL\b/.test(normalizeStatusToken(raw));
}

function isActivePhaseStatus(raw: string | null | undefined) {
  const token = normalizeStatusToken(raw);
  if (!token || isPassStatus(raw) || isCancelStatus(raw)) return false;
  if (isBlankSheetStatus(raw)) return false;
  return (
    /\b(WAIT|FAIL|MODIFIED|RECHECK|PAUSE|UAT|PRD|CF)\b/.test(token) ||
    /รอ/.test(raw ?? "") ||
    /\d/.test(token)
  );
}

/**
 * Map sheet UAT/PRD Status → app status.
 * Prefer PRD Status when present; otherwise fall back to UAT Status.
 */
export function mapPlanUatToAppStatus(
  uatStatus: string | null | undefined,
  prdStatus: string | null | undefined,
): PlanUatAppStatusName {
  if (isPassStatus(prdStatus)) return "Done";
  if (isCancelStatus(prdStatus)) return "Backlog";
  if (isActivePhaseStatus(prdStatus)) return "PRD";

  if (isPassStatus(uatStatus)) return "Done";
  if (isCancelStatus(uatStatus)) return "Backlog";
  if (isActivePhaseStatus(uatStatus)) return "UAT";

  return "Backlog";
}

/** Match sheet nickname aliases to a known team member nickname. */
export function matchAssigneeNickname(
  rawName: string,
  memberNicknames: string[],
): string | null {
  const needle = rawName.replace(/\s+/g, " ").trim().toLowerCase();
  if (!needle) return null;

  const normalizedMembers = memberNicknames.map((nickname) => ({
    nickname,
    key: nickname.replace(/\s+/g, " ").trim().toLowerCase(),
  }));

  const exact = normalizedMembers.find((member) => member.key === needle);
  if (exact) return exact.nickname;

  const aliases: Record<string, string[]> = {
    creem: ["cream", "creem"],
    breeze: ["breez", "breeze"],
    "p' juaek": ["p juaek", "p' juaek", "p'aek", "p aek", "juaek", "p' juu", "p juu"],
    mind: ["mild", "mind"],
    fame: ["frame", "fame"],
  };

  for (const member of normalizedMembers) {
    const aliasKeys = aliases[member.key] ?? [member.key];
    if (aliasKeys.includes(needle)) return member.nickname;
    if (needle.includes(member.key) || member.key.includes(needle)) {
      return member.nickname;
    }
  }

  return null;
}

function buildRemarks(parts: {
  section: string;
  uatStatus: string;
  testerStatus: string;
  prdStatus: string;
  subjectLink: string;
}) {
  const lines: string[] = [];
  if (parts.section) lines.push(`จากชีท: ${parts.section}`);
  if (parts.uatStatus) lines.push(`UAT Status: ${parts.uatStatus}`);
  if (parts.testerStatus) lines.push(`Tester Status: ${parts.testerStatus}`);
  if (parts.prdStatus) lines.push(`PRD Status: ${parts.prdStatus}`);
  if (parts.subjectLink) lines.push(`อ้างอิง: ${parts.subjectLink}`);
  return lines.join("\n");
}

/** Minimal CSV parser that supports quoted fields and newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
        continue;
      }
      if (ch === '"') {
        inQuotes = false;
        continue;
      }
      field += ch;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    if (ch === "\r") continue;
    field += ch;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function preferLaterDate(
  current: string | null,
  incoming: string | null,
): string | null {
  if (!incoming) return current;
  if (!current) return incoming;
  return incoming >= current ? incoming : current;
}

function preferStatus(
  current: string,
  incoming: string,
): string {
  if (isBlankSheetStatus(incoming)) return current;
  if (isBlankSheetStatus(current)) return incoming;
  // Later non-blank sheet row wins (reschedule / retest).
  return incoming;
}

function mergeAssigneeNames(current: string[], incoming: string[]) {
  const seen = new Set(current.map((name) => name.toLowerCase()));
  const merged = [...current];
  for (const name of incoming) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(name);
  }
  return merged;
}

/**
 * Same task often appears once under a UAT plan day and again under a PRD day.
 * Merge into one record: keep latest dates/status, union assignees.
 */
export function mergePlanUatTask(
  current: PlanUatParsedTask,
  incoming: PlanUatParsedTask,
): PlanUatParsedTask {
  const uatDate = preferLaterDate(current.uatDate, incoming.uatDate);
  const prdDate = preferLaterDate(current.prdDate, incoming.prdDate);
  const uatStatus = preferStatus(current.uatStatus, incoming.uatStatus);
  const prdStatus = preferStatus(current.prdStatus, incoming.prdStatus);
  const testerStatus = preferStatus(current.testerStatus, incoming.testerStatus);
  const assigneeNames = mergeAssigneeNames(
    current.assigneeNames,
    incoming.assigneeNames,
  );
  const section = incoming.section || current.section;
  const subjectLink =
    incoming.remarks.match(/^อ้างอิง: (.+)$/m)?.[1] ??
    current.remarks.match(/^อ้างอิง: (.+)$/m)?.[1] ??
    "";

  return {
    ...current,
    description: current.description || incoming.description,
    uatDate,
    prdDate,
    section,
    sheetRow: incoming.sheetRow,
    assigneeNames,
    uatStatus,
    prdStatus,
    testerStatus,
    remarks: buildRemarks({
      section,
      uatStatus,
      testerStatus,
      prdStatus,
      subjectLink,
    }),
  };
}

export function parsePlanUatSheet(rows: string[][]): PlanUatParsedTask[] {
  let section = "";
  let uatDate: string | null = null;
  let prdDate: string | null = null;
  const tasks: PlanUatParsedTask[] = [];
  const indexByName = new Map<string, number>();

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index] ?? [];
    if (row.every((value) => !String(value ?? "").trim())) continue;

    if (isHeaderRow(row)) continue;

    if (isSectionRow(row)) {
      section = cell(row, 0);
      uatDate = parsePlanUatDate(cell(row, 4)) ?? parsePlanUatDate(section);
      prdDate = parsePlanUatDate(cell(row, 6));

      // Titles like "UAT ... | PRD ..." may only put one date in E/G;
      // try extracting the other from the title when missing.
      if (!prdDate) {
        const prdInTitle = section.match(/PRD[^|]*?(\d{1,2}\s+[^\d|]+?\s+\d{2,4})/i);
        if (prdInTitle) prdDate = parsePlanUatDate(prdInTitle[1]);
      }
      if (!uatDate) {
        const uatInTitle = section.match(/UAT[^|]*?(\d{1,2}\s+[^\d|]+?\s+\d{2,4})/i);
        if (uatInTitle) uatDate = parsePlanUatDate(uatInTitle[1]);
      }
      continue;
    }

    const no = cell(row, 0);
    if (!/^\d+$/.test(no)) continue;

    const taskCol = cell(row, 1);
    const subjectCol = cell(row, 2);
    const name = resolveTaskName(taskCol, subjectCol);
    if (!name) continue;

    const key = normalizeTaskName(name);
    const description =
      taskCol && name === subjectCol && taskCol !== subjectCol
        ? `หมวด: ${taskCol}`
        : "";

    const uatStatus = cell(row, 4);
    const testerStatus = cell(row, 5);
    const prdStatus = cell(row, 6);
    const assigneeNames = parseAssigneeNames(cell(row, 3));

    const next: PlanUatParsedTask = {
      name,
      description,
      remarks: buildRemarks({
        section,
        uatStatus,
        testerStatus,
        prdStatus,
        subjectLink: isUrl(subjectCol) ? subjectCol : "",
      }),
      uatDate,
      prdDate,
      section,
      sheetRow: index + 1,
      assigneeNames,
      uatStatus,
      prdStatus,
      testerStatus,
    };

    const existingIndex = indexByName.get(key);
    if (existingIndex !== undefined) {
      tasks[existingIndex] = mergePlanUatTask(tasks[existingIndex]!, next);
      continue;
    }

    indexByName.set(key, tasks.length);
    tasks.push(next);
  }

  return tasks;
}

export function getPlanUatExportUrl(
  spreadsheetId = process.env.PLAN_UAT_SPREADSHEET_ID ??
    DEFAULT_PLAN_UAT_SPREADSHEET_ID,
  gid = process.env.PLAN_UAT_SHEET_GID ?? DEFAULT_PLAN_UAT_SHEET_GID,
) {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
}

export async function fetchPlanUatCsv(url = getPlanUatExportUrl()) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "fwf-task-manager/plan-uat-import",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `ดึงชีท Plan UAT ไม่สำเร็จ (HTTP ${response.status}). ตรวจว่าชีทแชร์ให้เปิดดูได้`,
    );
  }

  const text = await response.text();
  if (
    text.includes("<!DOCTYPE html") ||
    (text.includes("Sign in") && text.includes("accounts.google.com"))
  ) {
    throw new Error(
      "ชีท Plan UAT ต้องแชร์แบบ Anyone with the link (Viewer) เพื่อให้ดึง CSV ได้",
    );
  }

  return text;
}
