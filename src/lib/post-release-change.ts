import {
  DONE_STATUS_NAME,
  HOLD_STATUS_NAME,
  MODIFY_STATUS_NAME,
  PRD_STATUS_NAME,
  UAT_STATUS_NAME,
} from "@/lib/default-statuses";

export type PostReleaseChangeType = "status" | "uatDate" | "prdDate";
export type PostReleaseMilestone = "UAT" | "PRD";

export const POST_RELEASE_REASON_REQUIRED =
  "กรุณาระบุเหตุผลของการปรับ flow หลังขึ้น UAT/PRD";

export const POST_RELEASE_REWORK_GATE_MESSAGE =
  `หลังขึ้น ${UAT_STATUS_NAME}/${PRD_STATUS_NAME} แล้ว หากต้องการย้อนไปแก้ ให้เปลี่ยนเป็น ${MODIFY_STATUS_NAME} ก่อน (เหมือน Reopen ใน Jira)`;

export const HOLD_TRANSITION_GATE_MESSAGE =
  `เปลี่ยนเป็น ${HOLD_STATUS_NAME} ได้เฉพาะจาก Backlog, In Progress หรือ ${UAT_STATUS_NAME} เท่านั้น`;

const HOLD_ALLOWED_FROM = new Set([
  "backlog",
  "in progress",
  UAT_STATUS_NAME.toLowerCase(),
]);

export type PostReleaseChangeDraft = {
  changeType: PostReleaseChangeType;
  fromValue: string;
  toValue: string;
  afterMilestone: PostReleaseMilestone;
};

function dateKey(value: string | Date | null | undefined) {
  if (!value) return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return value.toISOString().slice(0, 10);
  }
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.slice(0, 10);
}

function normStatus(name: string | null | undefined) {
  return (name ?? "").trim().toLowerCase();
}

/** Statuses that mean the task is (or was) live / closed after release. */
export function isReleasedLaneStatus(name: string | null | undefined) {
  const value = normStatus(name);
  return (
    value === UAT_STATUS_NAME.toLowerCase() ||
    value === PRD_STATUS_NAME.toLowerCase() ||
    value === DONE_STATUS_NAME.toLowerCase()
  );
}

/** Allowed reopen targets after UAT/PRD (Jira-style gate). */
export function isReworkGateStatus(name: string | null | undefined) {
  const value = normStatus(name);
  return (
    value === MODIFY_STATUS_NAME.toLowerCase() ||
    value === HOLD_STATUS_NAME.toLowerCase()
  );
}

export function normalizePostReleaseReason(reason: string | null | undefined) {
  return (reason ?? "").trim();
}

export function resolvePostReleaseMilestone(input: {
  hasReachedUat: boolean;
  hasReachedPrd: boolean;
}): PostReleaseMilestone | null {
  if (input.hasReachedPrd) return "PRD";
  if (input.hasReachedUat) return "UAT";
  return null;
}

export function detectReachedMilestones(input: {
  statusHistoryNames: string[];
  currentStatusName?: string | null;
  /** Ignored — planned UAT/PRD dates do not mean the task has gone live. */
  uatDate?: string | Date | null;
  /** Ignored — planned UAT/PRD dates do not mean the task has gone live. */
  prdDate?: string | Date | null;
}) {
  const names = new Set(
    [
      ...input.statusHistoryNames,
      ...(input.currentStatusName ? [input.currentStatusName] : []),
    ].map((name) => name.trim().toLowerCase()),
  );
  const hasReachedUat = names.has(UAT_STATUS_NAME.toLowerCase());
  const hasReachedPrd = names.has(PRD_STATUS_NAME.toLowerCase());
  return { hasReachedUat, hasReachedPrd };
}

/** HOLD may only be entered from Backlog, In Progress, or UAT. */
export function assertHoldTransitionGate(input: {
  fromStatusName: string;
  toStatusName: string;
  statusChanged: boolean;
}) {
  if (!input.statusChanged) return;
  if (normStatus(input.toStatusName) !== HOLD_STATUS_NAME.toLowerCase()) {
    return;
  }
  if (HOLD_ALLOWED_FROM.has(normStatus(input.fromStatusName))) return;
  throw new Error(HOLD_TRANSITION_GATE_MESSAGE);
}

/**
 * After a task has been to UAT/PRD, leaving the released lane
 * (UAT / PRD / Done) must go through Modify — not straight back to
 * Backlog / In Progress. (HOLD is only allowed from UAT among released
 * statuses — enforced separately by assertHoldTransitionGate.)
 */
export function assertPostReleaseReworkGate(input: {
  hasReachedUat: boolean;
  hasReachedPrd: boolean;
  fromStatusName: string;
  toStatusName: string;
  statusChanged: boolean;
}) {
  if (!input.statusChanged) return;
  if (!input.hasReachedUat && !input.hasReachedPrd) return;
  if (!isReleasedLaneStatus(input.fromStatusName)) return;
  if (isReleasedLaneStatus(input.toStatusName)) return;
  // UAT → HOLD is allowed by the HOLD gate; PRD/Done → HOLD is blocked there.
  if (normStatus(input.toStatusName) === HOLD_STATUS_NAME.toLowerCase()) {
    return;
  }
  if (normStatus(input.toStatusName) === MODIFY_STATUS_NAME.toLowerCase()) {
    return;
  }
  throw new Error(POST_RELEASE_REWORK_GATE_MESSAGE);
}

