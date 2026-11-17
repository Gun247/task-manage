import {
  PRD_STATUS_NAME,
  UAT_STATUS_NAME,
} from "@/lib/default-statuses";

export type PostReleaseChangeType = "status" | "uatDate" | "prdDate";
export type PostReleaseMilestone = "UAT" | "PRD";

export const POST_RELEASE_REASON_REQUIRED =
  "กรุณาระบุเหตุผลของการปรับ flow หลังขึ้น UAT/PRD";

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
  // Only status history / current status count as "เคยขึ้น" — having a planned
  // uatDate/prdDate on Backlog must not require a post-release reason.
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

export function isPostReleaseFlowChange(input: {
  task: {
    statusHistory?: Array<{ toStatusName: string }>;
    status?: { name: string } | null;
    statusId: string;
    uatDate?: string | null;
    prdDate?: string | null;
  };
  nextStatusId?: string;
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

export function postReleaseChangeTypeLabel(changeType: string) {
  if (changeType === "status") return "สถานะ";
  if (changeType === "uatDate") return "วันที่ UAT";
  if (changeType === "prdDate") return "วันที่ PRD";
  return changeType;
}