export function assertStatusTransitionGates(input: {
  hasReachedUat: boolean;
  hasReachedPrd: boolean;
  fromStatusName: string;
  toStatusName: string;
  statusChanged: boolean;
}) {
  assertHoldTransitionGate(input);
  assertPostReleaseReworkGate(input);
}

export function buildPostReleaseChangeDrafts(input: {
  hasReachedUat: boolean;
  hasReachedPrd: boolean;
  statusChanged: boolean;
  fromStatusName: string;
  toStatusName: string;
  fromUatDate: string | Date | null | undefined;
  toUatDate: string | Date | null | undefined;
  uatDateProvided: boolean;
  fromPrdDate: string | Date | null | undefined;
  toPrdDate: string | Date | null | undefined;
  prdDateProvided: boolean;
}): PostReleaseChangeDraft[] {
  const milestone = resolvePostReleaseMilestone(input);
  if (!milestone) return [];

  const drafts: PostReleaseChangeDraft[] = [];

  if (input.statusChanged) {
    drafts.push({
      changeType: "status",
      fromValue: input.fromStatusName,
      toValue: input.toStatusName,
      afterMilestone: milestone,
    });
  }

  if (
    input.uatDateProvided &&
    dateKey(input.fromUatDate) !== dateKey(input.toUatDate)
  ) {
    drafts.push({
      changeType: "uatDate",
      fromValue: dateKey(input.fromUatDate),
      toValue: dateKey(input.toUatDate),
      afterMilestone: milestone,
    });
  }

  if (
    input.prdDateProvided &&
    dateKey(input.fromPrdDate) !== dateKey(input.toPrdDate)
  ) {
    drafts.push({
      changeType: "prdDate",
      fromValue: dateKey(input.fromPrdDate),
      toValue: dateKey(input.toPrdDate),
      afterMilestone: milestone,
    });
  }

  return drafts;
}

export function assertPostReleaseReason(
  drafts: PostReleaseChangeDraft[],
  reason: string | null | undefined,
) {
  if (drafts.length === 0) return "";
  const trimmed = normalizePostReleaseReason(reason);
  if (!trimmed) {
    throw new Error(POST_RELEASE_REASON_REQUIRED);
  }
  return trimmed;
}

export function taskHasReachedRelease(task: {
  statusHistory?: Array<{ toStatusName: string }>;
  status?: { name: string } | null;
}) {
  return detectReachedMilestones({
    statusHistoryNames: (task.statusHistory ?? []).map(
      (entry) => entry.toStatusName,
    ),
    currentStatusName: task.status?.name,
  });
}

export function taskHasPostReleaseRework(task: {
  statusHistory?: Array<{ toStatusName: string }>;
  postReleaseChanges?: Array<{ toValue?: string; changeType?: string }>;
  status?: { name: string } | null;
}) {
  if (isReworkGateStatus(task.status?.name)) return true;
  if (
    (task.statusHistory ?? []).some((entry) =>
      isReworkGateStatus(entry.toStatusName),
    )
  ) {
    return true;
  }
  return (task.postReleaseChanges ?? []).some(
    (entry) =>
      entry.changeType === "status" && isReworkGateStatus(entry.toValue),
  );
}

export function isPostReleaseFlowChange(input: {
  task: {
    statusHistory?: Array<{ toStatusName: string }>;
    status?: { name: string } | null;
    statusId: string;
    uatDate?: string | null;
    prdDate?: string | null;
  };
  nextStatusId?: string;
  nextStatusName?: string | null;
  nextUatDate?: string | null;
  nextPrdDate?: string | null;
  statusProvided?: boolean;
  uatDateProvided?: boolean;
  prdDateProvided?: boolean;
}) {
  const reached = taskHasReachedRelease(input.task);
  const milestone = resolvePostReleaseMilestone(reached);
  if (!milestone) return false;

  if (
    input.statusProvided &&
    input.nextStatusId !== undefined &&
    input.nextStatusId !== input.task.statusId
  ) {
    return true;
  }
  if (
    input.uatDateProvided &&
    dateKey(input.task.uatDate) !== dateKey(input.nextUatDate)
  ) {
    return true;
  }
  if (
    input.prdDateProvided &&
    dateKey(input.task.prdDate) !== dateKey(input.nextPrdDate)
  ) {
    return true;
  }
  return false;
}

/** Client-side preview of status transition gates (same rules as server). */
export function getPostReleaseReworkGateError(input: {
  task: {
    statusHistory?: Array<{ toStatusName: string }>;
    status?: { name: string } | null;
  };
  nextStatusName: string;
  statusChanged: boolean;
}) {
  const reached = taskHasReachedRelease(input.task);
  try {
    assertStatusTransitionGates({
      ...reached,
      fromStatusName: input.task.status?.name ?? "",
      toStatusName: input.nextStatusName,
      statusChanged: input.statusChanged,
    });
    return null;
  } catch (error) {
    return error instanceof Error
      ? error.message
      : POST_RELEASE_REWORK_GATE_MESSAGE;
  }
}

export function postReleaseChangeTypeLabel(changeType: string) {
  if (changeType === "status") return "สถานะ";
  if (changeType === "uatDate") return "วันที่ UAT";
  if (changeType === "prdDate") return "วันที่ PRD";
  return changeType;
}
